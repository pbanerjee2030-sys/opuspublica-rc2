-- DIAGNOSTIC: Check trigger state and fix it
-- Run in Supabase Dashboard → SQL Editor → New Query

-- Step 1: Check if trigger function exists and show its source
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS full_definition
FROM pg_proc p
WHERE p.proname = 'handle_new_user';

-- Step 2: Check if trigger exists
SELECT 
    t.tgname AS trigger_name,
    t.tgenabled AS is_enabled,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
WHERE t.tgname = 'on_auth_user_created';

-- Step 3: Drop everything and recreate cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 4: Recreate with explicit column handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, role, full_name, avatar_url)
    VALUES (
        new.id,
        COALESCE(
            (new.raw_user_meta_data->>'role')::user_role, 
            'author'::user_role
        ),
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Bind trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Verify it works by creating a test user directly
-- (This uses the same mechanism as signup)
