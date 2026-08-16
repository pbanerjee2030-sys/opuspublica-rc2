-- WP-D V3: Real Submission-Path Metadata Persistence + Event Idempotency

-- 0. Schema additions: article_type column (idempotent)
ALTER TABLE public.articles
    ADD COLUMN IF NOT EXISTS article_type text;

DO $$ BEGIN
    ALTER TABLE public.articles ADD CONSTRAINT check_article_type CHECK (
        article_type IN (
            'Journal Article',
            'Book Review',
            'Editorial',
            'Correction',
            'Brief Report',
            'Review Article',
            'Book',
            'Report / Working Paper'
        )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Replace the RPC to handle unified authors and rich metadata
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
    v_author jsonb;
    v_structured_author_id uuid;
    v_affil text;
    v_affil_idx integer;
    v_author_idx integer := 0;
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

    -- Insert Article with rich metadata
    INSERT INTO public.articles (
        id, title, abstract, content, status, journal_id, pdf_url, version,
        funder_name, funder_award_number, funder_id, keywords,
        conflict_of_interest_statement, data_availability_statement, ethics_approval_statement,
        article_type, license_type
    ) VALUES (
        p_article_id,
        p_payload->>'title',
        p_payload->>'abstract',
        p_payload->>'content',
        'pending_review',
        (p_payload->>'journalId')::uuid,
        p_payload->>'storagePath',
        1,
        p_payload->>'funderName',
        p_payload->>'funderAwardNumber',
        p_payload->>'funderId',
        (SELECT array_agg(x) FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_payload->'keywords') = 'array' THEN p_payload->'keywords' ELSE '[]'::jsonb END) x),
        p_payload->>'conflictOfInterestStatement',
        p_payload->>'dataAvailabilityStatement',
        p_payload->>'ethicsApprovalStatement',
        p_payload->>'articleType',
        COALESCE(p_payload->>'license', 'CC-BY')
    ) ON CONFLICT (id) DO NOTHING;

    -- Insert Unified Authors
    IF p_payload->'authors' IS NOT NULL AND jsonb_typeof(p_payload->'authors') = 'array' THEN
        FOR v_author IN SELECT * FROM jsonb_array_elements(p_payload->'authors')
        LOOP
            v_author_idx := v_author_idx + 1;
            
            -- Insert into structured metadata table (WP-D schema)
            INSERT INTO public.article_authors_structured (
                article_id, author_order, given_name, family_name, 
                orcid, email, corresponding
            ) VALUES (
                p_article_id,
                COALESCE((v_author->>'order')::integer, v_author_idx),
                split_part(v_author->>'name', ' ', 1),
                substr(v_author->>'name', length(split_part(v_author->>'name', ' ', 1)) + 2),
                v_author->>'orcid',
                v_author->>'email',
                COALESCE((v_author->>'isCorresponding')::boolean, false)
            ) RETURNING id INTO v_structured_author_id;

            -- Insert Affiliations
            IF v_author->'affiliations' IS NOT NULL AND jsonb_typeof(v_author->'affiliations') = 'array' THEN
                v_affil_idx := 0;
                FOR v_affil IN SELECT * FROM jsonb_array_elements_text(v_author->'affiliations')
                LOOP
                    v_affil_idx := v_affil_idx + 1;
                    INSERT INTO public.author_affiliations (
                        author_id, institution, affiliation_order
                    ) VALUES (
                        v_structured_author_id, v_affil, v_affil_idx
                    );
                END LOOP;
            END IF;

            -- Insert into legacy article_authors mapping for profile_id linkage
            IF (v_author->>'profileId') IS NOT NULL THEN
                INSERT INTO public.article_authors (article_id, profile_id)
                VALUES (p_article_id, (v_author->>'profileId')::uuid)
                ON CONFLICT DO NOTHING;
            ELSE
                INSERT INTO public.article_authors (
                    article_id, co_author_name, co_author_orcid, co_author_ror_id
                ) VALUES (
                    p_article_id, v_author->>'name', v_author->>'orcid', v_author->>'rorId'
                ) ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

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

    -- Insert outbox event for ArticleSubmitted using article_id explicitly
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

GRANT EXECUTE ON FUNCTION public.submit_article_transition TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_article_transition TO service_role;


-- 2. Modify process_article_submission to remove duplicate inserts and ensure idempotency
CREATE OR REPLACE FUNCTION public.process_article_submission(p_outbox_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event record;
    v_payload jsonb;
    v_article_id uuid;
    v_actor_id uuid;
    v_email jsonb;
BEGIN
    -- Fetch the outbox event, ensuring it is pending
    SELECT * INTO v_event FROM public.outbox WHERE id = p_outbox_id AND status = 'pending' FOR UPDATE;
    IF NOT FOUND THEN
        RETURN false; -- Already processed or doesn't exist
    END IF;

    v_payload := v_event.payload;
    
    -- Canonical usage of article_id in payload, mapped by RPC
    v_article_id := (v_payload->>'article_id')::uuid;
    v_actor_id := (v_payload->>'actor_id')::uuid;

    -- Note: `articles` and `article_authors` insertion was removed here 
    -- because `submit_article_transition` now durably owns article/author creation.

    -- 4. Queue Notification (Idempotent: check if already exists for this event)
    v_email := v_payload->'email';
    IF v_email IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.outbox 
            WHERE event_type = 'NotificationQueued' 
            AND payload->>'article_id' = v_article_id::text
            AND payload->>'type' = 'submission_received' -- Assume we can tag it, or just rely on exact payload match
            -- Actually, to perfectly tie it to this event, we can include the source outbox_id in the payload
            AND payload->>'source_event_id' = p_outbox_id::text
        ) THEN
            INSERT INTO public.outbox (event_type, payload, status)
            VALUES (
                'NotificationQueued',
                v_email || jsonb_build_object('source_event_id', p_outbox_id, 'article_id', v_article_id),
                'pending'
            );
        END IF;
    END IF;

    -- 5. Queue Audit Log (Idempotent)
    IF NOT EXISTS (
        SELECT 1 FROM public.outbox
        WHERE event_type = 'AuditRecorded'
        AND payload->>'action' = 'submit_article'
        AND payload->>'target_id' = v_article_id::text
    ) THEN
        INSERT INTO public.outbox (event_type, payload, status)
        VALUES (
            'AuditRecorded',
            jsonb_build_object(
                'actor_id', v_actor_id,
                'action', 'submit_article',
                'target_type', 'article',
                'target_id', v_article_id,
                'metadata', jsonb_build_object('title', v_payload->>'title')
            ),
            'pending'
        );
    END IF;

    -- 6. Mark Event Completed
    UPDATE public.outbox 
    SET status = 'completed', processed_at = now() 
    WHERE id = p_outbox_id;

    RETURN true;
END;
$$;
