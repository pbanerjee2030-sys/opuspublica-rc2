-- WP-02-01: Review Outbox Refactor
-- This migration introduces the RPC to atomically process ReviewSubmitted and ReviewDeclined events

CREATE OR REPLACE FUNCTION public.process_review_submission(p_outbox_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event record;
    v_payload jsonb;
    v_assignment_id uuid;
    v_actor_id uuid;
    v_action text;
    v_db_reviewer_id uuid;
    v_db_status text;
BEGIN
    -- Fetch the outbox event, ensuring it is pending
    SELECT * INTO v_event FROM public.outbox WHERE id = p_outbox_id AND status = 'pending' FOR UPDATE;
    IF NOT FOUND THEN
        RETURN false; -- Already processed or doesn't exist
    END IF;

    v_payload := v_event.payload;
    v_assignment_id := (v_payload->>'assignmentId')::uuid;
    v_actor_id := (v_payload->>'actorId')::uuid;

    -- 1. Lock the assignment row to prevent concurrent admin/editor modifications
    SELECT reviewer_id, status INTO v_db_reviewer_id, v_db_status
    FROM public.reviewer_assignments
    WHERE id = v_assignment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        UPDATE public.outbox SET status = 'failed', last_error = 'Assignment not found' WHERE id = p_outbox_id;
        RETURN false;
    END IF;

    -- 2. Defense in Depth: Verify actor is the actual reviewer assigned
    IF v_db_reviewer_id != v_actor_id THEN
        UPDATE public.outbox SET status = 'failed', last_error = 'Authorization failed: Actor is not the assigned reviewer' WHERE id = p_outbox_id;
        RETURN false;
    END IF;

    -- 3. Terminal State Enforcement
    IF v_db_status != 'pending' THEN
        UPDATE public.outbox SET status = 'failed', last_error = 'Assignment is already in a terminal state (' || v_db_status || ')' WHERE id = p_outbox_id;
        RETURN false;
    END IF;

    -- 4. Apply the database mutation based on event_type
    IF v_event.event_type = 'ReviewSubmitted' THEN
        v_action := 'review_submitted';
        UPDATE public.reviewer_assignments
        SET recommendation = v_payload->>'recommendation',
            comments = v_payload->>'comments',
            scores = (v_payload->'scores')::jsonb,
            status = 'completed',
            updated_at = now()
        WHERE id = v_assignment_id;
    ELSIF v_event.event_type = 'ReviewDeclined' THEN
        v_action := 'review_declined';
        UPDATE public.reviewer_assignments
        SET status = 'declined',
            updated_at = now()
        WHERE id = v_assignment_id;
    ELSE
        -- Should not happen if worker filters correctly
        RETURN false;
    END IF;

    -- 5. Queue Audit Log Event Atomically
    INSERT INTO public.outbox (event_type, payload, status)
    VALUES (
        'AuditRecorded',
        jsonb_build_object(
            'actor_id', v_actor_id,
            'action', v_action,
            'target_type', 'reviewer_assignment',
            'target_id', v_assignment_id,
            'metadata', CASE 
                WHEN v_action = 'review_submitted' THEN jsonb_build_object('recommendation', v_payload->>'recommendation', 'scores', v_payload->'scores')
                ELSE jsonb_build_object('declined', true)
            END
        ),
        'pending'
    );

    -- 6. Mark Event Completed
    UPDATE public.outbox 
    SET status = 'completed', processed_at = now() 
    WHERE id = p_outbox_id;

    RETURN true;
END;
$$;

-- Secure the RPC from unintended PUBLIC execution
REVOKE EXECUTE ON FUNCTION public.process_review_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_review_submission(uuid) TO service_role;
