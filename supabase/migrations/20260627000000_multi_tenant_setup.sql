-- Migration: Upgrade Opus Publica to a multi-tenant academic platform
-- Created: 2026-06-27

-- 1. Create the Postgres enum user_role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'editor', 'author');
    END IF;
END$$;

-- 2. Create the journals table
CREATE TABLE IF NOT EXISTS public.journals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    cover_image text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on journals
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;

-- 3. Create the profiles table extending auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'author'::user_role,
    journal_id uuid REFERENCES public.journals(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create the articles table if it does not exist (for clean setup/bootstrap)
CREATE TABLE IF NOT EXISTS public.articles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update the existing articles table to include a journal_id foreign key referencing journals(id)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS journal_id uuid REFERENCES public.journals(id) ON DELETE CASCADE;

-- Enable Row Level Security (RLS) on articles
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- 5. Trigger to auto-create a profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_role user_role := 'author'::user_role;
    meta_role text;
    meta_journal text;
    assigned_journal uuid;
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

    INSERT INTO public.profiles (id, role, journal_id)
    VALUES (new.id, default_role, assigned_journal);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Row Level Security (RLS) Policies

-- --- JOURNALS POLICIES ---
-- Allow public read access to journals
CREATE POLICY "Allow public SELECT on journals" ON public.journals
    FOR SELECT USING (true);

-- Allow admin full access to journals
CREATE POLICY "Allow admin ALL on journals" ON public.journals
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'::user_role
        )
    );

-- Allow editors assigned to a specific journal to UPDATE that journal
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


-- --- PROFILES POLICIES ---
-- Allow public read access to user profiles
CREATE POLICY "Allow public SELECT on profiles" ON public.profiles
    FOR SELECT USING (true);

-- Allow admins full access to profiles
CREATE POLICY "Allow admins ALL on profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'::user_role
        )
    );


-- --- ARTICLES POLICIES ---
-- Requirement: Public users can only SELECT where status is 'published'
CREATE POLICY "Allow public SELECT on published articles" ON public.articles
    FOR SELECT
    USING (status = 'published');

-- Allow editors and admins to SELECT any article (including drafts)
CREATE POLICY "Allow editors and admins SELECT on all articles" ON public.articles
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    );

-- Requirement: INSERT actions require the authenticated user's role in the profiles table to be 'editor' or 'admin'
CREATE POLICY "Allow INSERT for editors and admins" ON public.articles
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    );

-- Requirement: UPDATE actions require the authenticated user's role in the profiles table to be 'editor' or 'admin'
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

-- Allow DELETE actions for editors and admins
CREATE POLICY "Allow DELETE for editors and admins" ON public.articles
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin'::user_role, 'editor'::user_role)
        )
    );
