'use server';

import { withActionAuth, AuthContext } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export interface SubmitDecisionPayload {
  submissionId: string;
  decision: 'Accept' | 'MinorRevision' | 'MajorRevision' | 'Reject' | 'Retract';
  commentsToAuthor?: string;
  commentsInternal?: string;
  reviewRound?: number;
  reviseDeadline?: string;
  supportingReviewIds?: string[];
}

export const submitDecision = withActionAuth(
  { roles: ['admin', 'editor'] },
  async (ctx: AuthContext, payload: SubmitDecisionPayload) => {
    const { supabaseAdmin, user } = ctx;

    const idempotencyKey = `action-decision-${payload.submissionId}-${payload.decision}-${Date.now()}`;

    const { data: decisionId, error } = await supabaseAdmin.rpc('record_decision', {
      p_submission_id: payload.submissionId,
      p_editor_id: user.id,
      p_decision_type: payload.decision,
      p_comments_to_author: payload.commentsToAuthor || null,
      p_comments_internal: payload.commentsInternal || null,
      p_review_round: payload.reviewRound || 1,
      p_revise_deadline: payload.reviseDeadline ? new Date(payload.reviseDeadline).toISOString() : null,
      p_supporting_review_ids: payload.supportingReviewIds || null,
      p_idempotency_key: idempotencyKey
    });

    if (error) {
      if (error.code === '23505' && error.message.includes('Idempotency conflict')) {
         return { success: false, error: 'Conflict: Same identity but different intent' };
      }
      return { success: false, error: `Database Error: ${error.message}` };
    }

    await logAuditEvent({
      actorId: user.id,
      action: payload.decision === 'Reject' ? 'article_rejected' : 'article_updated',
      targetType: 'article',
      targetId: payload.submissionId,
      metadata: { decisionType: payload.decision, decisionId }
    });

    return { success: true };
  }
);
