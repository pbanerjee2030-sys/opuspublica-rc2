-- Task 1: Database Immutability
CREATE OR REPLACE FUNCTION enforce_canonical_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.canonical_package_url IS NOT NULL AND NEW.canonical_package_url IS DISTINCT FROM OLD.canonical_package_url THEN
    RAISE EXCEPTION 'canonical_package_url is immutable once set';
  END IF;

  IF OLD.canonical_session_id IS NOT NULL AND NEW.canonical_session_id IS DISTINCT FROM OLD.canonical_session_id THEN
    RAISE EXCEPTION 'canonical_session_id is immutable once set';
  END IF;

  IF OLD.canonical_checksum IS NOT NULL AND NEW.canonical_checksum IS DISTINCT FROM OLD.canonical_checksum THEN
    RAISE EXCEPTION 'canonical_checksum is immutable once set';
  END IF;

  IF OLD.approved_at IS NOT NULL AND NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'approved_at is immutable once set';
  END IF;

  IF OLD.approved_by IS NOT NULL AND NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
    RAISE EXCEPTION 'approved_by is immutable once set';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_canonical_immutability ON public.articles;
CREATE TRIGGER trigger_enforce_canonical_immutability
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION enforce_canonical_immutability();


-- Task 2 & 3: Row Locking & Transaction Boundary (RPC)
CREATE OR REPLACE FUNCTION publish_article_atomic(
  p_article_id UUID,
  p_user_id UUID,
  p_published_at TIMESTAMPTZ,
  p_doi_status TEXT
) RETURNS JSONB AS $$
DECLARE
  v_article RECORD;
BEGIN
  -- Row-level locking inside the transaction
  SELECT * INTO v_article FROM public.articles WHERE id = p_article_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Article not found');
  END IF;

  -- Idempotency check inside the locked transaction
  IF v_article.status = 'published' THEN
    RETURN jsonb_build_object('success', true, 'status', 'published', 'doi', v_article.doi, 'published_at', v_article.published_at, 'published_pdf_url', v_article.published_pdf_url);
  END IF;

  -- Database-level validation of readiness
  IF v_article.canonical_package_url IS NULL OR v_article.published_pdf_url IS NULL THEN
    RAISE EXCEPTION 'Article not ready for publication';
  END IF;

  -- Update article
  UPDATE public.articles
  SET status = 'published',
      published_at = p_published_at,
      doi_deposit_status = p_doi_status,
      doi_deposited_at = CASE WHEN p_doi_status = 'submitted' THEN p_published_at ELSE NULL END
  WHERE id = p_article_id;

  -- Audit log insertion (atomic)
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
