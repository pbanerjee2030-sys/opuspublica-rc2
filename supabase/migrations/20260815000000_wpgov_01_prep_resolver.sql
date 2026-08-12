-- Migration: WP-GOV-01-PREP Publication Evidence Boundary
-- Creates the read-only evidence resolver for Governance.

-- 1. Create the ingestion role if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'governance_ingest_role') THEN
        CREATE ROLE governance_ingest_role;
    END IF;
END
$$;

-- 2. Strip all explicit function execution from governance_ingest_role in public schema
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM governance_ingest_role;

-- 3. Explicitly secure sensitive Publication RPCs from PUBLIC execution inheritance
-- This ensures governance_ingest_role (and PUBLIC) cannot execute them, while legitimate
-- application roles (like service_role) retain or are explicitly granted execution.
REVOKE EXECUTE ON FUNCTION public.process_article_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_article_submission(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.submit_article_transition(uuid, uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_article_transition(uuid, uuid, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_single_audit_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_single_audit_event(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.process_review_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_review_submission(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_decision(uuid, uuid, text, text, text, integer, timestamp with time zone, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_decision(uuid, uuid, text, text, text, integer, timestamp with time zone, uuid[], text) TO service_role;

-- Note on Default Privileges:
-- ALTER DEFAULT PRIVILEGES for public functions is omitted to prevent breaking future 
-- Publication RPCs that legitimately require PUBLIC execution. Future sensitive functions 
-- must explicitly REVOKE EXECUTE FROM PUBLIC.

-- 4. Create the resolver function
-- Using SECURITY DEFINER and fixed search_path to prevent manipulation.
CREATE OR REPLACE FUNCTION public.governance_evidence_resolver(p_assignment_id uuid)
RETURNS TABLE (
    assignment_id uuid,
    submission_id uuid,
    article_id uuid,
    journal_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        ra.id AS assignment_id,
        s.submission_id AS submission_id,
        ra.article_id AS article_id,
        s.submission_journal_id AS journal_id
    FROM public.reviewer_assignments ra
    JOIN public.submissions s ON s.submission_article_id = ra.article_id
    WHERE ra.id = p_assignment_id
    ORDER BY s.submission_submitted_at DESC
    LIMIT 1;
$$;

-- 5. Restrict execution
REVOKE ALL ON FUNCTION public.governance_evidence_resolver(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.governance_evidence_resolver(uuid) TO governance_ingest_role;
