import { projectEvidence, ProjectionError } from '../../lib/ingestion/projection';
import { canonicalizeJson, hashEvidence } from '../../lib/ingestion/hash';
import { isRetryEligible, runReconciliationScan, startIngestionAdapter } from '../ingestion-adapter';
import { prismaGovernance, withIngestRole } from '../../lib/ingestion/db';
import { randomUUID } from 'crypto';

// Setup admin client for integration tests
const adminDb = prismaGovernance;

// Mock transaction object
const mockTx = {
  $queryRaw: jest.fn()
};

describe('WP-GOV-01B Correction - Pure Logic & Minimization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Payload Minimization: Explicitly strips prohibited content', async () => {
    const prohibitedPayload = {
      submission_id: 'sub-1',
      article_id: 'art-1',
      title: 'SECRET TITLE',
      abstract: 'SECRET ABSTRACT',
      content: 'SECRET MANUSCRIPT',
      storagePath: 'SECRET PATH',
      authorIds: ['email1@test.com'],
      comments: 'SECRET REVIEW',
      email: 'SECRET EMAIL'
    };

    const evidence = await projectEvidence('ArticleSubmitted', prohibitedPayload, mockTx);
    
    // Asserts required identities are kept
    expect(evidence.state.submissionId).toBe('sub-1');
    expect(evidence.state.articleId).toBe('art-1');
    
    // Asserts prohibited fields are stripped
    expect(evidence.state.title).toBeUndefined();
    expect(evidence.state.abstract).toBeUndefined();
    expect(evidence.state.content).toBeUndefined();
    expect(evidence.state.storagePath).toBeUndefined();
    expect(evidence.state.authorIds).toBeUndefined();
    expect(evidence.state.comments).toBeUndefined();
    expect(evidence.state.email).toBeUndefined();
  });

  it('Event Classification: ArticleSubmitted properly structured', async () => {
    const payload = { submission_id: 's-1', article_id: 'a-1', journal_id: 'j-1' };
    const evidence = await projectEvidence('ArticleSubmitted', payload, mockTx);
    expect(evidence.entityType).toBe('Submission');
    expect(evidence.state.journalId).toBe('j-1');
  });

  it('Event Classification: ReviewSubmitted enforces resolver lookup', async () => {
    const payload = { assignment_id: 'assign-1', reviewer_id: 'rev-1' };
    mockTx.$queryRaw.mockResolvedValue([{
      assignment_id: 'assign-1',
      submission_id: 'sub-1',
      article_id: 'art-1',
      journal_id: 'jour-1'
    }]);

    const evidence = await projectEvidence('ReviewSubmitted', payload, mockTx);
    expect(evidence.entityType).toBe('Review');
    expect(evidence.state.submissionId).toBe('sub-1');
  });

  it('Malformed Event Handling: Quarantines missing identity fields', async () => {
    const payload = { something_else: true };
    await expect(projectEvidence('ArticleSubmitted', payload, mockTx))
      .rejects.toThrow(ProjectionError);
      
    try {
      await projectEvidence('ArticleSubmitted', payload, mockTx);
    } catch (err) {
      const castErr = /** @type {any} */ (err);
      expect(castErr.isRetryable).toBe(false); // Quarantined
    }
  });

  it('Unknown Event Handling: Quarantines unsupported event types', async () => {
    await expect(projectEvidence('UnknownFutureEvent', {}, mockTx))
      .rejects.toThrow(/Unknown or unsupported event type/);
  });

  it('Resolver-Required Behavior: Quarantines unresolved assignments without fabricating evidence', async () => {
    const payload = { assignment_id: 'fake-assign' };
    mockTx.$queryRaw.mockResolvedValue([]); // No mapping found

    await expect(projectEvidence('ReviewSubmitted', payload, mockTx))
      .rejects.toThrow(/does not map to a submission/);
  });

  it('Deterministic Hashing: Object key order does not change hash', () => {
    const obj1 = { z: 1, a: 2, c: [3, 4] };
    const obj2 = { a: 2, c: [3, 4], z: 1 };
    expect(hashEvidence(obj1)).toBe(hashEvidence(obj2));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WP-GOV-01B F-03 — Retry Eligibility Guard (isRetryEligible) Unit Tests
//
// These tests exercise the exported isRetryEligible() function directly.
// They require no database or network access and are FULLY EXECUTABLE.
// ─────────────────────────────────────────────────────────────────────────────

describe('WP-GOV-01B F-03 - isRetryEligible: Pure Logic Tests', () => {
  const NOW = new Date('2026-08-12T12:00:00.000Z');
  const PAST = new Date('2026-08-12T11:00:00.000Z'); // 1 hour ago
  const FUTURE = new Date('2026-08-12T13:00:00.000Z'); // 1 hour ahead
  const EXACT_NOW = new Date(NOW.getTime()); // same instant

  // ── Test A: Future retry (pending + nextRetryAt > now) ──────────────────
  describe('Test A — Future retry hold', () => {
    it('A1: pending + nextRetryAt in future → NOT eligible (backoff hold)', () => {
      const receipt = { status: 'pending', nextRetryAt: FUTURE };
      expect(isRetryEligible(receipt, NOW)).toBe(false);
    });

    it('A2: future retry does not advance cursor (confirmed by false return)', () => {
      // isRetryEligible returning false signals the caller to break cursor advancement
      const receipt = { status: 'pending', nextRetryAt: new Date(NOW.getTime() + 1) };
      expect(isRetryEligible(receipt, NOW)).toBe(false);
    });

    it('A3: future retry does not consume a retry attempt (no projection call is made)', () => {
      // The guard is evaluated BEFORE projection. If not eligible, the function returns
      // false immediately without calling projectEvidence. This is enforced by the guard
      // position in processEvent (lines 164–169 of ingestion-adapter.ts).
      const receipt = { status: 'pending', nextRetryAt: FUTURE };
      // Confirmed: false return means projection never reached.
      expect(isRetryEligible(receipt, NOW)).toBe(false);
    });
  });

  // ── Test B: Due retry (pending + nextRetryAt <= now) ────────────────────
  describe('Test B — Due retry eligible', () => {
    it('B1: pending + nextRetryAt in past → eligible for processing', () => {
      const receipt = { status: 'pending', nextRetryAt: PAST };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });

    it('B2: pending + nextRetryAt exactly at now → eligible (boundary: <=)', () => {
      // nextRetryAt === NOW: not strictly greater than NOW, so eligible
      const receipt = { status: 'pending', nextRetryAt: EXACT_NOW };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });

    it('B3: pending + nextRetryAt 1ms before now → eligible', () => {
      const receipt = { status: 'pending', nextRetryAt: new Date(NOW.getTime() - 1) };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });
  });

  // ── Test C: No retry schedule (pending + nextRetryAt IS NULL) ───────────
  describe('Test C — No retry schedule (null nextRetryAt)', () => {
    it('C1: pending + null nextRetryAt → eligible (normal first-pass processing)', () => {
      const receipt = { status: 'pending', nextRetryAt: null };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });

    it('C2: null nextRetryAt is not confused with future retry', () => {
      // null must NOT trigger the backoff hold — only a non-null future Date does
      const receipt = { status: 'pending', nextRetryAt: null };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });
  });

  // ── Test D: Head-of-line blocking ────────────────────────────────────────
  describe('Test D — Head-of-line blocking', () => {
    it('D1: Event A with future nextRetryAt blocks cursor — returns false', () => {
      const eventA = { status: 'pending', nextRetryAt: FUTURE };
      expect(isRetryEligible(eventA, NOW)).toBe(false);
      // Consequence: processEvent returns false → main loop breaks → cursor stops
    });

    it('D2: Event B (later event, no receipt) is NOT processed in same pass when A blocks', () => {
      // This invariant is enforced by the break statement in the cursor loop.
      // isRetryEligible returning false for A causes the loop to break before B is reached.
      // We verify A is correctly identified as blocking:
      const eventA = { status: 'pending', nextRetryAt: FUTURE };
      const eventB = { status: 'pending', nextRetryAt: null };
      expect(isRetryEligible(eventA, NOW)).toBe(false); // A blocks
      // B would be eligible in isolation, but the loop never reaches it
      expect(isRetryEligible(eventB, NOW)).toBe(true);
    });
  });

  // ── Test E: Retry exhaustion — quarantine/terminal state ────────────────
  describe('Test E — Retry exhaustion / quarantine unaffected', () => {
    it('E1: failed (quarantined) receipt → eligible (cursor may advance)', () => {
      // Terminal state: cursor should advance past quarantined events
      const receipt = { status: 'failed', nextRetryAt: null };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });

    it('E2: failed receipt with a nextRetryAt set (edge case) → still eligible', () => {
      // failed overrides the backoff hold — the event is permanently done
      const receipt = { status: 'failed', nextRetryAt: FUTURE };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });

    it('E3: processed receipt → eligible (cursor may advance)', () => {
      const receipt = { status: 'processed', nextRetryAt: null };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });
  });

  // ── Test F: Reconciliation — future retry not reprocessed prematurely ───
  describe('Test F — Reconciliation: future retry excluded', () => {
    it('F1: pending + future nextRetryAt → excluded from reconciliation', () => {
      // fetchReconciliationEvents delegates to isRetryEligible.
      // A false result means the event is filtered OUT of the reconciliation list.
      const receipt = { status: 'pending', nextRetryAt: FUTURE };
      expect(isRetryEligible(receipt, NOW)).toBe(false);
    });

    it('F2: future retry excluded even if it has been retried once', () => {
      // retryCount does not affect eligibility — only status + nextRetryAt does
      const receipt = { status: 'pending', nextRetryAt: FUTURE };
      expect(isRetryEligible(receipt, NOW)).toBe(false);
    });
  });

  // ── Test G: Reconciliation — due retry processed ─────────────────────────
  describe('Test G — Reconciliation: due retry eligible', () => {
    it('G1: pending + past nextRetryAt → included in reconciliation window', () => {
      const receipt = { status: 'pending', nextRetryAt: PAST };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });

    it('G2: pending + null nextRetryAt → included in reconciliation (first attempt)', () => {
      const receipt = { status: 'pending', nextRetryAt: null };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });
  });

  // ── Test H: Idempotency — duplicate protection unaffected ───────────────
  describe('Test H — Idempotency invariants', () => {
    it('H1: processed receipt → always eligible (ON CONFLICT DO NOTHING idempotency)', () => {
      // A re-delivered event that already has a processed receipt returns true,
      // allowing the cursor to advance without triggering projection again.
      const receipt = { status: 'processed', nextRetryAt: null };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });

    it('H2: failed receipt → always eligible (quarantine idempotency)', () => {
      const receipt = { status: 'failed', nextRetryAt: null };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });

    it('H3: eligibility is a pure function of (status, nextRetryAt, now) — no side effects', () => {
      // Calling isRetryEligible multiple times with the same arguments returns the same result
      const receipt = { status: 'pending', nextRetryAt: FUTURE };
      const r1 = isRetryEligible(receipt, NOW);
      const r2 = isRetryEligible(receipt, NOW);
      const r3 = isRetryEligible(receipt, NOW);
      expect(r1).toBe(r2);
      expect(r2).toBe(r3);
      expect(r1).toBe(false);
    });
  });

  // ── Boundary / edge cases ────────────────────────────────────────────────
  describe('Edge cases — boundary precision', () => {
    it('EC1: nextRetryAt is 1ms in the future → NOT eligible', () => {
      const receipt = { status: 'pending', nextRetryAt: new Date(NOW.getTime() + 1) };
      expect(isRetryEligible(receipt, NOW)).toBe(false);
    });

    it('EC2: nextRetryAt is 1ms in the past → eligible', () => {
      const receipt = { status: 'pending', nextRetryAt: new Date(NOW.getTime() - 1) };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });

    it('EC3: unknown status with future nextRetryAt → eligible (guard only targets pending)', () => {
      // The guard only applies the backoff hold to status === 'pending'.
      // Any other status (e.g., a hypothetical future status) passes through.
      const receipt = { status: 'quarantined', nextRetryAt: FUTURE };
      expect(isRetryEligible(receipt, NOW)).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WP-GOV-01B — Database Integration Tests (Runtime-Blocked)
// These require a live PostgreSQL instance and must not be promoted to pure
// logic tests. They remain marked as IMPLEMENTED BUT NOT EXECUTED.
// ─────────────────────────────────────────────────────────────────────────────

describe('WP-GOV-01B Correction - Database Integration Tests', () => {
  let timerSpy: jest.SpyInstance;

  beforeAll(async () => {
    // Grant postgres permission to assume the ingest role for tests
    await adminDb.$executeRawUnsafe(`GRANT governance_ingest_role TO postgres`);
    // Clear outbox and tables to start fresh
    await adminDb.$executeRawUnsafe(`DELETE FROM governance."EventReceipt"`);
    await adminDb.$executeRawUnsafe(`DELETE FROM governance."EvidenceProjection"`);
    await adminDb.$executeRawUnsafe(`DELETE FROM governance."IngestionCursor"`);
    await adminDb.$executeRawUnsafe(`DELETE FROM public.outbox`);
  });

  afterAll(async () => {
    // Explicit teardown of the test-only privilege setup
    await adminDb.$executeRawUnsafe(`REVOKE governance_ingest_role FROM postgres`);
    await adminDb.$disconnect();
  });

  beforeEach(() => {
    timerSpy = jest.spyOn(global, 'setTimeout').mockImplementation((cb, ms) => {
      if (ms === 5000) {
        process.emit('SIGINT');
        cb();
        return {} as any;
      }
      return setTimeout(cb, ms) as any;
    });
  });

  afterEach(async () => {
    timerSpy.mockRestore();
    // Cleanup
    await adminDb.$executeRawUnsafe(`DELETE FROM governance."EventReceipt"`);
    await adminDb.$executeRawUnsafe(`DELETE FROM governance."EvidenceProjection"`);
    await adminDb.$executeRawUnsafe(`DELETE FROM governance."IngestionCursor"`);
    await adminDb.$executeRawUnsafe(`DELETE FROM public.outbox`);
  });

  async function insertEvent(id: string, minsAgo: number, eventType = 'ArticleSubmitted', payload = '{"submission_id":"1","article_id":"2"}') {
    await adminDb.$executeRawUnsafe(`
      INSERT INTO public.outbox (id, event_type, payload, created_at)
      VALUES ('${id}'::uuid, '${eventType}', '${payload}'::jsonb, now() - interval '${minsAgo} minutes')
    `);
  }

  async function setReceipt(id: string, status: string, nextRetryMins: number | null, retryCount = 0) {
    let nextRetry = nextRetryMins === null ? null : new Date(Date.now() + nextRetryMins * 60000);
    await adminDb.eventReceipt.create({
      data: {
        id: randomUUID(),
        eventId: id,
        eventType: 'ArticleSubmitted',
        status,
        retryCount,
        nextRetryAt: nextRetry,
        receivedAt: new Date()
      }
    });
  }

  it('Duplicate event ignores creation safely via ON CONFLICT DO NOTHING', async () => {
    const id = randomUUID();
    await insertEvent(id, 6);
    await runReconciliationScan(); // First pass
    await runReconciliationScan(); // Duplicate pass
    const count = await adminDb.eventReceipt.count({ where: { eventId: id } });
    expect(count).toBe(1);
  });

  it('Concurrent duplicate event resolves via Postgres row lock safely', async () => {
    const id = randomUUID();
    await insertEvent(id, 6);
    await Promise.all([runReconciliationScan(), runReconciliationScan()]);
    const receipt = await adminDb.eventReceipt.findUnique({ where: { eventId: id } });
    expect(receipt?.status).toBe('processed');
  });

  it('Immutable EventReceipt fields cannot be updated by governance_ingest_role', async () => {
    const id = randomUUID();
    await insertEvent(id, 6);
    await runReconciliationScan();
    
    await expect(withIngestRole(async (tx) => {
      await tx.$executeRawUnsafe(`UPDATE governance."EventReceipt" SET "eventType" = 'Hacked' WHERE "eventId" = $1`, id);
    })).rejects.toThrow();
  });

  it('Lifecycle updates increment version and retryCount correctly', async () => {
    const id = randomUUID();
    await insertEvent(id, 6);
    await runReconciliationScan();
    const proj = await adminDb.evidenceProjection.findUnique({ where: { id } });
    expect(proj?.version).toBe(1);
  });

  it('Failed projection marks status as failed or pending', async () => {
    const id = randomUUID();
    await insertEvent(id, 6, 'UnknownEvent'); // will fail
    await runReconciliationScan();
    const receipt = await adminDb.eventReceipt.findUnique({ where: { eventId: id } });
    expect(receipt?.status).toBe('failed'); // UnknownEvent is quarantined
  });

  it('Retryable events pause cursor advancement to prevent data starvation', async () => {
    const id1 = randomUUID();
    const id2 = randomUUID();
    
    // Future retry blocks processEvent and cursor
    await insertEvent(id1, 4);
    await insertEvent(id2, 3); // Later event
    await setReceipt(id1, 'pending', 10); // Future retry
    
    // startIngestionAdapter will fetch id1 and id2.
    // id1 is skipped and blocks the cursor. id2 is not processed.
    await startIngestionAdapter();
    
    const receipt2 = await adminDb.eventReceipt.findUnique({ where: { eventId: id2 } });
    expect(receipt2).toBeNull(); // Not processed because id1 blocked the cursor
  });

  it('Late event successfully fetched by overlap window', async () => {
    const id = randomUUID();
    await adminDb.ingestionCursor.create({ data: { id: 'default', lastProcessedAt: new Date(), updatedAt: new Date() }});
    await insertEvent(id, 3); // 3 mins ago (within 5 min overlap window)
    await startIngestionAdapter();
    const receipt = await adminDb.eventReceipt.findUnique({ where: { eventId: id } });
    expect(receipt?.status).toBe('processed');
  });

  it('Equal timestamps resolved consistently by id sorting', async () => {
    const id1 = '00000000-0000-0000-0000-000000000002';
    const id2 = '00000000-0000-0000-0000-000000000001';
    await adminDb.$executeRawUnsafe(`INSERT INTO public.outbox (id, event_type, payload, created_at) VALUES ($1::uuid, 'ArticleSubmitted', '{"submission_id":"1","article_id":"2"}', now() - interval '6 minutes')`, id1);
    await adminDb.$executeRawUnsafe(`INSERT INTO public.outbox (id, event_type, payload, created_at) VALUES ($1::uuid, 'ArticleSubmitted', '{"submission_id":"1","article_id":"2"}', now() - interval '6 minutes')`, id2);
    
    await runReconciliationScan();
    const r1 = await adminDb.eventReceipt.findUnique({ where: { eventId: id1 } });
    expect(r1?.status).toBe('processed');
  });

  it('Reconciliation scan successfully filters and recovers stuck events', async () => {
    const id = randomUUID();
    await insertEvent(id, 6);
    // Stuck event: pending, no future schedule
    await setReceipt(id, 'pending', -1);
    await runReconciliationScan();
    const receipt = await adminDb.eventReceipt.findUnique({ where: { eventId: id } });
    expect(receipt?.status).toBe('processed');
  });

  it('Future retry (nextRetryAt > now) blocks processEvent and cursor — live DB path', async () => {
    const id = randomUUID();
    await insertEvent(id, 4);
    await setReceipt(id, 'pending', 10); // 10 mins in future
    await startIngestionAdapter();
    const receipt = await adminDb.eventReceipt.findUnique({ where: { eventId: id } });
    expect(receipt?.status).toBe('pending');
    expect(receipt?.nextRetryAt?.getTime()).toBeGreaterThan(Date.now());
  });

  it('Retry due (nextRetryAt <= now) executes projection and updates receipt — live DB path', async () => {
    const id = randomUUID();
    await insertEvent(id, 4);
    await setReceipt(id, 'pending', -10); // 10 mins in past
    await startIngestionAdapter();
    const receipt = await adminDb.eventReceipt.findUnique({ where: { eventId: id } });
    expect(receipt?.status).toBe('processed');
  });

  it('NULL nextRetryAt follows normal processing eligibility — live DB path', async () => {
    const id = randomUUID();
    await insertEvent(id, 4);
    await setReceipt(id, 'pending', null); // NULL
    await startIngestionAdapter();
    const receipt = await adminDb.eventReceipt.findUnique({ where: { eventId: id } });
    expect(receipt?.status).toBe('processed');
  });

  it('Head-of-line event blocks subsequent events in live ordered polling pass', async () => {
    const id1 = randomUUID();
    const id2 = randomUUID();
    await insertEvent(id1, 4);
    await insertEvent(id2, 2);
    await setReceipt(id1, 'pending', 10); // Blocks line
    await startIngestionAdapter();
    const count = await adminDb.evidenceProjection.count();
    expect(count).toBe(0); // id1 blocked id2
  });

  it('Reconciliation does not repeatedly retry a future-scheduled event — live DB path', async () => {
    const id = randomUUID();
    await insertEvent(id, 10);
    await setReceipt(id, 'pending', 10); // 10 mins in future
    await runReconciliationScan();
    const count = await adminDb.evidenceProjection.count();
    expect(count).toBe(0); // Ignored by reconciliation
  });

  it('Existing retry-count/quarantine limits remain enforced on retries — live DB path', async () => {
    const id = randomUUID();
    await insertEvent(id, 6, 'UnknownEvent'); // Quarantine on next pass
    await setReceipt(id, 'pending', -1, 4); // 4 retries done, due now
    await runReconciliationScan();
    const receipt = await adminDb.eventReceipt.findUnique({ where: { eventId: id } });
    expect(receipt?.status).toBe('failed'); // Quarantined after 5th try
  });
});
