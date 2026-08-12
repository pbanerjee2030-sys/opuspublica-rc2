# OPUS PUBLICA RC2 — PUBLICATION MIGRATION DRIFT REMEDIATION ARCHITECTURE

## 1. Executive Decision

**MIGRATION REMEDIATION SPECIFICATION COMPLETE — IMPLEMENTATION AUTHORIZATION READY**

The undocumented migration drift introduced via `MIGRATE_ALL.sql` and `MIGRATE_ALL2.sql` is a heterogeneous mix of required schema foundations, historical defects, and legacy unreferenced columns. Directly injecting the entirety of `MIGRATE_ALL.sql` into the formal chain is unsafe because it conflicts with existing formal migrations (e.g., `article_versions`) and contains unreferenced columns that bloat the schema unnecessarily.

The approved remediation strategy is a **Chronological Injection of the Minimal Viable Subset**, placing a single consolidated corrective migration (`20260703000000_formalize_schema_drift_cluster.sql`) immediately before the first catastrophic downstream dependency (`20260704000001_create_books.sql`). 

This strategy preserves historical immutability, aligns the local `db reset` state with remote production, and achieves WP-01 readiness without modifying applied historical files.

## 2. Chronological Dependency Graph

```text
20260628000000_add_version_control_and_reviewers.sql
       ↓
(MIGRATE_ALL.sql out-of-band execution historically occurred here)
       ↓
[ INJECT: 20260703000000_formalize_schema_drift_cluster.sql ]
       ↓ (satisfies get_user_role)
20260704000001_create_books.sql 
       ↓ (satisfies editorial_board_members & peer_review_policy)
20260723000000_add_indexing_status_and_rename_peer_review.sql
       ↓ (satisfies legacy audit_log)
20260810_wp1601_audit_reimplementation.sql
       ↓ (satisfies co_author_name and profile_id nullability)
20260811_wp0101_submission_outbox.sql
```

**Chronology Verification:** `20260703000000` is genuinely early enough for every dependency. `get_user_role` requires a date strictly `< 20260704000001`, making `20260703` the latest possible safe date. It is historically accurate and completely safe to group the rest of the drift (e.g., `editorial_board_members` needed for `20260723`) into this same migration, as they were all injected simultaneously via `MIGRATE_ALL.sql` in production.

## 3. Complete Remediation Matrix

| Object | Type | Exact operation | Dependency | Why needed | Remote state | Safe no-op? |
| ------ | ---- | --------------- | ---------- | ---------- | ------------ | ----------- |
| `profiles.email` | Column | Handled in `20260701` | Application | Application lookup | Exists | Yes |
| `profiles.orcid` | Column | Handled in `20260701` | Application | Application lookup | Exists | Yes |
| `article_authors.co_author_orcid` | Column | Handled in `20260701` | `20260811` | WP-01 outbox logic | Exists | Yes |
| `get_user_role(uuid)` | Function | `CREATE OR REPLACE` | `20260704` | RLS on books | Exists | Yes |
| `editorial_board_members` | Table | `CREATE TABLE IF NOT EXISTS` | `20260723` | Downstream ALTER | Exists | Yes |
| `journals.peer_review_policy` | Column | `ADD COLUMN IF NOT EXISTS` | `20260723` | Downstream RENAME | Exists | Yes |
| `journals.issn`, etc. | Columns | Omit | None | Unreferenced legacy | Exists | N/A |
| `article_authors` PK | Constraint | `DROP CONSTRAINT IF EXISTS` | `20260811` | Nullable `profile_id` | Dropped | Yes |
| `article_authors.profile_id` | Column | `ALTER COLUMN DROP NOT NULL` | `20260811` | Nullable `profile_id` | Nullable | Yes |
| `article_authors.co_author_name` | Column | `ADD COLUMN IF NOT EXISTS` | `20260811` | WP-01 outbox logic | Exists | Yes |
| `article_authors_article_profile_unique` | Index | `CREATE UNIQUE INDEX IF NOT EXISTS` | `20260811` | Maintain integrity | Exists | Yes |
| `article_authors_has_identifier` | Constraint | `ADD CONSTRAINT` | `20260811` | Maintain integrity | Exists | Yes (via DO block) |
| `reviewer_assignments` Admin RLS | Policy | `CREATE POLICY` | None | Admin access | Exists | Yes (via DO block) |
| `article_versions.pdf_url` | Column | `DROP COLUMN IF EXISTS` | None | Remote parity | Missing | Yes |
| `article_versions.content`, `created_by` | Columns | `ADD COLUMN IF NOT EXISTS` | None | Remote parity | Exists | Yes |
| `audit_log` (legacy) | Table | `CREATE TABLE IF NOT EXISTS` | `20260810` | WP-16 archival | Exists | Yes |

## 4. Exact Content Resolutions

### 4.1 EDITORIAL_BOARD_MEMBERS — MANDATORY RESOLUTION

The exact historical definition to be formalized via `CREATE TABLE IF NOT EXISTS`:

* **Columns and Types:**
  * `id uuid DEFAULT gen_random_uuid()`
  * `journal_id uuid NOT NULL`
  * `full_name text NOT NULL`
  * `affiliation text`
  * `country text`
  * `role text DEFAULT 'Member'`
  * `photo_url text`
  * `orcid text`
  * `sort_order integer DEFAULT 0`
  * `created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL`
  * `updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL`
* **Primary Key:** `id`
* **Foreign Keys:** `journal_id REFERENCES public.journals(id) ON DELETE CASCADE`
* **Indexes:** PK implicit index only.
* **RLS:** `ENABLE ROW LEVEL SECURITY`
* **Policies:**
  * `"Allow public SELECT on editorial_board_members"` (`FOR SELECT USING (true)`)
  * `"Allow editors and admins ALL on editorial_board_members"` (`FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')))`)
* **Grants:** Default.
* **Dependencies:** `public.journals`, `public.profiles`.
* **First Formal Consumer:** `20260723000000_add_indexing_status_and_rename_peer_review.sql`

### 4.2 GET_USER_ROLE — MANDATORY COMPLETE DEFINITION

The exact verified historical definition to be formalized via `CREATE OR REPLACE FUNCTION`:

* **Signature:** `public.get_user_role(user_id uuid)`
* **Return Type:** `user_role`
* **Language:** `sql`
* **Function Body:** `SELECT role FROM public.profiles WHERE id = user_id;`
* **Security Mode:** `STABLE SECURITY DEFINER`
* **Search Path:** `SET search_path TO 'public'`
* **Referenced Tables:** `public.profiles`
* **Grants:** Default (`PUBLIC` execution).
* **Intended Callers:** RLS policies (e.g., `books`).
* **Security Status:** **SECURE.** The function performs a safe, read-only lookup. The `search_path` is correctly locked to prevent hijacking. The `SECURITY DEFINER` context is intentionally required to allow users to read their own roles during RLS evaluation without causing infinite recursion or permission denied errors on `profiles`. No security correction is required.

### 4.3 ARTICLE_VERSIONS — RESOLVE THE FORMAL/REMOTE CONFLICT

An explicit reconciliation confirms:

1. `pdf_url` does **NOT** exist remotely.
2. `content` **DOES** exist remotely.
3. `created_by` **DOES** exist remotely.
4. Remote count for `article_versions` is exactly **0**; no production data exists in `pdf_url` or any other column.
5. No application code references `pdf_url`.
6. No later migration references `pdf_url`.
7. `content` and `created_by` are not required by later code (unused by app/migrations).
8. Dropping `pdf_url` **IS** structurally necessary to make the local schema exactly match the canonical production truth.

**Classification:** **schema correction requiring explicit approval**. Because dropping a column created by a formal migration technically alters the explicit intent of that formal migration, it must be explicitly authorized. The operation is guaranteed non-destructive to data because no data exists.

### 4.4 AUDIT_LOG — MANDATORY RECONCILIATION

1. `public.audit_log` (singular) exists remotely (created by `MIGRATE_ALL.sql`).
2. The RC2 audit system and WP-16 use `audit_log`.
3. Legacy `audit_log` is structurally required for migration execution (`20260810_wp1601` expects to rename it).
4. `audit_logs` (plural) referenced in `20260809000001` (inside function `publish_article_atomic`) is an **outright bug** in WP-01/02 code.
5. **Resolution:** The remediation migration must ONLY create `audit_log` (the true historical schema). It must **NOT** create `audit_logs` merely to silence errors. The bug in `publish_article_atomic` will not crash `db reset` (Postgres parses but does not execute function bodies during creation) and must be formally corrected in a subsequent feature PR or hotfix migration, not via historical drift reconciliation.

## 5. EXACT MIGRATION CONTENT CONTRACT

The migration `20260703000000_formalize_schema_drift_cluster.sql` will perform:

**Section A — Functions**
* `CREATE OR REPLACE FUNCTION public.get_user_role`

**Section B — Tables**
* `CREATE TABLE IF NOT EXISTS public.editorial_board_members`
* `CREATE TABLE IF NOT EXISTS public.audit_log`

**Section C — Columns**
* `ADD COLUMN IF NOT EXISTS peer_review_policy` on `journals`
* `ADD COLUMN IF NOT EXISTS co_author_name` on `article_authors`
* `ADD COLUMN IF NOT EXISTS content` on `article_versions`
* `ADD COLUMN IF NOT EXISTS created_by` on `article_versions`

**Section D — Constraints/Indexes**
* `ALTER COLUMN profile_id DROP NOT NULL` on `article_authors`
* `DROP CONSTRAINT IF EXISTS article_authors_pkey` on `article_authors`
* `CREATE UNIQUE INDEX IF NOT EXISTS article_authors_article_profile_unique`
* `DROP CONSTRAINT IF EXISTS article_authors_has_identifier` on `article_authors` (wrapped in `DO` block)
* `ADD CONSTRAINT article_authors_has_identifier` on `article_authors` (wrapped in `DO` block)

**Section E — RLS/Policies**
* `ALTER TABLE ENABLE ROW LEVEL SECURITY` on `editorial_board_members`, `audit_log`
* `CREATE POLICY` (wrapped in `DO` blocks checking `pg_policies`) for `editorial_board_members`, `audit_log`, and `reviewer_assignments` (missing admin policy).

**Section F — Schema Corrections requiring explicit approval**
* `DROP COLUMN IF EXISTS pdf_url` on `article_versions`

## 6. REMOTE-SAFETY CLASSIFICATION

* **CREATE OR REPLACE FUNCTION (`get_user_role`):** **SAFE**. Idempotent and logically identical to remote.
* **CREATE TABLE IF NOT EXISTS (`editorial_board_members`, `audit_log`):** **SAFE**. Idempotent.
* **ADD COLUMN IF NOT EXISTS (`journals`, `article_authors`, `article_versions`):** **SAFE**. Idempotent.
* **DROP CONSTRAINT IF EXISTS / CREATE UNIQUE INDEX IF NOT EXISTS:** **SAFE**. Idempotent.
* **ALTER COLUMN DROP NOT NULL (`article_authors.profile_id`):** **CONDITIONAL**. Safe because remote data is already relaxed or compliant.
* **ADD CONSTRAINT (`article_authors_has_identifier`):** **CONDITIONAL**. Safe because remote data is compliant.
* **CREATE POLICY (RLS):** **SAFE**. Wrapped in idempotent `DO` block.
* **DROP COLUMN IF EXISTS (`article_versions.pdf_url`):** **DESTRUCTIVE**. Drops a column defined in a prior formal migration. **CONDITIONAL-SAFE** because remote verification proves the column does not exist and contains zero data. Requires explicit approval.

## 7. PROTECTED MIGRATION HISTORY

The following files are strictly **immutable** and MUST NOT be modified or repaired via `supabase migration repair`:
* Every existing applied historical migration.
* Especially `20260702000002_add_orcid_unique_constraint.sql`.
* Especially `20260704000001_create_books.sql`.
* Especially `20260723000000_add_indexing_status_and_rename_peer_review.sql`.
* WP-01, WP-02, WP-03, and WP-16 migrations.

## 8. REMOTE DEPLOYMENT PLAN

Before any remote write occurs, execute:
```powershell
npx supabase db push --dry-run --include-all --linked
```
The dry-run MUST be reviewed. `--include-all` is not inherently safe; it is utilized here strictly to bypass the `LegacyDbPushMissingRemoteError` caused by missing history table entries.

**STOP AND ABORT** if the dry-run proposes:
* Replay of previously applied migrations.
* Destructive operations (other than the approved `article_versions.pdf_url` drop).
* Migration-history rewrites or unexpected schema changes.

## 9. ROLLBACK / CONTAINMENT

* **Before remote application:** The local `20260703000000` migration is entirely reversible simply by deleting the file and running `db reset`.
* **After remote application:** `CREATE` and `ADD COLUMN` operations are generally reversible with a custom rollback migration. The `DROP COLUMN pdf_url` operation is technically irreversible without a backup if data existed, but verification proves zero data exists. 
* **Containment:** Because all commands use `IF NOT EXISTS` or `CREATE OR REPLACE`, applying them remotely to a database that already has them (the current production state) is a functional **no-op** that only updates the migration history table. No data loss is possible.
