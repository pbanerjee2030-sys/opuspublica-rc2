-- WP-16-02: Cryptographic Hash Chaining (Era 2 Transition)

-- 1. Schema Classification
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS canonical_version int;
UPDATE public.audit_log SET canonical_version = 1 WHERE canonical_version IS NULL;
ALTER TABLE public.audit_log ALTER COLUMN canonical_version SET DEFAULT 2;
ALTER TABLE public.audit_log ALTER COLUMN canonical_version SET NOT NULL;

-- 2. Sequence Column
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS chain_sequence bigint;
CREATE SEQUENCE IF NOT EXISTS public.audit_chain_seq;

-- 3. Canonical Serialization Functions
CREATE OR REPLACE FUNCTION public.canonical_string(val text) 
RETURNS text 
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
    IF val IS NULL THEN
        RETURN '-1:';
    ELSE
        RETURN octet_length(convert_to(val, 'UTF8'))::text || ':' || val;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.canonical_metadata(val jsonb) 
RETURNS text 
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
    v_result text := '';
    v_count int := 0;
    v_key text;
    v_value text;
BEGIN
    IF val IS NULL THEN
        RETURN '-1:';
    END IF;

    SELECT count(*) INTO v_count FROM jsonb_each_text(val);
    v_result := public.canonical_string(v_count::text);

    FOR v_key, v_value IN 
        SELECT key, value FROM jsonb_each_text(val) ORDER BY key ASC
    LOOP
        v_result := v_result || public.canonical_string(v_key) || public.canonical_string(v_value);
    END LOOP;

    RETURN v_result;
END;
$$;

-- 4. Direct Bypass Protection
CREATE OR REPLACE FUNCTION public.prevent_direct_audit_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF current_setting('opus_publica.audit_processing', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Direct insertion into audit_log is strictly prohibited. Use public.process_single_audit_event()';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_direct_audit_insert_trigger ON public.audit_log;
CREATE TRIGGER prevent_direct_audit_insert_trigger
BEFORE INSERT ON public.audit_log
FOR EACH ROW
EXECUTE FUNCTION public.prevent_direct_audit_insert();

-- 5. Chain Construction
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
    -- Acquire exclusive transaction-level advisory lock
    PERFORM pg_advisory_xact_lock(hashtext('audit_chain_lock'));

    SELECT * INTO v_event FROM public.outbox WHERE id = p_outbox_id AND status = 'pending' FOR UPDATE;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Determine preceding hash
    -- First, check for an existing Era 2 record
    SELECT audit_chain_hash INTO v_last_hash 
    FROM public.audit_log 
    WHERE canonical_version = 2
    ORDER BY chain_sequence DESC 
    LIMIT 1;

    IF v_last_hash IS NULL THEN
        -- No Era 2 records. Get transition anchor from Era 1.
        SELECT audit_chain_hash INTO v_last_hash
        FROM public.audit_log
        WHERE canonical_version = 1
        ORDER BY created_at DESC, id DESC
        LIMIT 1;
        
        IF v_last_hash IS NULL THEN
            -- Empty historical table. Genesis.
            v_last_hash := encode(digest('opus_publica_genesis', 'sha256'), 'hex');
        END IF;
    END IF;

    -- Canonical Hash construction
    v_hash_input := 
        public.canonical_string(v_event.id::text) ||
        public.canonical_string(NULLIF(v_event.payload->>'actor_id', '')) ||
        public.canonical_string(v_event.payload->>'action') ||
        public.canonical_string(v_event.payload->>'target_type') ||
        public.canonical_string(NULLIF(v_event.payload->>'target_id', '')) ||
        public.canonical_metadata(v_event.payload->'metadata') ||
        public.canonical_string(to_char(v_event.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) ||
        public.canonical_string(v_last_hash);
        
    v_new_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

    -- Prepare partitioning
    PERFORM public.ensure_audit_partition(v_event.created_at);

    -- Authorize insertion
    PERFORM set_config('opus_publica.audit_processing', 'true', true);

    -- Insert new Era 2 record
    INSERT INTO public.audit_log (
        id, actor_id, action, target_type, target_id, metadata, 
        audit_chain_hash, created_at, canonical_version, chain_sequence
    ) VALUES (
        v_event.id,
        NULLIF(v_event.payload->>'actor_id', '')::uuid,
        v_event.payload->>'action',
        v_event.payload->>'target_type',
        NULLIF(v_event.payload->>'target_id', '')::uuid,
        (v_event.payload->'metadata')::jsonb,
        v_new_hash,
        v_event.created_at,
        2,
        nextval('public.audit_chain_seq')
    );

    -- Clear authorization to minimize leakage within transaction
    PERFORM set_config('opus_publica.audit_processing', 'false', true);

    UPDATE public.outbox 
    SET status = 'completed', processed_at = now() 
    WHERE id = p_outbox_id;

    RETURN true;
END;
$$;

-- 6. Verifier
CREATE OR REPLACE FUNCTION public.verify_audit_chain()
RETURNS TABLE (
    era int,
    status text,
    total_records int,
    broken_link_id uuid,
    broken_link_hash text,
    expected_hash text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record record;
    v_expected_hash text;
    v_hash_input text;
    v_era1_count int := 0;
    v_era2_count int := 0;
BEGIN
    -- ERA 1 Verification
    FOR v_record IN 
        SELECT id FROM public.audit_log WHERE canonical_version = 1 ORDER BY created_at ASC, id ASC
    LOOP
        v_era1_count := v_era1_count + 1;
    END LOOP;
    
    IF v_era1_count > 0 THEN
        era := 1;
        status := 'HISTORICAL_UNVERIFIABLE';
        total_records := v_era1_count;
        broken_link_id := NULL;
        broken_link_hash := NULL;
        expected_hash := NULL;
        RETURN NEXT;
    END IF;

    -- Initialize Era 2 Genesis State (H0_ERA2)
    SELECT audit_chain_hash INTO v_expected_hash 
    FROM public.audit_log 
    WHERE canonical_version = 1 
    ORDER BY created_at DESC, id DESC 
    LIMIT 1;

    IF v_expected_hash IS NULL THEN
        v_expected_hash := encode(digest('opus_publica_genesis', 'sha256'), 'hex');
    END IF;

    -- ERA 2 Verification
    FOR v_record IN 
        SELECT * FROM public.audit_log WHERE canonical_version = 2 ORDER BY chain_sequence ASC
    LOOP
        v_era2_count := v_era2_count + 1;
        
        v_hash_input := 
            public.canonical_string(v_record.id::text) ||
            public.canonical_string(v_record.actor_id::text) ||
            public.canonical_string(v_record.action) ||
            public.canonical_string(v_record.target_type) ||
            public.canonical_string(v_record.target_id::text) ||
            public.canonical_metadata(v_record.metadata) ||
            public.canonical_string(to_char(v_record.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) ||
            public.canonical_string(v_expected_hash);
            
        v_expected_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

        IF v_record.audit_chain_hash != v_expected_hash THEN
            era := 2;
            status := 'CANONICAL_BROKEN';
            total_records := v_era2_count;
            broken_link_id := v_record.id;
            broken_link_hash := v_record.audit_chain_hash;
            expected_hash := v_expected_hash;
            RETURN NEXT;
            RETURN;
        END IF;
    END LOOP;

    era := 2;
    status := 'CANONICAL_VERIFIED';
    total_records := v_era2_count;
    broken_link_id := NULL;
    broken_link_hash := NULL;
    expected_hash := NULL;
    RETURN NEXT;
END;
$$;
