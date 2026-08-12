# Supabase Migration Chain Forensic Review: ORCID Inconsistency

## 1. Executive Finding
The Supabase migration chain is genuinely broken. The `public.profiles.orcid` column is referenced by `20260702000002_add_orcid_unique_constraint.sql` but was never actually created in any preceding migration file. This failure is a repository inconsistency caused by historical drift, not a transient runtime glitch.

## 2. Exact Root Cause
Ad-hoc schema changes (including the creation of `orcid`) were implemented in unversioned bootstrap scripts (`MIGRATE_ALL.sql` and `MIGRATE_ALL2.sql`) instead of being formalized into the numbered `supabase/migrations/` directory. Consequently, chronological database initialization fails because the official migration chain skips the column creation entirely.

## 3. Migration-by-Migration Reconciliation
| Migration | Expected profile state | Actual SQL change | Result |
| --- | --- | --- | --- |
| 20260627000000 | Create profiles table | `CREATE TABLE profiles (id, role, journal_id, created_at, updated_at)` | Profiles table created. No `orcid`. |
| 20260627000001 | Add fields | `ALTER TABLE profiles ADD COLUMN full_name, avatar_url` | Fields added. No `orcid`. |
| 20260627000002 | Add DOI to articles | (None to profiles) | No `orcid`. |
| 20260628000000 | Add version control | `ALTER TABLE profiles ADD COLUMN bio, affiliation` | Fields added. No `orcid`. |
| 20260702000000 | Add DOI tracking | (None to profiles) | No `orcid`. |
| 20260702000001 | Add review scores | (None to profiles) | No `orcid`. |
| 20260702000002 | Add ORCID constraint | `CREATE UNIQUE INDEX ... ON public.profiles (orcid)` | ERROR: column "orcid" does not exist |

## 4. Exact Profile Schema Evolution
Before `20260702000002`, the exact schema of `public.profiles` established by the formal migration chain is:
- `id` (uuid)
- `role` (user_role)
- `journal_id` (uuid)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `full_name` (text)
- `avatar_url` (text)
- `bio` (text)
- `affiliation` (text)

The `orcid` column is demonstrably absent from the formal chain.

## 5. ORCID Migration Dependency
`20260702000002_add_orcid_unique_constraint.sql` executes:
`CREATE UNIQUE INDEX IF NOT EXISTS profiles_orcid_unique ON public.profiles (orcid) WHERE orcid IS NOT NULL;`
1. **Object expected:** `public.profiles`
2. **Column expected:** `orcid`
3. **Created earlier?** No.
4. **Created later?** No formal migration creates it, though `20260704000000_add_ror_and_funding.sql` attempts to insert into it.
5. **In `schema.sql`?** No.
6. **In `MIGRATE_ALL.sql`?** Yes (`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS orcid text;`).
7. **In `MIGRATE_ALL2.sql`?** Yes.
8. **Application code reliance?** Yes.

## 6. Application Dependency
Yes, production code heavily assumes `profiles.orcid` exists:
- `app/api/auth/orcid/callback/route.ts` invokes `.update({ orcid: orcidId })` and `.eq('orcid', orcidId)`.
- `lib/types.ts` defines `orcid: string | null` in the `Profile` interface.

## 7. schema.sql Comparison
`supabase/schema.sql` does NOT contain the `orcid` column. This indicates `schema.sql` is stale or was dumped from a local database that also had not run the ad-hoc scripts. 

## 8. MIGRATE_ALL.sql Comparison
`MIGRATE_ALL.sql` is an ad-hoc, unversioned script that explicitly contains:
`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS orcid text;`
This script contains critical schema changes that were completely omitted from the official `supabase/migrations/` folder.

## 9. MIGRATE_ALL2.sql Comparison
`MIGRATE_ALL2.sql` also contains the `orcid` column creation. It appears to be another iteration of the historical bootstrap script containing the same omitted columns.

## 10. First Migration Where Inconsistency Appears
The inconsistency manifests exactly at `20260702000002_add_orcid_unique_constraint.sql` because it is the first formal migration to reference the missing `orcid` column.

## 11. Historical Drift Evidence
The existence of `MIGRATE_ALL.sql` and `MIGRATE_ALL2.sql` containing the missing columns (`orcid`, `email`, `co_author_orcid`) strongly proves historical drift. Developers likely executed these ad-hoc scripts manually on the remote development database but failed to generate corresponding timestamped migration files for the repository, leaving the official migration chain permanently broken.

## 12. Required Categories of Correction
Without implementing them, resolving this will require:
1. Creating a retroactive or injection migration BEFORE `20260702000002` that officially adds the missing columns (`orcid`, `email`, `co_author_orcid`, etc.) omitted by `MIGRATE_ALL.sql`.
2. OR editing the historical migrations to include the missing column definitions (if rewriting history is permitted).
3. Updating `schema.sql` to accurately reflect the true state of the schema.

## 13. Protected-File Confirmation
Confirmed: No changes were made to any file. All protected boundaries (WP-01, WP-02, WP-03, Governance, Application code, Migration files) remain completely untouched.
