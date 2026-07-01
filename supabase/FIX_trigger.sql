-- FIX: Recreate the handle_new_user trigger to fix registration
-- Run this in Supabase Dashboard → SQL Editor → New Query

-- 1. Ensure user_role enum exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'editor', 'author');
    END IF;
END$$;

-- 2. Ensure profiles table has all required columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliation text;

-- 3. Ensure articles table has all required columns
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS abstract text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS doi text UNIQUE;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS published_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 4. Ensure article_authors table exists
CREATE TABLE IF NOT EXISTS public.article_authors (
    article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, profile_id)
);
ALTER TABLE public.article_authors ENABLE ROW LEVEL SECURITY;

-- 5. Recreate the trigger function (this is what's broken)
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
    meta_role := new.raw_user_meta_data->>'role';
    IF meta_role IS NOT NULL AND meta_role IN ('admin', 'editor', 'author') THEN
        default_role := meta_role::user_role;
    END IF;

    meta_journal := new.raw_user_meta_data->>'journal_id';
    IF meta_journal IS NOT NULL AND meta_journal ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        assigned_journal := meta_journal::uuid;
    END IF;

    meta_name := new.raw_user_meta_data->>'full_name';
    meta_avatar := new.raw_user_meta_data->>'avatar_url';

    INSERT INTO public.profiles (id, role, journal_id, full_name, avatar_url)
    VALUES (new.id, default_role, assigned_journal, meta_name, meta_avatar);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recreate the trigger binding
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
