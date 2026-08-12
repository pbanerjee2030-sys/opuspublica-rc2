-- OPUS PUBLICA RC2: DRIFT CLUSTER REMEDIATION

-- Section A — Functions
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = user_id;
$function$;

-- Section B — Tables
CREATE TABLE IF NOT EXISTS public.editorial_board_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_id uuid REFERENCES public.journals(id) ON DELETE CASCADE NOT NULL,
    full_name text NOT NULL,
    affiliation text,
    country text,
    role text DEFAULT 'Member',
    photo_url text,
    orcid text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Section C — Columns
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS peer_review_policy text;
ALTER TABLE public.article_authors ADD COLUMN IF NOT EXISTS co_author_name text;
ALTER TABLE public.article_versions ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.article_versions ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Section D — Constraints/Indexes
ALTER TABLE public.article_authors DROP CONSTRAINT IF EXISTS article_authors_pkey;
ALTER TABLE public.article_authors ALTER COLUMN profile_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS article_authors_article_profile_unique
    ON public.article_authors (article_id, profile_id)
    WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log (created_at DESC);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'article_authors_has_identifier'
        AND table_name = 'article_authors'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.article_authors DROP CONSTRAINT article_authors_has_identifier;
    END IF;
    ALTER TABLE public.article_authors
        ADD CONSTRAINT article_authors_has_identifier
        CHECK (profile_id IS NOT NULL OR co_author_name IS NOT NULL);
END $$;

-- Section E — RLS/Policies
ALTER TABLE public.editorial_board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Allow public SELECT on editorial_board_members' 
        AND tablename = 'editorial_board_members'
    ) THEN
        CREATE POLICY "Allow public SELECT on editorial_board_members" ON public.editorial_board_members
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Allow editors and admins ALL on editorial_board_members' 
        AND tablename = 'editorial_board_members'
    ) THEN
        CREATE POLICY "Allow editors and admins ALL on editorial_board_members" ON public.editorial_board_members
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN ('admin', 'editor')
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Allow admin/editor SELECT on audit_log' 
        AND tablename = 'audit_log'
    ) THEN
        CREATE POLICY "Allow admin/editor SELECT on audit_log" ON public.audit_log
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN ('admin', 'editor')
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Allow editors and admins ALL on reviewer_assignments' 
        AND tablename = 'reviewer_assignments'
    ) THEN
        CREATE POLICY "Allow editors and admins ALL on reviewer_assignments" ON public.reviewer_assignments
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN ('admin', 'editor')
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Allow public SELECT on article_versions' 
        AND tablename = 'article_versions'
    ) THEN
        CREATE POLICY "Allow public SELECT on article_versions" ON public.article_versions
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Allow editors and admins ALL on article_versions' 
        AND tablename = 'article_versions'
    ) THEN
        CREATE POLICY "Allow editors and admins ALL on article_versions" ON public.article_versions
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN ('admin', 'editor')
                )
            );
    END IF;
END $$;

-- Section F — Compatibility corrections
-- CONDITIONAL / DESTRUCTIVE SCHEMA CORRECTION
-- Remote production article_versions does not contain pdf_url and contains zero rows. 
-- Dropping this column aligns local with the canonical truth without data loss.
ALTER TABLE public.article_versions DROP COLUMN IF EXISTS pdf_url;
