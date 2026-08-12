CREATE TYPE decision_type AS ENUM ('Accept', 'MinorRevision', 'MajorRevision', 'Reject', 'Retract');
CREATE TYPE decision_state AS ENUM ('draft', 'recorded', 'superseded');

CREATE TABLE IF NOT EXISTS public.decisions (
    decision_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    decision_submission_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    decision_editor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    decision_type decision_type NOT NULL,
    decision_state decision_state NOT NULL DEFAULT 'recorded',
    decision_comments_to_author text,
    decision_comments_internal text,
    decision_review_round integer NOT NULL DEFAULT 1,
    decision_effective_at timestamp with time zone,
    decision_superseded_by_id uuid REFERENCES public.decisions(decision_id) ON DELETE SET NULL,
    decision_revise_deadline timestamp with time zone,
    decision_recorded_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    idempotency_key text,
    intent_hash text
);

CREATE UNIQUE INDEX idx_decisions_idempotency_key ON public.decisions(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_decisions_submission_id ON public.decisions(decision_submission_id);
CREATE INDEX idx_decisions_editor_id ON public.decisions(decision_editor_id);

CREATE TABLE IF NOT EXISTS public.decision_supporting_reviews (
    decision_id uuid NOT NULL REFERENCES public.decisions(decision_id) ON DELETE CASCADE,
    reviewer_assignment_id uuid NOT NULL REFERENCES public.reviewer_assignments(id) ON DELETE CASCADE,
    PRIMARY KEY (decision_id, reviewer_assignment_id)
);

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_supporting_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow editors/admins to read decisions" ON public.decisions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('editor', 'admin')
        )
    );

CREATE POLICY "Allow editors/admins to read supporting reviews" ON public.decision_supporting_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('editor', 'admin')
        )
    );

CREATE OR REPLACE FUNCTION public.record_decision(
    p_submission_id uuid,
    p_editor_id uuid,
    p_decision_type text,
    p_comments_to_author text,
    p_comments_internal text,
    p_review_round integer,
    p_revise_deadline timestamp with time zone,
    p_supporting_review_ids uuid[],
    p_idempotency_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_db_status text;
    v_editor_role user_role;
    v_new_decision_id uuid;
    v_intent_hash text;
    v_existing_decision record;
    v_rev_id uuid;
    v_event_id uuid;
    v_decided_at timestamp with time zone;
BEGIN
    -- 1. Intent hashing for strict idempotency check
    v_intent_hash := md5(
        concat_ws('|', 
            p_submission_id::text, 
            p_decision_type, 
            COALESCE(p_comments_to_author, ''), 
            p_review_round::text
        )
    );

    -- 2. Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT decision_id, intent_hash INTO v_existing_decision
        FROM public.decisions 
        WHERE idempotency_key = p_idempotency_key;
        
        IF FOUND THEN
            IF v_existing_decision.intent_hash = v_intent_hash THEN
                -- SAME IDENTITY + SAME INTENT -> idempotent success
                RETURN v_existing_decision.decision_id;
            ELSE
                -- SAME IDENTITY + DIFFERENT INTENT -> deterministic conflict
                RAISE EXCEPTION 'Idempotency conflict: Same identity but different intent' USING ERRCODE = 'unique_violation';
            END IF;
        END IF;
    END IF;

    -- 3. Authorization Check
    SELECT role INTO v_editor_role FROM public.profiles WHERE id = p_editor_id;
    IF NOT FOUND OR (v_editor_role != 'admin'::user_role AND v_editor_role != 'editor'::user_role) THEN
        RAISE EXCEPTION 'Unauthorized: Actor must be admin or editor';
    END IF;

    -- 4. Lock Submission (Articles)
    SELECT status INTO v_db_status FROM public.articles WHERE id = p_submission_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;

    -- 5. Strict State Machine Enforcement
    -- Accepted, published, or retracted articles cannot have new normal decisions made on them,
    -- except potentially 'Retract' on an accepted/published one.
    IF v_db_status IN ('accepted', 'published', 'retracted') AND p_decision_type != 'Retract' THEN
         RAISE EXCEPTION 'Invalid state transition: Cannot make a % decision on a % submission', p_decision_type, v_db_status;
    END IF;

    -- 6. Insert decision
    v_decided_at := timezone('utc'::text, now());
    INSERT INTO public.decisions (
        decision_submission_id, 
        decision_editor_id, 
        decision_type, 
        decision_comments_to_author, 
        decision_comments_internal, 
        decision_review_round,
        decision_revise_deadline,
        idempotency_key,
        intent_hash,
        decision_effective_at,
        decision_recorded_at
    )
    VALUES (
        p_submission_id, 
        p_editor_id, 
        p_decision_type::decision_type, 
        p_comments_to_author, 
        p_comments_internal, 
        p_review_round,
        p_revise_deadline,
        p_idempotency_key,
        v_intent_hash,
        v_decided_at,
        v_decided_at
    )
    RETURNING decision_id INTO v_new_decision_id;

    -- 7. Insert Supporting Reviews
    IF p_supporting_review_ids IS NOT NULL THEN
        FOREACH v_rev_id IN ARRAY p_supporting_review_ids
        LOOP
            INSERT INTO public.decision_supporting_reviews (decision_id, reviewer_assignment_id)
            VALUES (v_new_decision_id, v_rev_id);
        END LOOP;
    END IF;

    -- 8. Update Submission (Article) Status conditionally
    IF p_decision_type = 'Accept' THEN
        UPDATE public.articles SET status = 'accepted', updated_at = now() WHERE id = p_submission_id;
    ELSIF p_decision_type = 'Reject' THEN
        UPDATE public.articles SET status = 'rejected', rejection_reason = p_comments_to_author, updated_at = now() WHERE id = p_submission_id;
    ELSIF p_decision_type = 'Retract' THEN
        UPDATE public.articles SET status = 'retracted', updated_at = now() WHERE id = p_submission_id;
    ELSIF p_decision_type IN ('MinorRevision', 'MajorRevision') THEN
        UPDATE public.articles SET status = 'revision_requested', updated_at = now() WHERE id = p_submission_id;
    END IF;

    -- 9. Insert Outbox Event (DecisionRecorded)
    -- Authoritative requirement: The DecisionRecorded idempotency identity is decision_id.
    v_event_id := v_new_decision_id;

    INSERT INTO public.outbox (id, event_type, payload, status)
    VALUES (
        v_event_id,
        'DecisionRecorded',
        jsonb_build_object(
            'decision_id', v_new_decision_id,
            'submission_id', p_submission_id,
            'decision', p_decision_type,
            'decided_by', p_editor_id,
            'decided_at', v_decided_at,
            'rationale_uri', NULL
        ),
        'pending'
    );

    RETURN v_new_decision_id;
END;
$$;

-- Secure the RPC from unintended PUBLIC execution
REVOKE EXECUTE ON FUNCTION public.record_decision(uuid, uuid, text, text, text, integer, timestamp with time zone, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_decision(uuid, uuid, text, text, text, integer, timestamp with time zone, uuid[], text) TO service_role;
