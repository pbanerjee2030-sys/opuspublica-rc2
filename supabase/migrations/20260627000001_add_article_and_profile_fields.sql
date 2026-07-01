-- Migration: Add fields for Google Scholar metadata indexing and user profiles
-- Created: 2026-06-27

-- 1. Add fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Add fields to articles table
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS abstract text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS published_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 3. Create article_authors junction table to support multiple authors per article
CREATE TABLE IF NOT EXISTS public.article_authors (
    article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, profile_id)
);

-- Enable RLS on article_authors
ALTER TABLE public.article_authors ENABLE ROW LEVEL SECURITY;

-- Policies for article_authors
DROP POLICY IF EXISTS "Allow public SELECT on article_authors" ON public.article_authors;
CREATE POLICY "Allow public SELECT on article_authors" ON public.article_authors
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admins and editors ALL on article_authors" ON public.article_authors;
CREATE POLICY "Allow admins and editors ALL on article_authors" ON public.article_authors
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    );

-- 4. Update trigger function to extract full_name and avatar_url on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_role user_role := 'author'::user_role;
    meta_role text;
    meta_journal text;
    assigned_journal uuid;
    meta_name text;
    meta_avatar text;
BEGIN
    -- Extract and validate role from user metadata
    meta_role := new.raw_user_meta_data->>'role';
    IF meta_role IS NOT NULL AND meta_role IN ('admin', 'editor', 'author') THEN
        default_role := meta_role::user_role;
    END IF;

    -- Extract and validate journal_id
    meta_journal := new.raw_user_meta_data->>'journal_id';
    IF meta_journal IS NOT NULL AND meta_journal ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        assigned_journal := meta_journal::uuid;
    END IF;

    -- Extract profile metadata
    meta_name := new.raw_user_meta_data->>'full_name';
    meta_avatar := new.raw_user_meta_data->>'avatar_url';

    INSERT INTO public.profiles (id, role, journal_id, full_name, avatar_url)
    VALUES (new.id, default_role, assigned_journal, meta_name, meta_avatar);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
