-- Migration: Add ROR ID and Funder Registry fields
-- Created: 2026-07-04

-- 1. Add ror_id to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ror_id text;

-- 2. Add co_author_ror_id to article_authors table
ALTER TABLE public.article_authors ADD COLUMN IF NOT EXISTS co_author_ror_id text;

-- 3. Add funding columns to articles table
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS funder_name text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS funder_award_number text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS funder_id text;

-- 4. Update handle_new_user trigger function to capture affiliation and ror_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_role public.user_role := 'author'::public.user_role;
    meta_role text;
    meta_journal text;
    assigned_journal uuid;
    meta_name text;
    meta_avatar text;
    meta_orcid text;
    meta_affiliation text;
    meta_ror_id text;
BEGIN
    -- Extract and validate role from user metadata
    meta_role := new.raw_user_meta_data->>'role';
    IF meta_role IS NOT NULL AND meta_role IN ('admin', 'editor', 'author') THEN
        default_role := meta_role::public.user_role;
    END IF;

    -- Extract and validate journal_id
    meta_journal := new.raw_user_meta_data->>'journal_id';
    IF meta_journal IS NOT NULL AND meta_journal ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        assigned_journal := meta_journal::uuid;
    END IF;

    -- Extract profile metadata
    meta_name := new.raw_user_meta_data->>'full_name';
    meta_avatar := new.raw_user_meta_data->>'avatar_url';
    meta_orcid := new.raw_user_meta_data->>'orcid';
    meta_affiliation := new.raw_user_meta_data->>'affiliation';
    meta_ror_id := new.raw_user_meta_data->>'ror_id';

    INSERT INTO public.profiles (id, role, journal_id, full_name, avatar_url, email, orcid, affiliation, ror_id)
    VALUES (new.id, default_role, assigned_journal, meta_name, meta_avatar, new.email, meta_orcid, meta_affiliation, meta_ror_id);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
