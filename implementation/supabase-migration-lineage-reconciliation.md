# Supabase Migration Lineage Reconciliation

## 1. Exact Root Cause
The root cause of the local initialization failure is unformalized schema drift introduced via out-of-band bootstrap scripts (`MIGRATE_ALL.sql` and `MIGRATE_ALL2.sql`). Developers successfully applied these scripts against the remote/production database—thus creating `orcid`, `email`, and `co_author_orcid`—but failed to extract these changes into timestamped `.sql` files within the `supabase/migrations/` directory. 

When a later formal migration (`20260702000002_add_orcid_unique_constraint.sql`) correctly assumed the remote presence of `orcid`, it cemented a dependency on this undocumented drift. A clean `supabase start` or `db reset` locally fails because the local engine strictly follows the formally tracked `.sql` files, which completely omit the column creation step.

## 2. Exact Schema Drift
The exact definitions from `MIGRATE_ALL.sql` that were never committed to the official migration chain are:
* `public.profiles.orcid`: `text` (Added via `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS orcid text;`)
* `public.profiles.email`: `text` (Added via `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;`)
* `public.article_authors.co_author_orcid`: `text` (Added via `ALTER TABLE public.article_authors ADD COLUMN IF NOT EXISTS co_author_orcid text;`)

All three are nullable `text` columns without default constraints, unique constraints, or foreign keys in the originating script.

## 3. Local Migration State
The local database container (`supabase_db_opuspublica`) does not currently exist or failed to initialize (`Error response from daemon: No such container`). The local migration chain aborted abruptly at `20260702000002_add_orcid_unique_constraint.sql`, preventing a viable local PostgreSQL instance from materializing.

## 4. Remote Migration History
The remote database is successfully linked and responds to `npx supabase migration list`. The history confirms that `20260702000002_add_orcid_unique_constraint.sql` (and subsequent migrations up to `20260815000001`) are recorded as applied remotely.

## 5. Remote Schema State
The remote schema has been queried and confirmed to contain the drifted columns and indexes:
* `public.profiles.email` exists (`text`)
* `public.profiles.orcid` exists (`text`)
* `public.article_authors.co_author_orcid` exists (`text`)
* `profiles_orcid_unique` index exists (`CREATE UNIQUE INDEX profiles_orcid_unique ON public.profiles USING btree (orcid) WHERE (orcid IS NOT NULL)`)

## 6. Four-State Comparison
| Schema element | Numbered migrations | MIGRATE_ALL | MIGRATE_ALL2 | Current remote schema |
| :--- | :--- | :--- | :--- | :--- |
| `profiles.orcid` | Absent | Present | Present | Present |
| `profiles.email` | Absent | Present | Present | Present |
| `article_authors.co_author_orcid` | Absent | Present | Present | Present |
| ORCID unique index | Present (`20260702000002`) | Absent | Absent | Present |

## 7. Historical Migration Safety Assessment
Because `20260702000002_add_orcid_unique_constraint.sql` is formally recorded as applied remotely, modifying this specific file is fundamentally unsafe. In Supabase, altering an already-applied historical migration violates migration integrity, corrupts remote state tracking, and triggers checksum mismatch errors. The historical migration must remain immutable. 

We are in **Scenario A**: The remote database contains the schema changes AND `20260702000002` is recorded applied. The required correction category is an **idempotent injection** into the timeline prior to the failure point.

## 8. Strategy A-D Comparison
* **Strategy A: Modify the historical ORCID migration to include the missing columns.**
  * Local reset reproducibility: Yes.
  * Remote safety: Highly dangerous (alters applied history, invalidates checksums).
  * History integrity: Breaks immutability.
* **Strategy B: Create a new canonical migration that formalizes the missing columns.**
  * Local reset reproducibility: No. Adding a new migration *after* `20260702000002` will not prevent a `db reset` from crashing when it sequentially hits `20260702000002`.
  * Remote safety: Safe.
  * History integrity: Preserved.
* **Strategy C: Use migration-history repair**
  * Local reset reproducibility: No. Repairing remote tracking does not fix the local `.sql` files that fail upon sequential execution during `db reset`.
* **Strategy D: Create a controlled baseline/injection migration.**
  * Local reset reproducibility: Yes. The missing columns are created *before* the constraint migration requires them.
  * Remote safety: High. By using `IF NOT EXISTS` for the columns, applying this injected migration to the remote database (which already has them) will be a safe no-op.
  * History integrity: Preserves existing applied migrations.
  * Production risk: Very low.

## 9. Recommended Remediation Strategy
**Strategy D: Create a controlled, idempotent injection migration.**
We will create a new, chronologically injected migration file (e.g., `20260701000000_formalize_schema_drift.sql`) placed immediately prior to the failing constraint migration. This migration will use `IF NOT EXISTS` to safely define `email`, `orcid`, and `co_author_orcid`.

This strategy guarantees:
1. `fresh clone → supabase start/reset → complete migration chain` will successfully complete locally.
2. The remote database (which already possesses these columns) will treat the injection as a harmless no-op upon `supabase db push`.

## 10. Exact Implementation Sequence
1. Create `supabase/migrations/20260701000000_formalize_schema_drift.sql`.
2. Add the following idempotent DDL:
   ```sql
   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS orcid text;
   ALTER TABLE public.article_authors ADD COLUMN IF NOT EXISTS co_author_orcid text;
   ```
3. Run `npx supabase db reset` locally to verify the chain executes flawlessly.
4. Run `npx supabase db push` to synchronize the new migration record with the remote database (which will silently succeed).

## 11. Allowed Changes
* `supabase/migrations/` (Only the newly created `20260701000000_formalize_schema_drift.sql`)

## 12. Must Remain Frozen
* ALL existing numbered migrations (including `20260702000002_add_orcid_unique_constraint.sql`)
* WP-01 / WP-02 / WP-03 migrations
* Governance implementation
* Application code
* ORCID routes

## 13. Exact Verification Steps
1. Execute `npx supabase db reset`. Ensure it completes without SQL errors.
2. Execute `npx supabase db query "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'orcid';"` against the local database to verify column existence.
3. Execute `npx supabase db push`. Ensure remote acceptance without destructive side-effects.
