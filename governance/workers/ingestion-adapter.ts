import { randomUUID } from 'crypto';
import { prismaGovernance, withIngestRole } from '../lib/ingestion/db';
import { projectEvidence, ProjectionError } from '../lib/ingestion/projection';

const OVERLAP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 100;
const MAX_RETRIES = 5;

/**
 * F-03 CORRECTION — Centralised retry-eligibility guard.
 *
 * Returns true  when an event receipt is eligible for processing now.
 * Returns false when the receipt is in a future-retry hold and the current
 * polling pass MUST NOT project, consume a retry attempt, or advance the
 * cursor past this event (head-of-line blocking).
 *
 * Eligibility rules (per WP-GOV-01B F-03 specification):
 *   1. status === 'pending' && nextRetryAt > now  → NOT eligible (backoff hold)
 *   2. status === 'pending' && nextRetryAt <= now  → eligible (retry due)
 *   3. status === 'pending' && nextRetryAt IS NULL → eligible (normal first pass)
 *   4. terminal states ('processed', 'failed')    → eligible (cursor may advance)
 *
 * This function must be the SOLE authority on retry eligibility.
 * Do NOT re-implement this check inline elsewhere.
 */
export function isRetryEligible(
  receipt: { status: string; nextRetryAt: Date | null },
  now: Date = new Date()
): boolean {
  if (receipt.status === 'pending' && receipt.nextRetryAt !== null && receipt.nextRetryAt > now) {
    return false; // future-retry hold — do not process
  }
  return true; // eligible: due retry, null schedule, or terminal state
}

/**
 * Ensures the ingestion cursor exists and retrieves it.
 */
async function getCursor(cursorId = 'default'): Promise<any> {
  return withIngestRole(async (tx) => {
    let cursor = await tx.ingestionCursor.findUnique({
      where: { id: cursorId }
    });

    if (!cursor) {
      cursor = await tx.ingestionCursor.create({
        data: {
          id: cursorId,
          lastProcessedAt: new Date(0), // Start of epoch
          updatedAt: new Date()
        }
      });
    }

    return cursor;
  });
}

/**
 * Updates the ingestion cursor safely.
 */
async function updateCursor(cursorId: string, processedAt: Date, eventId: string): Promise<void> {
  await withIngestRole(async (tx) => {
    await tx.ingestionCursor.update({
      where: { id: cursorId },
      data: {
        lastProcessedAt: processedAt,
        lastEventId: eventId,
        updatedAt: new Date()
      }
    });
  });
}

/**
 * Fetches events from public.outbox using the approved security definer boundary.
 */
async function fetchOutboxEvents(lastProcessedAt: Date): Promise<any[]> {
  const windowStart = new Date(lastProcessedAt.getTime() - OVERLAP_INTERVAL_MS).toISOString();

  // We read the outbox strictly via the approved boundary function while assuming the ingest role.
  return withIngestRole(async (tx) => {
    const events: any[] = await tx.$queryRaw`
      SELECT id, event_type, payload, created_at
      FROM public.governance_outbox_reader(${windowStart}::timestamptz, ${BATCH_SIZE}::integer)
    `;
    return events;
  });
}

/**
 * Fetches events for reconciliation, skipping already processed ones.
 */
async function fetchReconciliationEvents(windowStart: Date, windowEnd: Date): Promise<any[]> {
  // To avoid fetching all events, we first pull the raw window, 
  // then filter out those that are fully processed.
  // Note: For large scale, this should ideally be an anti-join inside the DB, 
  // but outbox and receipt are in different schemas/contexts.
  return withIngestRole(async (tx) => {
    // 1. Fetch raw events using the approved reader boundary
    const events: any[] = await tx.$queryRaw`
      SELECT id, event_type, payload, created_at
      FROM public.governance_outbox_reader(${windowStart.toISOString()}::timestamptz, 1000) 
      WHERE created_at <= ${windowEnd.toISOString()}::timestamptz
      ORDER BY created_at ASC, id ASC
    `;

    if (events.length === 0) return [];

    // 2. Fetch receipts to filter
    const eventIds = events.map(e => e.id);
    const receipts = await tx.eventReceipt.findMany({
      where: { eventId: { in: eventIds } },
      select: { eventId: true, status: true, nextRetryAt: true }
    });

    const receiptMap = new Map(receipts.map(r => [r.eventId, r]));

    // 3. Keep events that are pending (and ready to retry) or have no receipt.
    // F-03: Delegate eligibility to the canonical isRetryEligible guard.
    const now = new Date();
    return events.filter(e => {
      const receipt = receiptMap.get(e.id);
      if (!receipt) return true; // No receipt — needs first processing
      if (receipt.status === 'processed' || receipt.status === 'failed') return false; // terminal
      return isRetryEligible(receipt, now); // pending: check backoff hold
    });
  });
}

/**
 * Process a single event safely.
 * Returns true if successfully processed or permanently quarantined.
 * Returns false if it encountered a retryable error (meaning cursor should NOT advance past this).
 */
async function processEvent(event: any): Promise<boolean> {
  // 1. Safe Receipt Initialization
  // We use ON CONFLICT DO NOTHING to avoid P2002 aborting the Postgres transaction.
  // If the receipt already exists, it is untouched.
  const newReceiptId = randomUUID();
  await withIngestRole(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO governance."EventReceipt" (id, "eventId", "eventType", "receivedAt", status, "retryCount")
      VALUES (${newReceiptId}::uuid, ${event.id}::uuid, ${event.event_type}, NOW(), 'pending', 0)
      ON CONFLICT ("eventId") DO NOTHING
    `;
  });

  // 2. Load the receipt state
  const receipt = await withIngestRole(async (tx) => {
    return tx.eventReceipt.findUnique({ where: { eventId: event.id } });
  });

  if (!receipt) {
    throw new Error(`Receipt initialization failed for event ${event.id}`);
  }

  // Terminal state check (duplicates)
  if (receipt.status === 'processed' || receipt.status === 'failed') {
    return true; // Already handled
  }

  // F-03: Centralised retry-eligibility check.
  // If not eligible, return false immediately — do NOT project, do NOT consume
  // a retry attempt, do NOT advance the cursor past this event.
  if (!isRetryEligible(receipt)) {
    return false;
  }

  // 3. Evidence Projection Phase (Atomic)
  try {
    await withIngestRole(async (tx) => {
      const evidence = await projectEvidence(event.event_type, event.payload, tx);

      // UPSERT the projection
      await tx.evidenceProjection.upsert({
        where: { id: event.id },
        create: {
          id: event.id,
          entityType: evidence.entityType,
          state: evidence.state,
          version: 1,
          lastEventId: event.id,
          updatedAt: new Date()
        },
        update: {
          state: evidence.state,
          version: { increment: 1 },
          lastEventId: event.id,
          updatedAt: new Date()
        }
      });

      // Mark receipt as processed
      await tx.eventReceipt.update({
        where: { id: receipt.id },
        data: { status: 'processed', error: null, nextRetryAt: null }
      });
    });

    return true; // Success

  } catch (err: any) {
    const isRetryable = err instanceof ProjectionError ? err.isRetryable : true;
    const newRetryCount = receipt.retryCount + 1;
    
    let nextStatus = 'pending';
    let nextRetryAt: Date | null = null;
    let errorMsg = err.message;

    if (!isRetryable || newRetryCount >= MAX_RETRIES) {
      nextStatus = 'failed'; // Quarantine / Dead-letter
    } else {
      nextRetryAt = new Date(Date.now() + Math.pow(2, newRetryCount) * 1000); // Exponential backoff
    }

    // Save failure state
    await withIngestRole(async (tx) => {
      await tx.eventReceipt.update({
        where: { id: receipt.id },
        data: {
          status: nextStatus,
          retryCount: newRetryCount,
          error: errorMsg,
          nextRetryAt: nextRetryAt
        }
      });
    });

    // If it's quarantined (failed), it doesn't block the cursor because it's permanently handled.
    // If it's pending (retryable), it blocks the cursor.
    return nextStatus === 'failed';
  }
}

/**
 * Reconciliation scan capable of detecting events missed by normal polling.
 */
export async function runReconciliationScan(): Promise<void> {
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(Date.now() - OVERLAP_INTERVAL_MS);

  try {
    const eventsToProcess = await fetchReconciliationEvents(windowStart, windowEnd);
    for (const event of eventsToProcess) {
      await processEvent(event);
    }
  } catch (err: any) {
    console.error('[Ingestion Adapter] Reconciliation failed:', err);
  }
}

let isRunning = false;

/**
 * Main Continuous Worker Loop
 */
export async function startIngestionAdapter() {
  if (isRunning) return;
  isRunning = true;
  
  console.info('[Ingestion Adapter] Starting continuous execution...');

  const shutdown = () => {
    console.info('[Ingestion Adapter] Initiating graceful shutdown...');
    isRunning = false;
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const cursorId = 'default';
  let lastReconciliation = 0;

  while (isRunning) {
    try {
      const cursor = await getCursor(cursorId);
      const events = await fetchOutboxEvents(cursor.lastProcessedAt);

      if (events.length > 0) {
        let maxSafeDate = cursor.lastProcessedAt;
        let lastSafeEventId = cursor.lastEventId;

        for (const event of events) {
          const isResolved = await processEvent(event);
          
          if (isResolved) {
            // We can safely advance the cursor up to this event
            maxSafeDate = new Date(event.created_at);
            lastSafeEventId = event.id;
          } else {
            // Event is pending retry. We MUST NOT advance the cursor past it, 
            // or the main poller will lose it. Break the cursor advancement here.
            break;
          }
        }
        
        if (maxSafeDate > cursor.lastProcessedAt) {
          await updateCursor(cursorId, maxSafeDate, lastSafeEventId!);
        }
      }

      // Run reconciliation every hour
      if (Date.now() - lastReconciliation > 60 * 60 * 1000) {
        await runReconciliationScan();
        lastReconciliation = Date.now();
      }

    } catch (err: any) {
      console.error('[Ingestion Adapter] Fatal polling error:', err);
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.info('[Ingestion Adapter] Shutdown complete.');
}
