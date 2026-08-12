-- Extension required for cryptographic hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Outbox Table
CREATE TABLE IF NOT EXISTS public.outbox (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON public.outbox(status);

-- 2. MOD-003: Non-Destructive Migration
-- Rename legacy audit_log to archive instead of dropping it
ALTER TABLE IF EXISTS public.audit_log RENAME TO audit_log_v1_archive;

-- 3. Create Partitioned Audit Log
CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id uuid,
    metadata jsonb,
    audit_chain_hash text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 4. MOD-002: Dynamic Partition Management
CREATE OR REPLACE FUNCTION public.ensure_audit_partition(target_date timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    partition_name text;
    start_date timestamp with time zone;
    end_date timestamp with time zone;
BEGIN
    -- Truncate date to month start
    start_date := date_trunc('month', target_date);
    end_date := start_date + interval '1 month';
    
    -- Format partition name, e.g., audit_log_2026_08
    partition_name := 'audit_log_' || to_char(start_date, 'YYYY_MM');

    -- Create partition if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
          AND n.nspname = 'public'
    ) THEN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.audit_log FOR VALUES FROM (%L) TO (%L);',
            partition_name, start_date, end_date
        );
    END IF;
END;
$$;

-- Create current month's partition manually to bootstrap
SELECT public.ensure_audit_partition(now());

-- 5. MOD-001: Concurrency Control via Advisory Locks
CREATE OR REPLACE FUNCTION public.process_single_audit_event(p_outbox_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event record;
    v_last_hash text;
    v_new_hash text;
    v_hash_input text;
BEGIN
    -- Acquire exclusive transaction-level advisory lock to serialize chain generation
    -- using a deterministic hash of 'audit_chain_lock'
    PERFORM pg_advisory_xact_lock(hashtext('audit_chain_lock'));

    -- Fetch the outbox event, ensuring it is pending
    SELECT * INTO v_event FROM public.outbox WHERE id = p_outbox_id AND status = 'pending' FOR UPDATE;
    IF NOT FOUND THEN
        RETURN false; -- Already processed or doesn't exist
    END IF;

    -- Fetch the last valid hash
    SELECT audit_chain_hash INTO v_last_hash 
    FROM public.audit_log 
    ORDER BY created_at DESC, id DESC 
    LIMIT 1;

    IF v_last_hash IS NULL THEN
        v_last_hash := 'genesis';
    END IF;

    -- Compute new SHA-256 hash
    -- Payload format needs to be deterministic. We cast jsonb to text.
    v_hash_input := v_event.payload::text || v_last_hash;
    v_new_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

    -- Ensure the partition for this event's timestamp exists
    PERFORM public.ensure_audit_partition(v_event.created_at);

    -- Insert into partitioned audit log
    INSERT INTO public.audit_log (
        id, actor_id, action, target_type, target_id, metadata, audit_chain_hash, created_at
    ) VALUES (
        v_event.id, -- map outbox id to audit id for traceability
        (v_event.payload->>'actor_id')::uuid,
        v_event.payload->>'action',
        v_event.payload->>'target_type',
        (v_event.payload->>'target_id')::uuid,
        (v_event.payload->'metadata')::jsonb,
        v_new_hash,
        v_event.created_at
    );

    -- Mark completed
    UPDATE public.outbox 
    SET status = 'completed', processed_at = now() 
    WHERE id = p_outbox_id;

    RETURN true;
END;
$$;

-- Re-apply RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin/editor SELECT on audit_log" ON public.audit_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log (created_at DESC);
