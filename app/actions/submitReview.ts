'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { logAuditEvent } from '@/lib/audit';

export interface SubmitReviewPayload {
  assignmentId: string;
  recommendation: string;
  comments: string;
  scores: {
    originality: number | null;
    rigor: number | null;
    clarity: number | null;
    significance: number | null;
  } | null;
}

export async function submitReview(payload: SubmitReviewPayload, accessToken: string) {
  try {
    if (!accessToken) {
      return { success: false, error: 'Access Denied: You must be authenticated.' };
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) {
      return { success: false, error: 'Access Denied: Invalid or expired session.' };
    }

    const { data: assignment } = await supabaseAdmin
      .from('reviewer_assignments')
      .select('id, reviewer_id')
      .eq('id', payload.assignmentId)
      .single() as { data: any };

    if (!assignment) {
      return { success: false, error: 'Assignment not found.' };
    }

    if (assignment.reviewer_id !== user.id) {
      return { success: false, error: 'Access Denied: This assignment is not yours.' };
    }

    const { error } = await (supabaseAdmin as any)
      .from('reviewer_assignments')
      .update({
        recommendation: payload.recommendation,
        comments: payload.comments,
        scores: payload.scores,
        status: 'completed',
      })
      .eq('id', payload.assignmentId);

    if (error) throw error;

    await logAuditEvent({
      actorId: user.id,
      action: 'review_submitted',
      targetType: 'reviewer_assignment',
      targetId: payload.assignmentId,
      metadata: { recommendation: payload.recommendation, scores: payload.scores },
    });

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

export interface DeclineReviewPayload {
  assignmentId: string;
}

export async function declineReview(payload: DeclineReviewPayload, accessToken: string) {
  try {
    if (!accessToken) {
      return { success: false, error: 'Access Denied: You must be authenticated.' };
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) {
      return { success: false, error: 'Access Denied: Invalid or expired session.' };
    }

    const { data: assignment } = await supabaseAdmin
      .from('reviewer_assignments')
      .select('id, reviewer_id')
      .eq('id', payload.assignmentId)
      .single() as { data: any };

    if (!assignment) {
      return { success: false, error: 'Assignment not found.' };
    }

    if (assignment.reviewer_id !== user.id) {
      return { success: false, error: 'Access Denied: This assignment is not yours.' };
    }

    const { error } = await (supabaseAdmin as any)
      .from('reviewer_assignments')
      .update({ status: 'declined' })
      .eq('id', payload.assignmentId);

    if (error) throw error;

    await logAuditEvent({
      actorId: user.id,
      action: 'review_declined',
      targetType: 'reviewer_assignment',
      targetId: payload.assignmentId,
      metadata: { declined: true },
    });

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
