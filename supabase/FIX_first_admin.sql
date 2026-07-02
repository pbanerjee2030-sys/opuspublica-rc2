-- ============================================
-- FIRST ADMIN BOOTSTRAP
-- ============================================
-- Run this ONCE in Supabase SQL Editor after:
-- 1. The first user has registered via /register
-- 2. MIGRATE_ALL.sql has been run
--
-- Replace 'your-email@institution.edu' with the
-- actual email of the user you want to make admin.
-- ============================================

-- Option 1: Promote by email (RECOMMENDED)
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@institution.edu'
);

-- Verify the change
SELECT p.id, p.full_name, p.role, u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin';
