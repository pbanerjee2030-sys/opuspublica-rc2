import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { logAuditEvent } from '@/lib/audit';
import { withAuth } from '@/lib/rbac';

export const POST = withAuth({
  roles: ['admin', 'editor'],
  authorizeObject: async () => true // Target-based authorization implemented at RPC/DB layer
}, async (req: NextRequest, ctx) => {
  try {
    const { supabaseAdmin, user } = ctx;
    const body = await req.json();
    
    // Canonical Decision payload per WP-03-01 requirements
    const { 
      submissionId, 
      decision, 
      commentsToAuthor, 
      commentsInternal,
      reviewRound,
      reviseDeadline,
      supportingReviewIds
    } = body;
    
    const idempotencyKey = req.headers.get('Idempotency-Key');

    if (!submissionId || !decision || !idempotencyKey) {
      return NextResponse.json({ error: 'submissionId, decision, and Idempotency-Key are required' }, { status: 400 });
    }

    const { data: decisionId, error } = await supabaseAdmin.rpc('record_decision', {
      p_submission_id: submissionId,
      p_editor_id: user.id,
      p_decision_type: decision,
      p_comments_to_author: commentsToAuthor || null,
      p_comments_internal: commentsInternal || null,
      p_review_round: reviewRound || 1,
      p_revise_deadline: reviseDeadline || null,
      p_supporting_review_ids: supportingReviewIds || null,
      p_idempotency_key: idempotencyKey
    });

    if (error) {
      if (error.code === '23505' && error.message.includes('Idempotency conflict')) {
        return NextResponse.json({ error: 'Conflict: Same Idempotency-Key with different intent' }, { status: 409 });
      }
      if (error.message.includes('Invalid state transition')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error('Failed to record decision:', error);
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    await logAuditEvent({
      actorId: user.id,
      action: decision === 'Reject' ? 'article_rejected' : 'article_updated',
      targetType: 'article',
      targetId: submissionId,
      metadata: { decisionType: decision, decisionId }
    });

    return NextResponse.json({ success: true, decisionId }, { status: 201 });
  } catch (err: any) {
    console.error('Decision API failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
