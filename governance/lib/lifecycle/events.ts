// governance/lib/lifecycle/events.ts
//
// WORKSTREAM B — Ethics / Article Lifecycle (Append-Only Events)
//
// Authority: rc2-post-remediation-governance-decisions.md §1
//
// CRITICAL: Does NOT alter the certified articles.status state model.
// The current scholarly-record state is DERIVED from the event history.
// Historical states MUST NOT be silently destroyed.

import { createHash } from 'crypto';

export type LifecycleEventType = 'CORRECTION' | 'RETRACTION' | 'EXPRESSION_OF_CONCERN' | 'WITHDRAWAL';

export interface LifecycleEvent {
  id: string;
  articleId: string;
  eventType: LifecycleEventType;
  effectiveDate: string;
  authority?: string;
  evidence?: string;
  rationale?: string;
  relatedArticleId?: string;
  priorEventId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ArticleLifecycleState {
  articleId: string;
  hasCorrection: boolean;
  hasRetraction: boolean;
  hasExpressionOfConcern: boolean;
  hasWithdrawal: boolean;
  activeEvents: LifecycleEvent[];
  currentScholarlyRecordStatus: 'published' | 'corrected' | 'retracted' | 'expression_of_concern' | 'withdrawn';
}

/**
 * Derives the current scholarly-record state from the append-only event history.
 *
 * Per governance decision §1:
 * - The certified articles.status state model is NOT modified.
 * - The current state is DERIVED from the event stream.
 * - Historical events MUST NOT be silently destroyed.
 */
export function deriveLifecycleState(articleId: string, events: LifecycleEvent[]): ArticleLifecycleState {
  const activeEvents = events
    .filter(e => e.articleId === articleId && e.isActive)
    .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

  const hasRetraction = activeEvents.some(e => e.eventType === 'RETRACTION');
  const hasWithdrawal = activeEvents.some(e => e.eventType === 'WITHDRAWAL');
  const hasExpressionOfConcern = activeEvents.some(e => e.eventType === 'EXPRESSION_OF_CONCERN');
  const hasCorrection = activeEvents.some(e => e.eventType === 'CORRECTION');

  // Priority: withdrawal > retraction > expression_of_concern > corrected > published
  let status: ArticleLifecycleState['currentScholarlyRecordStatus'] = 'published';
  if (hasWithdrawal) status = 'withdrawn';
  else if (hasRetraction) status = 'retracted';
  else if (hasExpressionOfConcern) status = 'expression_of_concern';
  else if (hasCorrection) status = 'corrected';

  return {
    articleId,
    hasCorrection,
    hasRetraction,
    hasExpressionOfConcern,
    hasWithdrawal,
    activeEvents,
    currentScholarlyRecordStatus: status,
  };
}
