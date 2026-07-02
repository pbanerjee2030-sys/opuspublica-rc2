# Opus Publica — Deploy Checklist

Follow these steps in order to deploy Opus Publica from scratch.

---

## Prerequisites

- [ ] Supabase project created (https://supabase.com)
- [ ] Vercel account linked to GitHub
- [ ] Crossref account with API credentials
- [ ] Resend account with API key (optional — falls back to console logging)

---

## Step 1: Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CROSSREF_EMAIL=your-email@institution.edu
CROSSREF_API_KEY=your-crossref-key
CROSSREF_PREFIX=10.57939
RESEND_API_KEY=re_your-resend-key
NEXT_PUBLIC_SITE_URL=https://www.opuspublica.com
```

---

## Step 2: Database Migration

1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/MIGRATE_ALL.sql`
3. Verify no errors
4. Run `supabase/schema.sql` (optional — for reference only)

---

## Step 3: Bootstrap First Admin

**This is required — the platform has no admin without it.**

1. Register the first user account at `/register`
2. Go to Supabase Dashboard → SQL Editor
3. Run `supabase/FIX_first_admin.sql`:
   - Replace `'your-email@institution.edu'` with the registered email
   - Execute the query
4. Verify by checking the `profiles` table — the user's `role` should be `'admin'`

---

## Step 4: Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Find the `publications` bucket
3. Set it to **Private** (not public)
4. This ensures unpublished manuscripts are only accessible via signed URLs

---

## Step 5: Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add all environment variables from Step 1
4. Deploy

---

## Step 6: Verify Deployment

1. Visit the live site
2. Check homepage loads with journal covers
3. Register a test account
4. Submit a test article
5. Login as admin at `/admin`
6. Approve the test article
7. Verify DOI minting works
8. Check email notifications (or console logs if Resend not configured)

---

## First Admin Bootstrap — Known Issue

**Problem:** Since `/api/admin/setup` requires an existing admin to call it, and there's no `/setup` page, the first admin must be created via SQL.

**Solution:** Run `supabase/FIX_first_admin.sql` after the first user registers.

**Future Improvement:** Consider adding a secure bootstrap mechanism (e.g., environment variable `FIRST_ADMIN_EMAIL` that auto-promotes on first login).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No admin exists" error | Run `FIX_first_admin.sql` |
| PDFs won't upload | Check `publications` bucket is private |
| Emails not sending | Add `RESEND_API_KEY` to `.env.local` |
| DOI minting fails | Verify Crossref credentials |
| RLS errors | Re-run `MIGRATE_ALL.sql` |

---

*Last updated: July 2, 2026*
