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
CROSSREF_PREFIX=10.62692
RESEND_API_KEY=re_your-resend-key
NEXT_PUBLIC_SITE_URL=https://www.opuspublica.com
```

---

## Step 2: Database Migration

**Authoritative migration chain:** `supabase/migrations/` is the SOLE source of truth
for the database schema (per `RC2_BASELINE.md` §2).

**DO NOT execute** `supabase/MIGRATE_ALL.sql`, `supabase/MIGRATE_ALL2.sql`, or
`supabase/schema.sql`. These are historical/forensic SQL files, NOT migration sources.

### Option A — Local development (Supabase CLI)

1. Install the Supabase CLI: `npm install -g supabase` (or `npx supabase`).
2. Start the local Supabase stack: `supabase start` (uses `supabase/config.toml`).
3. Reset + apply all migrations: `supabase db reset`.
4. Generate the Prisma client for the governance schema:
   `npx prisma generate --schema=governance/prisma/schema.prisma`.

### Option B — Remote Supabase project (staging/production)

1. Link the project: `supabase link --project-ref <your-project-ref>`.
2. Push the migration chain: `supabase db push` (applies new migrations only; does NOT reset).
3. Verify: `supabase migration list` (should show all migrations as Applied).
4. Generate the Prisma client: `npx prisma generate --schema=governance/prisma/schema.prisma`.

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

The `publications` bucket configuration (private access, allowed MIME types for PDF and DOCX, 15MB size limit) is handled automatically by the Supabase migrations. 

To verify (optional):
1. Go to Supabase Dashboard → Storage
2. Find the `publications` bucket
3. Verify it is set to **Private** (not public). This ensures unpublished manuscripts are only accessible via signed URLs.
4. Verify the "Allowed MIME types" include `application/pdf`, `application/msword`, and `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

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
| RLS errors | Run `supabase db reset` locally; check migration chain |

---

*Last updated: July 2, 2026*
