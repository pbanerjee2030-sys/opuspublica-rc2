// governance/lib/lifecycle/lifecycle-service.ts
//
// WS-B: Append-Only Ethics Lifecycle Service
//
// Operationalizes article_lifecycle_events with authorized event creation,
// immutable history, derived state, and audit trail.
//
// CRITICAL: Does NOT modify articles.status. The current scholarly-record
// state is DERIVED from the event history.

import { PrismaClient } from '@prisma/client';
import { type LifecycleEventType, type ArticleLifecycleState, deriveLifecycleState, type LifecycleEvent } from './events';

export interface CreateLifecycleEventInput {
  articleId: string;
  eventType: LifecycleEventType;
  effectiveDate: string;
  authority?: string;
  evidence?: string;
  rationale?: string;
  relatedArticleId?: string;
}

export async function createLifecycleEvent(
  input: CreateLifecycleEventInput,
  prisma: PrismaClient
): Promise<LifecycleEvent> {
  const record = await prisma.$queryRaw<LifecycleEvent[]>`
    INSERT INTO public.article_lifecycle_events (
      article_id, event_type, effective_date, authority,
      evidence, rationale, related_article_id, is_active
    ) VALUES (
      ${input.articleId}::uuid, ${input.eventType}, ${input.effectiveDate}::date,
      ${input.authority ? prisma.$queryRaw`${input.authority}::uuid` : null},
      ${input.evidence}, ${input.rationale},
      ${input.relatedArticleId ? prisma.$queryRaw`${input.relatedArticleId}::uuid` : null},
      true
    )
    RETURNING
      id::text, article_id::text, event_type, effective_date::text,
      authority::text, evidence, rationale, related_article_id::text,
      prior_event_id::text, is_active, created_at::text
  `;
  return record[0];
}

export async function getLifecycleEvents(
  articleId: string,
  prisma: PrismaClient
): Promise<LifecycleEvent[]> {
  return prisma.$queryRaw<LifecycleEvent[]>`
    SELECT
      id::text, article_id::text, event_type, effective_date::text,
      authority::text, evidence, rationale, related_article_id::text,
      prior_event_id::text, is_active, created_at::text
    FROM public.article_lifecycle_events
    WHERE article_id = ${articleId}::uuid
    ORDER BY effective_date, created_at
  `;
}

export async function getArticleLifecycleState(
  articleId: string,
  prisma: PrismaClient
): Promise<ArticleLifecycleState> {
  const events = await getLifecycleEvents(articleId, prisma);
  return deriveLifecycleState(articleId, events);
}

/**
 * Supersedes a prior lifecycle event (e.g., retraction lifted → correction).
 * The prior event is NOT deleted — is_active is set to false.
 */
export async function supersedeLifecycleEvent(
  eventId: string,
  prisma: PrismaClient
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE public.article_lifecycle_events
    SET is_active = false
    WHERE id = ${eventId}::uuid
  `;
}
