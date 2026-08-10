'use server';

import { withActionAuth, AuthContext } from '@/lib/rbac';
import * as crypto from 'crypto';

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

export const submitReview = withActionAuth(
  { roles: [] },
  async (ctx: AuthContext, payload: SubmitReviewPayload, accessToken?: string) => {
    const { supabaseAdmin, user } = ctx;

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

    // 1. Generate Deterministic Fingerprint
    // Extract scores in strict alphabetical order for canonicalization
    const canonicalScores = payload.scores ? {
      clarity: payload.scores.clarity,
      originality: payload.scores.originality,
      rigor: payload.scores.rigor,
      significance: payload.scores.significance
    } : null;

    // Keys MUST be in strict alphabetical order to guarantee JSON.stringify determinism
    const fingerprintInput = JSON.stringify({
      action: 'ReviewSubmitted',
      actorId: user.id,
      assignmentId: payload.assignmentId,
      comments: payload.comments,
      recommendation: payload.recommendation,
      scores: canonicalScores
    });
    
    const fingerprint = crypto.createHash('sha256').update(fingerprintInput).digest('hex');

    const outboxPayload = {
      assignmentId: payload.assignmentId,
      actorId: user.id,
      recommendation: payload.recommendation,
      comments: payload.comments,
      scores: payload.scores,
      fingerprint
    };

    // 2. Atomically Insert Outbox Event using assignmentId as the unique outbox event id
    const { error: outboxError } = await supabaseAdmin
      .from('outbox')
      .insert({
        id: payload.assignmentId,
        event_type: 'ReviewSubmitted',
        payload: outboxPayload,
        status: 'pending'
      });

    if (outboxError) {
      if (outboxError.code === '23505') {
        // Deterministic Conflict Handling
        const { data: existingEvent } = await supabaseAdmin
          .from('outbox')
          .select('payload, status')
          .eq('id', payload.assignmentId)
          .single();

        if (existingEvent && existingEvent.payload && existingEvent.payload.fingerprint === fingerprint) {
          // If the event had permanently failed, operator/user can retry by re-submitting identically
          if (existingEvent.status === 'failed') {
            const { error: updateError } = await supabaseAdmin
              .from('outbox')
              .update({ status: 'pending', retry_count: 0, next_retry_at: null, last_error: null })
              .eq('id', payload.assignmentId);
            
            if (updateError) {
              return { success: false, error: 'Database Error: Failed to requeue failed event' };
            }
          }
          // Idempotent replay
          return { success: true };
        } else {
          // Materially different payload or conflict (e.g. they declined previously)
          return { success: false, error: 'Conflict Error: A review decision has already been recorded for this assignment with different content.' };
        }
      }
      return { success: false, error: `Database Error: Failed to queue review submission (${outboxError.message})` };
    }

    return { success: true };
  }
);

export interface DeclineReviewPayload {
  assignmentId: string;
}

export const declineReview = withActionAuth(
  { roles: [] },
  async (ctx: AuthContext, payload: DeclineReviewPayload, accessToken?: string) => {
    const { supabaseAdmin, user } = ctx;

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

    // 1. Generate Deterministic Fingerprint
    // Keys MUST be in strict alphabetical order to guarantee JSON.stringify determinism
    const fingerprintInput = JSON.stringify({
      action: 'ReviewDeclined',
      actorId: user.id,
      assignmentId: payload.assignmentId
    });
    const fingerprint = crypto.createHash('sha256').update(fingerprintInput).digest('hex');

    const outboxPayload = {
      assignmentId: payload.assignmentId,
      actorId: user.id,
      fingerprint
    };

    // 2. Atomically Insert Outbox Event using assignmentId as the unique outbox event id
    const { error: outboxError } = await supabaseAdmin
      .from('outbox')
      .insert({
        id: payload.assignmentId,
        event_type: 'ReviewDeclined',
        payload: outboxPayload,
        status: 'pending'
      });

    if (outboxError) {
      if (outboxError.code === '23505') {
        // Deterministic Conflict Handling
        const { data: existingEvent } = await supabaseAdmin
          .from('outbox')
          .select('payload, status')
          .eq('id', payload.assignmentId)
          .single();

        if (existingEvent && existingEvent.payload && existingEvent.payload.fingerprint === fingerprint) {
          // If the event had permanently failed, operator/user can retry by re-submitting identically
          if (existingEvent.status === 'failed') {
            const { error: updateError } = await supabaseAdmin
              .from('outbox')
              .update({ status: 'pending', retry_count: 0, next_retry_at: null, last_error: null })
              .eq('id', payload.assignmentId);
            
            if (updateError) {
              return { success: false, error: 'Database Error: Failed to requeue failed event' };
            }
          }
          // Idempotent replay
          return { success: true };
        } else {
          // Materially different payload or conflict (e.g. they submitted a review previously)
          return { success: false, error: 'Conflict Error: A review decision has already been recorded for this assignment with different content.' };
        }
      }
      return { success: false, error: `Database Error: Failed to queue decline submission (${outboxError.message})` };
    }

    return { success: true };
  }
);
