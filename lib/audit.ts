import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type AuditAction =
  | 'role_change'
  | 'article_published'
  | 'article_rejected'
  | 'article_deleted'
  | 'journal_deleted'
  | 'user_deleted'
  | 'admin_login'
  | 'article_updated'
  | 'reviewer_assigned'
  | 'review_submitted'
  | 'review_declined';

export type AuditTargetType = 'article' | 'user' | 'journal' | 'reviewer_assignment';

export async function logAuditEvent(params: {
  actorId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('audit_log')
      .insert({
        actor_id: params.actorId,
        action: params.action,
        target_type: params.targetType,
        target_id: params.targetId || null,
        metadata: params.metadata || null,
      } as any);

    if (error) {
      console.error('[Audit] Failed to log event:', error.message);
    }
  } catch (err) {
    console.error('[Audit] Error logging event:', err);
  }
}
