-- Opus Publica Database Schema
-- Last Updated: 2026-06-27

-- --- ENUMS ---

-- Postgres enum for managing multi-tenant roles
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'author');


-- --- TABLES ---

-- 1. Journals Table
CREATE TABLE public.journals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    cover_image text,
    issn text,
    publisher text DEFAULT 'Advocacy Unified Network',
    editorial_board text,
    aims_and_scope text,
    peer_review_policy text,
    license_type text DEFAULT 'CC BY 4.0',
    license_url text,
    frequency text,
    subject_areas text[],
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'author'::user_role,
    journal_id uuid REFERENCES public.journals(id) ON DELETE SET NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Articles Table
CREATE TABLE public.articles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text,
    status text NOT NULL DEFAULT 'draft',
    journal_id uuid REFERENCES public.journals(id) ON DELETE CASCADE,
    abstract text,
    pdf_url text,
    doi text UNIQUE,
    published_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Article Authors Junction Table
CREATE TABLE public.article_authors (
    article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, profile_id)
);


-- --- TRIGGERS ---

-- Auto-create profile on user signup
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

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- --- ROW LEVEL SECURITY (RLS) POLICIES ---

-- Enable RLS on all tables
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_authors ENABLE ROW LEVEL SECURITY;

-- 1. Journals Policies
CREATE POLICY "Allow public SELECT on journals" ON public.journals
    FOR SELECT USING (true);

CREATE POLICY "Allow admin ALL on journals" ON public.journals
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'::user_role
        )
    );

CREATE POLICY "Allow assigned editors UPDATE on journals" ON public.journals
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'editor'::user_role
            AND profiles.journal_id = journals.id
        )
    );

-- 2. Profiles Policies
CREATE POLICY "Allow public SELECT on profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow admins ALL on profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'::user_role
        )
    );

-- 3. Articles Policies
-- Public read access for published articles only
CREATE POLICY "Allow public SELECT on published articles" ON public.articles
    FOR SELECT
    USING (status = 'published');

-- Admin and editor read access for all articles (drafts and published)
CREATE POLICY "Allow editors and admins SELECT on all articles" ON public.articles
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    );

-- Write/Modify policies restricted to editors and admins
CREATE POLICY "Allow INSERT for editors and admins" ON public.articles
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    );

CREATE POLICY "Allow UPDATE for editors and admins" ON public.articles
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    );

CREATE POLICY "Allow DELETE for editors and admins" ON public.articles
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    );

-- 4. Article Authors Policies
CREATE POLICY "Allow public SELECT on article_authors" ON public.article_authors
    FOR SELECT USING (true);

CREATE POLICY "Allow admins and editors ALL on article_authors" ON public.article_authors
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    );
