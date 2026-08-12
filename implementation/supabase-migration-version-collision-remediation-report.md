# OPUS PUBLICA RC2 — MIGRATION VERSION COLLISION REMEDIATION REPORT

## 1. Original Collision
The local `supabase db reset` failed at `20260810_wp1701_outbox_retry.sql` with SQLSTATE 23505 `duplicate key value violates unique constraint "schema_migrations_pkey" Key (version)=(20260810) already exists`.

## 2. Why the Collision Occurred
The Supabase CLI determines a migration's unique version by parsing all leading digits from the filename. `20260810_wp1601_audit_reimplementation.sql` and `20260810_wp1701_outbox_retry.sql` both parse to identical version string `20260810`. Applying both locally violates the primary key constraint on the migration tracking table.

## 3. Proof Neither Version Was Applied Remotely
Queries via `npx supabase migration list` and direct reads from `supabase_migrations.schema_migrations` confirm that the remote history stops at `20260809000002`. Additionally, the remote database lacks the `audit_log_v2` and `outbox` tables entirely. Neither WP-16 nor WP-17 has ever been pushed.

## 4. Exact Rename Mapping
* `20260810_wp1601_audit_reimplementation.sql` → `20260810000000_wp1601_audit_reimplementation.sql`
* `20260810_wp1701_outbox_retry.sql` → `20260810000001_wp1701_outbox_retry.sql`

## 5. SQL-Content Integrity Check
The files were renamed using filesystem tracking. `git diff --stat` confirms exactly two rename operations with 0 bytes modified. The SQL contents remain 100% byte-for-byte identical.

## 6. Local Migration Sequence
The local sequence executed during reset was exactly:
```text
...
20260809000001_atomic_publish.sql
20260809000002_split_publish_rpc.sql
20260810000000_wp1601_audit_reimplementation.sql
20260810000001_wp1701_outbox_retry.sql
20260810025415_wp20_02_storage_manifest.sql
20260811_wp0101_submission_outbox.sql
20260811_wp0102_submission_domain_remediation.sql
```
Note that `20260810025415` executed *after* the renamed files, preserving local stability.

## 7. Local Reset Result
**FAILED (NEW ERROR)**

The reset successfully progressed past the WP-16/WP-17 collision, successfully executed WP-1601 and WP-1701, and executed WP-0101. It stopped at a new, unrelated failure:
* **Migration:** `20260811_wp0102_submission_domain_remediation.sql`
* **SQLSTATE:** 42P01
* **Error:** `ERROR: relation "public.user_roles" does not exist`

## 8. Local Migration-History Result
Not fully available since the reset crashed before completion, but the CLI output confirms WP-16 and WP-17 both successfully applied individually.

## 9. Remote Migration-List Result
Checked prior to rename; remote history does not contain either `20260810000000` or `20260810000001`.

## 10. Remote Dry-Run Result
Skipped because the local reset failed on WP-0102.

## 11. Whether Remote Push is Ready
**NO.** A remote push cannot be performed because the local migration chain is currently broken at WP-0102.

## 12. Protected-File Verification
Verified via `git status`. The only changes were the explicit renames of WP-1601 and WP-1701, and the previous drift remediation migration. All other WP-01, WP-02, and WP-03 migrations remain frozen and untampered.

## 13. Any New Blocker
A severe schema regression or drift in `20260811_wp0102_submission_domain_remediation.sql` where it attempts to define a policy referencing a `public.user_roles` table that does not exist. (Additionally, the `20260811` duplicate collision still exists and will surface once the schema error is fixed).
