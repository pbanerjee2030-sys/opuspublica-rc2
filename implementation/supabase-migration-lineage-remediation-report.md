# Supabase Migration Lineage Remediation Report

## 1. Original Drift
The original unformalized schema drift consisted of the `email` and `orcid` columns on `public.profiles`, and the `co_author_orcid` column on `public.article_authors`. These were manually applied to the remote database via out-of-band bootstrap scripts (`MIGRATE_ALL.sql`) but never checked in as timestamped migration files, breaking local database initializations when later migrations assumed their existence.

## 2. Immutability of Historical Migrations
Modifying `20260702000002_add_orcid_unique_constraint.sql` directly was strictly prohibited because it is already recorded as applied in the remote environment. Editing an applied migration breaks the cryptographic checksums tracked by Supabase's internal migration history table, leading to state corruption, failed deployments, and synchronization errors across the development team. 

## 3. Exact Corrective Migration
To resolve the dependency without modifying history, exactly one new idempotent injection migration was created:
`supabase/migrations/20260701000000_formalize_schema_drift.sql`
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS orcid text;

ALTER TABLE public.article_authors
ADD COLUMN IF NOT EXISTS co_author_orcid text;
```

## 4. Local Reset Result
**FAILED.**
The local migration chain successfully applied the new `20260701000000_formalize_schema_drift.sql` and seamlessly progressed past `20260702000002_add_orcid_unique_constraint.sql`, proving that the ORCID dependency is successfully resolved. 
However, `supabase start` subsequently aborted at `20260704000001_create_books.sql` with a new error:
`ERROR: function get_user_role(uuid) does not exist (SQLSTATE 42883)`. 
This indicates a second, independent instance of undocumented schema drift (the `get_user_role` function) exists further down the chain.

## 5. Exact Local Verification Results
Because `npx supabase start` hit a fatal error at `20260704000001_create_books.sql`, the Supabase CLI immediately spun down the local PostgreSQL container (`Stopping containers...`). Consequently, it is impossible to execute local schema queries (`npx supabase db query`) to verify the local schema state.

## 6. Remote Dry-Run Result
Executing `npx supabase db push --dry-run --linked` returned a fatal migration history divergence error:
```text
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
{"_tag":"Error","error":{"code":"LegacyDbPushMissingRemoteError","message":"Found local migration files to be inserted before the last migration on remote database.","suggestion":"Rerun the command with --include-all flag to apply these migrations:\nsupabase/migrations/20240810000000_storage_manifest.sql\nsupabase/migrations/20260701000000_formalize_schema_drift.sql"}}
```
The CLI detected that we are injecting chronological files *before* the latest applied migration.

## 7. Remote Push Result
**NOT EXECUTED.** 
In strict adherence to the authorized parameters ("If the CLI requires a history-related flag or `--include-all`, do NOT guess. Stop and report the exact output"), the push operation was aborted to prevent unintended consequences to the remote migration tracking system.

## 8. Remote Migration-List Result
The remote migration list remains unchanged since the push was aborted.

## 9. Remote Schema Verification
The remote schema remains unchanged since the push was aborted.

## 10. Protected-File Verification
Confirmed. No modifications were made to any existing migrations (including `20260702000002_add_orcid_unique_constraint.sql`), WP-01/WP-02/WP-03 migrations, Governance implementation, or application code. The only repository change was the creation of the authorized `20260701000000_formalize_schema_drift.sql` file.

## 11. Reproducibility
The Publication migration chain is **NOT** reproducible. The local reset is now blocked by `20260704000001_create_books.sql` (missing `get_user_role` function), and the remote push is blocked by a chronological history divergence error requiring the `--include-all` override.
