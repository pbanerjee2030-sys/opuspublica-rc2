# OPUS PUBLICA RC2 — NEXT MIGRATION LINEAGE FORENSIC REVIEW

## PART I — USER_ROLES FORENSICS

### 1. Exact Dependency
In `20260811_wp0102_submission_domain_remediation.sql`, `public.user_roles` is referenced inside an RLS policy for the `public.submissions` table.
* **Exact SQL statement:** `SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'editor')`
* **Policy:** `CREATE POLICY "Admins can view all submissions" ON public.submissions FOR ALL USING ...`
* **Expected columns:** `user_id` (uuid), `role` (text).
* **Expected semantics:** Verifies if the current user has the 'admin' or 'editor' role.
* **Used for RLS:** Yes.
* **Used by a function:** No.
* **Object type:** Expected to be a table or view.

### 2. Formal Migration Creation
Searched the entire formal migration chain for `user_roles`. The table/view is **never formally created**. The reference in WP-01-02 is the only occurrence in all migrations.

### 3. Bootstrap / Drift Source
Searched `MIGRATE_ALL.sql`, `MIGRATE_ALL2.sql`, `schema.sql`, and all standalone SQL files. `user_roles` is **not present** in any historical, out-of-band, or drift source.

### 4. Remote Database
Queried the remote Supabase information schema. The `user_roles` table/view **does not exist** remotely.

### 5. Application Usage
Searched the entire application repository. There are **zero application references** to `user_roles`. Instead, the application and other migrations (such as `20260814000000_wp0301_decision_core.sql`) consistently use `public.profiles.role` for RBAC (e.g., `SELECT role FROM public.profiles WHERE id = ...`).

## PART II — MIGRATION VERSION COLLISION FORENSICS

### 6. Find All Duplicate Migration Versions
A complete scan of `supabase/migrations/` reveals exactly one remaining duplicate timestamp cluster: **20260811**.
This cluster actually contains **THREE** files that all parse to version `20260811`:
* `20260811_wp0101_submission_outbox.sql`
* `20260811_wp0102_submission_domain_remediation.sql`
* `20260811_wp1602_crypto_hash_chain.sql`

All other migrations have unique prefixes.

### 7. WP-01 / WP-01-02 Dependency
* **Dependency Order:** WP-01-01 relies on `outbox` and `articles` (legacy RPC `process_article_submission`). WP-01-02 introduces the `submissions` table and a new transition RPC. There is no strict schema dependency between the two files themselves (they operate on overlapping domains but don't strictly require one another to compile). However, logically, WP-01-01 should execute before WP-01-02.
* **Remote Schema:** The `submissions` table (created by WP-01-02) does not exist remotely.
* **Remote History:** Neither migration is applied remotely, nor are their effects present out-of-band.

## PART III — REMOTE HISTORY

### 8. Migration History
The remote migration history cleanly stops at `20260809000002`.
Version `20260811` does not exist remotely. Neither WP-01-01, WP-01-02, nor WP-16-02 is represented remotely.

## PART IV — SCHEMA RECONCILIATION

### 9. Determine Which Scenario Applies
* **For `user_roles`:** **Scenario D** (Reference itself is a historical bug). It was a hallucination/mistake when writing WP-01-02. It should have referenced `public.profiles.role`.
* **For WP-01/WP-01-02:** **Scenario E** (Neither migration applied remotely). All files under the `20260811` prefix are strictly unapplied local changes.

## PART V — REMEDIATION DESIGN ONLY

### 10. USER_ROLES Remediation
* **Exact Category:** **Historical migration correction**. Since WP-01-02 has never been applied to production (Scenario E), it is safe and correct to directly edit `20260811_wp0102_submission_domain_remediation.sql` to fix the bug (replacing the `user_roles` query with the standard `public.profiles` query).

### 11. 20260811 Version Collision Remediation
* **Recommended Strategy:** **Strategy A** (Rename to unique 14-digit versions preserving order). Because none of these three files are applied remotely, renaming them locally will not corrupt the remote tracking history.

## PART VI — ADDITIONAL DRIFT SCAN

### 12. Do Not Stop at USER_ROLES
Inspected migrations surrounding 20260811, 20260812, and 20260814.
* `20260811_wp1602_crypto_hash_chain.sql`: Dependencies (`audit_log`, `outbox`) are satisfied by WP-1601.
* `20260812_wp0201_review_outbox.sql`: Dependencies (`reviewer_assignments`, `outbox`) are satisfied.
* `20260814000000_wp0301_decision_core.sql`: Dependencies (`articles`, `profiles`, `reviewer_assignments`) are satisfied.
* `20260815000000_wpgov_01_prep_resolver.sql`: Dependencies (grants/revokes on existing RPCs) are satisfied.

No additional schema drift, missing tables, functions, or columns were detected. 

## PART VII — REQUIRED REPORT (Summary of Findings)

1. **Exact `user_roles` dependency:** Used in an RLS policy for `public.submissions` inside WP-01-02.
2. **Historical source of `user_roles`:** None. It is a bug/hallucinated reference.
3. **Remote schema state:** Neither `user_roles` nor `submissions` exists.
4. **Application usage:** None. App uses `public.profiles.role`.
5. **All remaining duplicate migration versions:** Only the `20260811` prefix, containing THREE files (`wp0101`, `wp0102`, `wp1602`).
6. **WP-01/WP-01-02 dependency relationship:** No strict schema coupling, but logically WP-01-01 precedes WP-01-02.
7. **Remote migration state for 20260811:** Does not exist remotely.
8. **Additional drift discovered:** None.
9. **Recommended remediation strategy:** 
   - Rename all three `20260811` files to unique 14-digit versions preserving order.
   - Edit WP-01-02 directly to replace `user_roles` with `profiles`.
10. **Exact chronological ordering for future corrections:**
    - `20260811000000_wp0101_submission_outbox.sql`
    - `20260811000001_wp0102_submission_domain_remediation.sql` (with bugfix applied)
    - `20260811000002_wp1602_crypto_hash_chain.sql`
11. **Files that may eventually change:** `20260811_wp0101`, `20260811_wp0102`, `20260811_wp1602` (via renaming and editing).
12. **Files that must remain frozen:** All prior migrations (WP-1601, WP-1701, WP-20-02, and all earlier numbered formal migrations) and later ones (WP-0201, WP-0301, WP-GOV-01).
