-- Phase 2 & 3: Publication Certification & Concurrency Certification
-- Split atomic publication into a two-step RPC to strictly enforce the requested call graph.

CREATE OR REPLACE FUNCTION acquire_publication_lock(p_article_id UUID) 
RETURNS JSONB AS $$
DECLARE
  v_article RECORD;
BEGIN
  -- 1. Database row lock
  SELECT * INTO v_article FROM public.articles WHERE id = p_article_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Article not found');
  END IF;

  -- 2. Idempotency check
  IF v_article.status = 'published' THEN
    RETURN jsonb_build_object('success', false, 'status', 'published', 'doi', v_article.doi, 'published_at', v_article.published_at, 'published_pdf_url', v_article.published_pdf_url);
  END IF;

  IF v_article.status = 'publishing' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Article is currently being published by another process.');
  END IF;

  -- Establish logical lock to protect Crossref deposit
  UPDATE public.articles SET status = 'publishing' WHERE id = p_article_id;

  RETURN jsonb_build_object('success', true, 'status', 'publishing');
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION finalize_publication(
  p_article_id UUID,
  p_user_id UUID,
  p_published_at TIMESTAMPTZ,
  p_doi_status TEXT
) 
RETURNS JSONB AS $$
DECLARE
  v_article RECORD;
BEGIN
  SELECT * INTO v_article FROM public.articles WHERE id = p_article_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Article not found');
  END IF;

  IF v_article.status = 'published' THEN
    RETURN jsonb_build_object('success', true, 'status', 'published', 'doi', v_article.doi, 'published_at', v_article.published_at, 'published_pdf_url', v_article.published_pdf_url);
  END IF;

  -- 3. Database Update
  UPDATE public.articles
  SET status = 'published',
      published_at = p_published_at,
      doi_deposit_status = p_doi_status,
      doi_deposited_at = CASE WHEN p_doi_status = 'submitted' THEN p_published_at ELSE NULL END
  WHERE id = p_article_id;

  -- 4. Audit Log
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (p_user_id, 'article_published', 'article', p_article_id, jsonb_build_object(
    'canonicalChecksum', v_article.canonical_checksum,
    'published_pdf_url', v_article.published_pdf_url,
    'doiMinted', true
  ));

  RETURN jsonb_build_object(
    'success', true, 
    'status', 'newly_published', 
    'doi', v_article.doi, 
    'published_pdf_url', v_article.published_pdf_url, 
    'published_at', p_published_at
  );
END;
$$ LANGUAGE plpgsql;

-- Replace flawed trigger from previous migration to strictly reject VALUE -> VALUE (if the API were to send it)
CREATE OR REPLACE FUNCTION enforce_canonical_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.canonical_package_url IS NOT NULL THEN
    IF NEW.canonical_package_url IS DISTINCT FROM OLD.canonical_package_url OR NEW.canonical_package_url = OLD.canonical_package_url THEN
      RAISE EXCEPTION 'canonical_package_url is immutable once set';
    END IF;
  END IF;

  IF OLD.canonical_session_id IS NOT NULL THEN
    IF NEW.canonical_session_id IS DISTINCT FROM OLD.canonical_session_id OR NEW.canonical_session_id = OLD.canonical_session_id THEN
      RAISE EXCEPTION 'canonical_session_id is immutable once set';
    END IF;
  END IF;

  IF OLD.canonical_checksum IS NOT NULL THEN
    IF NEW.canonical_checksum IS DISTINCT FROM OLD.canonical_checksum OR NEW.canonical_checksum = OLD.canonical_checksum THEN
      RAISE EXCEPTION 'canonical_checksum is immutable once set';
    END IF;
  END IF;

  IF OLD.approved_at IS NOT NULL THEN
    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at OR NEW.approved_at = OLD.approved_at THEN
      RAISE EXCEPTION 'approved_at is immutable once set';
    END IF;
  END IF;

  IF OLD.approved_by IS NOT NULL THEN
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.approved_by = OLD.approved_by THEN
      RAISE EXCEPTION 'approved_by is immutable once set';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
