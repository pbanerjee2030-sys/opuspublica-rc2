-- COMPLETE MIGRATION: Run once in Supabase Dashboard > SQL Editor
-- Combines: missing tables, email column, co-author support, trigger update, ORCID
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS throughout

-- 1. Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 1b. Add ORCID column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS orcid text;

-- 2. Create reviewer_assignments table
CREATE TABLE IF NOT EXISTS public.reviewer_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
    reviewer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    recommendation text,
    comments text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create article_versions table
CREATE TABLE IF NOT EXISTS public.article_versions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
    version_number integer NOT NULL DEFAULT 1,
    content text,
    changelog text,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS on new tables
ALTER TABLE public.reviewer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_versions ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies before recreating (safe to re-run)
DROP POLICY IF EXISTS "Allow editors and admins ALL on reviewer_assignments" ON public.reviewer_assignments;
DROP POLICY IF EXISTS "Allow reviewers SELECT on own assignments" ON public.reviewer_assignments;
DROP POLICY IF EXISTS "Allow reviewers UPDATE on own assignments" ON public.reviewer_assignments;

-- 5b. RLS policies for reviewer_assignments
CREATE POLICY "Allow editors and admins ALL on reviewer_assignments" ON public.reviewer_assignments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Allow reviewers SELECT on own assignments" ON public.reviewer_assignments
    FOR SELECT TO authenticated
    USING (reviewer_id = auth.uid());

CREATE POLICY "Allow reviewers UPDATE on own assignments" ON public.reviewer_assignments
    FOR UPDATE TO authenticated
    USING (reviewer_id = auth.uid());

-- 6. Drop existing policies before recreating
DROP POLICY IF EXISTS "Allow public SELECT on article_versions" ON public.article_versions;
DROP POLICY IF EXISTS "Allow editors and admins ALL on article_versions" ON public.article_versions;

-- 6b. RLS policies for article_versions
CREATE POLICY "Allow public SELECT on article_versions" ON public.article_versions
    FOR SELECT USING (true);

CREATE POLICY "Allow editors and admins ALL on article_versions" ON public.article_versions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

-- 7. Fix article_authors for co-author names and ORCID
ALTER TABLE public.article_authors DROP CONSTRAINT IF EXISTS article_authors_pkey;
ALTER TABLE public.article_authors ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE public.article_authors ADD COLUMN IF NOT EXISTS co_author_name text;
ALTER TABLE public.article_authors ADD COLUMN IF NOT EXISTS co_author_orcid text;
CREATE UNIQUE INDEX IF NOT EXISTS article_authors_article_profile_unique
    ON public.article_authors (article_id, profile_id)
    WHERE profile_id IS NOT NULL;
ALTER TABLE public.article_authors
    DROP CONSTRAINT IF EXISTS article_authors_has_identifier;
ALTER TABLE public.article_authors
    ADD CONSTRAINT article_authors_has_identifier
    CHECK (profile_id IS NOT NULL OR co_author_name IS NOT NULL);

-- 8. Backfill email on existing profiles
UPDATE public.profiles SET email = auth.users.email
FROM auth.users WHERE profiles.id = auth.users.id AND profiles.email IS NULL;

-- 9. Update trigger to capture email and ORCID on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_role text := 'author';
    meta_role text;
    meta_journal text;
    assigned_journal uuid;
    meta_name text;
    meta_avatar text;
    meta_orcid text;
BEGIN
    meta_role := new.raw_user_meta_data->>'role';
    IF meta_role IS NOT NULL AND meta_role IN ('admin', 'editor', 'author') THEN
        default_role := meta_role;
    END IF;

    meta_journal := new.raw_user_meta_data->>'journal_id';
    IF meta_journal IS NOT NULL AND meta_journal ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        assigned_journal := meta_journal::uuid;
    END IF;

    meta_name := new.raw_user_meta_data->>'full_name';
    meta_avatar := new.raw_user_meta_data->>'avatar_url';
    meta_orcid := new.raw_user_meta_data->>'orcid';

    INSERT INTO public.profiles (id, role, journal_id, full_name, avatar_url, email, orcid)
    VALUES (new.id, default_role::user_role, assigned_journal, meta_name, meta_avatar, new.email, meta_orcid);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Add journal metadata columns for DOAJ/COPE applications
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS issn text;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS publisher text DEFAULT 'Advocacy Unified Network';
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS editorial_board text;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS aims_and_scope text;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS peer_review_policy text;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS license_type text DEFAULT 'CC BY 4.0';
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS license_url text;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS frequency text;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS subject_areas text[];
