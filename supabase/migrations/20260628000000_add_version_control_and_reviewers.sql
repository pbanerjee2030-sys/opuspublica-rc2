-- Migration: Add version control and reviewer assignments
-- Created: 2026-06-28

-- 1. Add version column to articles table
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- 2. Create article_versions table for version control
CREATE TABLE IF NOT EXISTS public.article_versions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
    version_number integer NOT NULL,
    pdf_url text NOT NULL,
    changelog text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on article_versions
ALTER TABLE public.article_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for article_versions
CREATE POLICY "Allow public SELECT on article_versions" ON public.article_versions
    FOR SELECT USING (true);

CREATE POLICY "Allow admins and editors ALL on article_versions" ON public.article_versions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    );

CREATE POLICY "Allow authors INSERT on own article versions" ON public.article_versions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.article_authors
            JOIN public.articles ON articles.id = article_authors.article_id
            WHERE article_authors.profile_id = auth.uid()
            AND article_versions.article_id = articles.id
        )
    );

-- 3. Create reviewer_assignments table
CREATE TABLE IF NOT EXISTS public.reviewer_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
    reviewer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    comments text,
    recommendation text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on reviewer_assignments
ALTER TABLE public.reviewer_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviewer_assignments
CREATE POLICY "Allow reviewers SELECT on own assignments" ON public.reviewer_assignments
    FOR SELECT TO authenticated
    USING (
        reviewer_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    );

CREATE POLICY "Allow admins and editors ALL on reviewer_assignments" ON public.reviewer_assignments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    );

CREATE POLICY "Allow reviewers UPDATE on own assignments" ON public.reviewer_assignments
    FOR UPDATE TO authenticated
    USING (reviewer_id = auth.uid())
    WITH CHECK (reviewer_id = auth.uid());

-- 4. Add bio and affiliation columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliation text;

-- 5. Add issn column to journals table
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS issn text;
