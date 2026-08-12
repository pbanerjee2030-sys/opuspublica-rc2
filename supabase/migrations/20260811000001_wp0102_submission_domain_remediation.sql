-- WP-01-02 Submission Domain Remediation

-- 1. Create canonical submission state enum
CREATE TYPE public.submission_state_type AS ENUM (
    'Drafted',
    'Submitted',
    'Withdrawn',
    'InReview',
    'Accepted',
    'Rejected',
    'RevisionRequested',
    'Archived'
);

-- 2. Create canonical submissions entity
CREATE TABLE public.submissions (
    submission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_article_id uuid NOT NULL REFERENCES public.articles(id),
    submission_corresponding_author_id uuid REFERENCES public.profiles(id),
    submission_state public.submission_state_type NOT NULL DEFAULT 'Drafted',
    submission_submitted_at timestamp with time zone,
    submission_submitted_by_user_id uuid NOT NULL REFERENCES public.profiles(id),
    submission_files jsonb,
    submission_cover_letter text,
    submission_suggested_reviewers jsonb,
    submission_opposed_reviewers jsonb,
    submission_subject text,
    submission_journal_id uuid NOT NULL REFERENCES public.journals(id),
    submission_section_id uuid,
    submission_language text,
    submission_license_consent boolean,
    submission_ethics_declaration boolean,
    submission_coi_declaration boolean,
    submission_funding_declaration boolean,
    submission_data_availability boolean,
    submission_preprint_url text,
    submission_preprint_server text,
    submission_withdrawal_reason text,
    -- Idempotency and audit tracking
    idempotency_key text UNIQUE,
    intent_hash text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX idx_submissions_article_id ON public.submissions(submission_article_id);
CREATE INDEX idx_submissions_user_id ON public.submissions(submission_submitted_by_user_id);
CREATE INDEX idx_submissions_journal_id ON public.submissions(submission_journal_id);
CREATE INDEX idx_submissions_state ON public.submissions(submission_state);
CREATE INDEX idx_submissions_idempotency ON public.submissions(idempotency_key);

-- RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view their own submissions"
    ON public.submissions FOR SELECT
    USING (auth.uid() = submission_submitted_by_user_id OR auth.uid() = submission_corresponding_author_id);

CREATE POLICY "Admins can view all submissions"
    ON public.submissions FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'editor')
    ));

-- 3. Transition Boundary (RPC)
CREATE OR REPLACE FUNCTION public.submit_article_transition(
    p_submission_id uuid,
    p_article_id uuid,
    p_idempotency_key text,
    p_intent_hash text,
    p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_existing_id uuid;
    v_existing_intent text;
    v_event_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Check Idempotency
    SELECT submission_id, intent_hash INTO v_existing_id, v_existing_intent
    FROM public.submissions 
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_intent = p_intent_hash THEN
            RETURN jsonb_build_object('success', true, 'submission_id', v_existing_id, 'article_id', p_article_id, 'idempotent', true);
        ELSE
            RAISE EXCEPTION 'Conflict: Same idempotency key used with different intent_hash';
        END IF;
    END IF;
    
    -- Ensure submission_id is not reused across different idempotency keys
    IF EXISTS (SELECT 1 FROM public.submissions WHERE submission_id = p_submission_id) THEN
        RAISE EXCEPTION 'Conflict: submission_id already exists with a different payload';
    END IF;

    -- Note: The article MUST exist before we can reference it in submission_article_id.
    -- However, WP-01-01 was creating the Article via outbox. We must either create the Article here,
    -- or require it to be created first. Since the prompt states "The canonical Submission creation 
    -- transaction must establish the durable Submission record and the corresponding: ArticleSubmitted 
    -- domain event atomically", we should create the Article here if it doesn't exist, to maintain atomic 
    -- submission capabilities.
    
    INSERT INTO public.articles (
        id, title, abstract, content, status, journal_id, pdf_url, version,
        funder_name, funder_award_number, funder_id, keywords,
        conflict_of_interest_statement, data_availability_statement, ethics_approval_statement
    ) VALUES (
        p_article_id,
        p_payload->>'title',
        p_payload->>'abstract',
        p_payload->>'content',
        'pending_review', -- Legacy status for compatibility
        (p_payload->>'journalId')::uuid,
        p_payload->>'storagePath',
        1,
        p_payload->>'funderName',
        p_payload->>'funderAwardNumber',
        p_payload->>'funderId',
        (SELECT array_agg(x) FROM jsonb_array_elements_text(p_payload->'keywords') x),
        p_payload->>'conflictOfInterestStatement',
        p_payload->>'dataAvailabilityStatement',
        p_payload->>'ethicsApprovalStatement'
    ) ON CONFLICT (id) DO NOTHING;

    -- Insert Submission
    INSERT INTO public.submissions (
        submission_id,
        submission_article_id,
        submission_state,
        submission_submitted_at,
        submission_submitted_by_user_id,
        submission_journal_id,
        submission_subject,
        idempotency_key,
        intent_hash
    ) VALUES (
        p_submission_id,
        p_article_id,
        'Submitted',
        now(),
        v_user_id,
        (p_payload->>'journalId')::uuid,
        p_payload->>'title',
        p_idempotency_key,
        p_intent_hash
    );

    -- Generate separate Event UUID
    v_event_id := gen_random_uuid();

    -- Insert outbox event for ArticleSubmitted
    INSERT INTO public.outbox (id, event_type, payload, status)
    VALUES (
        v_event_id,
        'ArticleSubmitted',
        jsonb_build_object(
            'submission_id', p_submission_id,
            'article_id', p_article_id,
            'actor_id', v_user_id,
            'idempotency_key', p_idempotency_key
        ) || p_payload,
        'pending'
    );

    RETURN jsonb_build_object('success', true, 'submission_id', p_submission_id, 'article_id', p_article_id, 'event_id', v_event_id);
END;
$$;

-- 4. Historical Backfill
-- Insert historical articles into submissions
INSERT INTO public.submissions (
    submission_id,
    submission_article_id,
    submission_state,
    submission_submitted_at,
    submission_submitted_by_user_id,
    submission_journal_id,
    submission_subject
)
SELECT 
    gen_random_uuid(), -- Generate a new submission ID
    a.id,
    CASE 
        WHEN a.status = 'draft' THEN 'Drafted'::public.submission_state_type
        WHEN a.status = 'pending_review' THEN 'Submitted'::public.submission_state_type
        WHEN a.status = 'under_review' THEN 'InReview'::public.submission_state_type
        WHEN a.status = 'accepted' THEN 'Accepted'::public.submission_state_type
        WHEN a.status = 'rejected' THEN 'Rejected'::public.submission_state_type
        WHEN a.status = 'published' THEN 'Archived'::public.submission_state_type
        ELSE 'Archived'::public.submission_state_type
    END,
    a.created_at, -- Best guess for submitted_at
    COALESCE((SELECT profile_id FROM public.article_authors WHERE article_id = a.id LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid), -- Use first author or dummy
    a.journal_id,
    a.title
FROM public.articles a
ON CONFLICT DO NOTHING;

