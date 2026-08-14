// governance/lib/integration/publication-integration.ts
//
// WS-D+E+H: Real Integration of Crossref Queue + Preservation into Publication Flow
//
// Connects the approved functionality to the actual publication runtime path.
//
// Flow: successful governed publication
// → queue Crossref deposit (if Release Gate ALLOW exists)
// → trigger preservation
// → BagIt package + checksum
// → durable preservation record

import { PrismaClient } from '@prisma/client';
import { queueCrossrefDeposit } from '../crossref/crossref-deposit-worker';
import { triggerPreservation } from '../preservation/preservation-service';

/**
 * Called after a successful governed publication event.
 *
 * This function:
 * 1. Checks if a valid Release Gate ALLOW authorization exists for the article
 * 2. If yes: queues a Crossref deposit job (idempotent)
 * 3. Triggers preservation (BagIt package)
 *
 * Per governance decision §5: Crossref deposit ONLY after successful Release Gate.
 * Per governance decision §4: Archive finalized content after successful governed publication.
 */
export async function onSuccessfulPublication(
  articleId: string,
  prisma: PrismaClient
): Promise<{
  crossrefQueued: boolean;
  preservationTriggered: boolean;
  preservationPackageId?: string;
}> {
  let crossrefQueued = false;
  let preservationTriggered = false;
  let preservationPackageId: string | undefined;

  // 1. Check for valid Release Gate ALLOW authorization
  const authorization = await prisma.$queryRaw<Array<{
    authorization_id: string;
    result: string;
    expires_at: string;
  }>>`
    SELECT authorization_id::text, result, expires_at::text
    FROM governance.gate_audit
    WHERE submission_id IN (
      SELECT submission_id FROM public.submissions
      WHERE article_id = ${articleId}::uuid
      UNION ALL
      SELECT ${articleId}::text
    )
    AND result = 'ALLOW'
    AND expires_at > now()
    ORDER BY issued_at DESC
    LIMIT 1
  `;

  // 2. If valid ALLOW exists → queue Crossref deposit
  if (authorization.length > 0) {
    const authId = authorization[0].authorization_id;
    await queueCrossrefDeposit(articleId, authId, prisma);
    crossrefQueued = true;
  }

  // 3. Trigger preservation (always, after any successful publication)
  try {
    const result = await triggerPreservation(articleId, prisma);
    preservationTriggered = true;
    preservationPackageId = result.packageId;
  } catch (error) {
    console.error(`[Publication Integration] Preservation failed for ${articleId}:`, error);
  }

  return { crossrefQueued, preservationTriggered, preservationPackageId };
}

/**
 * Called when a lifecycle event occurs (correction, retraction, etc.).
 * Queues a Crossref metadata update if a prior deposit exists.
 */
export async function onLifecycleEvent(
  articleId: string,
  eventType: 'CORRECTION' | 'RETRACTION' | 'EXPRESSION_OF_CONCERN' | 'WITHDRAWAL',
  prisma: PrismaClient
): Promise<void> {
  const priorDeposits = await prisma.$queryRaw<Array<{ id: string; deposit_status: string }>>`
    SELECT id::text, deposit_status
    FROM public.crossref_deposit_queue
    WHERE article_id = ${articleId}::uuid
    AND deposit_status = 'confirmed'
    ORDER BY deposited_at DESC
    LIMIT 1
  `;

  if (priorDeposits.length > 0) {
    await prisma.$executeRaw`
      INSERT INTO public.crossref_deposit_queue (
        article_id, authorization_id, deposit_status
      ) VALUES (
        ${articleId}::uuid,
        'lifecycle-${eventType}-${Date.now()}'::text,
        'redeposit'
      )
      ON CONFLICT DO NOTHING
    `;
  }
}
