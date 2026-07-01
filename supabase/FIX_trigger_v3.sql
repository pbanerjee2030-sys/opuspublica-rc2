-- COMPLETE FIX: Columns + Trigger
-- Run in: https://supabase.com/dashboard/project/pnrmsxowlquoifhhfeom/sql/new

-- 1. Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliation text;

-- 2. Add missing columns to articles
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS abstract text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS doi text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS published_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 3. Ensure user_role enum exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'editor', 'author');
    END IF;
END$$;

-- 4. Nuke old trigger and function completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 5. Create simplest possible trigger function
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, role, full_name, avatar_url)
    VALUES (
        new.id,
        'author'::user_role,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Bind trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Verify: this should return 1 row with the trigger info
SELECT t.tgname, t.tgenabled
FROM pg_trigger t
WHERE t.tgname = 'on_auth_user_created';
