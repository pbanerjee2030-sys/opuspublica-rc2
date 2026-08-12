# OPUS PUBLICA RC2 — PUBLICATION MIGRATION REMEDIATION IMPLEMENTATION REPORT

## 1. Exact Migration Created
`supabase/migrations/20260703000000_formalize_schema_drift_cluster.sql`

## 2. Exact Objects Included
* Function: `public.get_user_role(user_id uuid)`
* Table: `public.editorial_board_members`
* Table: `public.audit_log`
* Column: `journals.peer_review_policy`
* Column: `article_authors.co_author_name`
* Column: `article_versions.content`
* Column: `article_versions.created_by`
* Constraints/Indexes: `article_authors.profile_id` DROP NOT NULL, PK removal, `article_authors_article_profile_unique`, `article_authors_has_identifier`
* RLS/Policies: Enabled on `editorial_board_members`, `audit_log`. Added missing policies to `editorial_board_members`, `audit_log`, `reviewer_assignments`, `article_versions`.
* Schema Corrections: Dropped `article_versions.pdf_url`.
* Index: Created 4 indexes on `audit_log`.

## 3. Mapping to Remediation Matrix
All objects included explicitly map 1:1 to the authorized remediation matrix in `implementation/supabase-migration-drift-remediation-architecture.md`. No unauthorized objects were included.

## 4. Security-Sensitive Objects
* `public.get_user_role` created with `SECURITY DEFINER` and `SET search_path TO 'public'` (Safe read-only context).
* RLS policies created using `DO` blocks to safely verify absence before injection.

## 5. Destructive Operation Classification
* `ALTER TABLE public.article_versions DROP COLUMN IF EXISTS pdf_url;`
* Classified as: CONDITIONAL / DESTRUCTIVE SCHEMA CORRECTION. Evaluated as safe solely because the remote database lacks this column and contains zero data.

## 6. Local Reset Result
**FAILED.**

The local `db reset` successfully applied the remediation migration and successfully progressed through all previously blocked migrations (e.g., `20260704000001_create_books.sql`, `20260723000000`, etc.). The drift cluster remediation was functionally successful.

However, the reset failed later on an unrelated, preexisting migration-history bug:
* **Exact migration:** `20260810_wp1701_outbox_retry.sql`
* **Exact SQLSTATE:** `23505` (unique_violation)
* **Exact missing object / error:** `Key (version)=(20260810) already exists.`
* **Part of approved scope?** NO. This is an existing flaw where WP-16 (`20260810_wp1601`) and WP-17 (`20260810_wp1701`) share the exact same version string (`20260810`), violating the `schema_migrations` primary key during reset.

## 7. Local Schema Verification
Skipped because local reset did not complete.

## 8. Remote Dry-Run Result
Skipped because local reset failed.

## 9. Remote Push Result
Not executed.

## 10. Protected-File Verification
Verified via `git status` and `git rev-parse HEAD`. No existing migration files were modified. The only new file is `20260703000000_formalize_schema_drift_cluster.sql`.

## 11. Separate `audit_logs` Historical Defect
As authorized, `audit_logs` (plural) references in `20260809000001_atomic_publish.sql` were ignored in the migration and are recorded here as an unresolved historical defect requiring a future fix.

## 12. Unresolved Issues
The duplicate version prefix `20260810` on the WP-16 and WP-17 migrations breaks `npx supabase db reset`. This must be corrected by renaming one of the files (e.g., to `20260810000001_...`) before a clean local reset can be achieved.
