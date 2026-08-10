-- WP-01-01: Submission Outbox Refactor
-- This migration introduces the RPC to atomically process an ArticleSubmitted event
-- from the outbox, eliminating dual-write failures.

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
    v_author_id uuid;
    v_external record;
    v_co_authors jsonb;
    v_author_ids jsonb;
    v_email jsonb;
BEGIN
    -- Fetch the outbox event, ensuring it is pending
    SELECT * INTO v_event FROM public.outbox WHERE id = p_outbox_id AND status = 'pending' FOR UPDATE;
    IF NOT FOUND THEN
        RETURN false; -- Already processed or doesn't exist
    END IF;

    v_payload := v_event.payload;
    v_article_id := (v_payload->>'articleId')::uuid;
    v_actor_id := (v_payload->>'actorId')::uuid;

    -- 1. Insert into articles
    INSERT INTO public.articles (
        id, title, abstract, content, status, journal_id, pdf_url, version,
        funder_name, funder_award_number, funder_id, keywords,
        conflict_of_interest_statement, data_availability_statement, ethics_approval_statement
    ) VALUES (
        v_article_id,
        v_payload->>'title',
        v_payload->>'abstract',
        v_payload->>'content',
        'pending_review',
        (v_payload->>'journalId')::uuid,
        v_payload->>'storagePath',
        1,
        v_payload->>'funderName',
        v_payload->>'funderAwardNumber',
        v_payload->>'funderId',
        (SELECT array_agg(x) FROM jsonb_array_elements_text(v_payload->'keywords') x),
        v_payload->>'conflictOfInterestStatement',
        v_payload->>'dataAvailabilityStatement',
        v_payload->>'ethicsApprovalStatement'
    );

    -- 2. Insert into article_authors (Internal)
    v_author_ids := v_payload->'authorIds';
    IF v_author_ids IS NOT NULL AND jsonb_typeof(v_author_ids) = 'array' THEN
        FOR v_author_id IN SELECT value::text::uuid FROM jsonb_array_elements(v_author_ids)
        LOOP
            INSERT INTO public.article_authors (article_id, profile_id)
            VALUES (v_article_id, v_author_id);
        END LOOP;
    END IF;

    -- 3. Insert into article_authors (External)
    v_co_authors := v_payload->'externalCoAuthors';
    IF v_co_authors IS NOT NULL AND jsonb_typeof(v_co_authors) = 'array' THEN
        FOR v_external IN SELECT value FROM jsonb_array_elements(v_co_authors)
        LOOP
            INSERT INTO public.article_authors (
                article_id, co_author_name, co_author_orcid, co_author_ror_id
            ) VALUES (
                v_article_id,
                v_external.value->>'name',
                v_external.value->>'orcid',
                v_external.value->>'rorId'
            );
        END LOOP;
    END IF;

    -- 4. Queue Notification
    v_email := v_payload->'email';
    IF v_email IS NOT NULL THEN
        INSERT INTO public.outbox (event_type, payload, status)
        VALUES (
            'NotificationQueued',
            v_email,
            'pending'
        );
    END IF;

    -- 5. Queue Audit Log
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

    -- 6. Mark Event Completed
    UPDATE public.outbox 
    SET status = 'completed', processed_at = now() 
    WHERE id = p_outbox_id;

    RETURN true;
END;
$$;
