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

-- 4. Update handle_new_user trigger function to capture affiliation and ror_id dynamically.
-- This dynamic approach prevents runtime errors if migration columns are missing.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_role user_role := 'author'::user_role;
    meta_role text;
    meta_journal text;
    assigned_journal uuid;
    meta_name text;
    meta_avatar text;
    meta_orcid text;
    meta_affiliation text;
    meta_ror_id text;
    cols text[] := ARRAY['id', 'role'];
    vals text[] := ARRAY['$1', '$2'];
    query_str text;
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
        cols := array_append(cols, 'journal_id');
        vals := array_append(vals, '$3');
    END IF;

    -- Extract profile metadata
    meta_name := new.raw_user_meta_data->>'full_name';
    IF meta_name IS NOT NULL THEN
        cols := array_append(cols, 'full_name');
        vals := array_append(vals, '$4');
    END IF;

    meta_avatar := new.raw_user_meta_data->>'avatar_url';
    IF meta_avatar IS NOT NULL THEN
        cols := array_append(cols, 'avatar_url');
        vals := array_append(vals, '$5');
    END IF;

    -- Check and handle email column if it exists in profiles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
        cols := array_append(cols, 'email');
        vals := array_append(vals, '$6');
    END IF;

    -- Check and handle orcid column if it exists in profiles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'orcid') THEN
        meta_orcid := new.raw_user_meta_data->>'orcid';
        IF meta_orcid IS NOT NULL THEN
            cols := array_append(cols, 'orcid');
            vals := array_append(vals, '$7');
        END IF;
    END IF;

    -- Check and handle affiliation column if it exists in profiles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'affiliation') THEN
        meta_affiliation := new.raw_user_meta_data->>'affiliation';
        IF meta_affiliation IS NOT NULL THEN
            cols := array_append(cols, 'affiliation');
            vals := array_append(vals, '$8');
        END IF;
    END IF;

    -- Check and handle ror_id column if it exists in profiles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'ror_id') THEN
        meta_ror_id := new.raw_user_meta_data->>'ror_id';
        IF meta_ror_id IS NOT NULL THEN
            cols := array_append(cols, 'ror_id');
            vals := array_append(vals, '$9');
        END IF;
    END IF;

    query_str := 'INSERT INTO public.profiles (' || 
                 array_to_string(cols, ', ') || 
                 ') VALUES (' || 
                 array_to_string(vals, ', ') || 
                 ')';
                 
    EXECUTE query_str USING 
        new.id, 
        default_role, 
        assigned_journal, 
        meta_name, 
        meta_avatar, 
        new.email, 
        meta_orcid, 
        meta_affiliation, 
        meta_ror_id;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
