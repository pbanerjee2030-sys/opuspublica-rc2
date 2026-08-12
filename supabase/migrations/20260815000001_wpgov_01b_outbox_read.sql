-- Migration: WP-GOV-01B Outbox Read Boundary
-- Establishes the narrowly scoped read boundary for Governance ingestion

-- 1. Create a SECURITY DEFINER function to read the outbox
-- This exposes exactly what is needed without granting SELECT on the table.
CREATE OR REPLACE FUNCTION public.governance_outbox_reader(p_window_start timestamp with time zone, p_limit integer)
RETURNS TABLE (
    id uuid,
    event_type text,
    payload jsonb,
    created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT id, event_type, payload, created_at
    FROM public.outbox
    WHERE created_at >= p_window_start
    ORDER BY created_at ASC, id ASC
    LIMIT p_limit;
$$;

-- 2. Restrict execution
REVOKE ALL ON FUNCTION public.governance_outbox_reader(timestamp with time zone, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.governance_outbox_reader(timestamp with time zone, integer) TO governance_ingest_role;

-- 3. Create the Governance login role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'governance_worker') THEN
        CREATE ROLE governance_worker WITH LOGIN PASSWORD 'dev_governance_worker_secret_123!';
    END IF;
END
$$;

-- 4. Grant the ingest role to the worker
GRANT governance_ingest_role TO governance_worker;
