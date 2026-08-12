# OPUS PUBLICA RC2 — MIGRATION VERSION COLLISION FORENSIC REVIEW

## 1. Exact Root Cause
The Supabase CLI determines a migration's version by parsing all leading digits from the filename until it encounters a non-digit character (like `_`). The files `20260810_wp1601_...` and `20260810_wp1701_...` both evaluate to the identical version `20260810`. 

During `supabase db reset`, Supabase successfully applies WP-16 and records `20260810` in `supabase_migrations.schema_migrations`. When it attempts to apply WP-17, it tries to insert `20260810` again, causing a `duplicate key value violates unique constraint "schema_migrations_pkey"` error.

## 2. Exact Duplicate Versions
The duplicate version causing the immediate failure is `20260810`.

## 3. Full Local Migration Order
```text
...
20260809000001_atomic_publish.sql
20260809000002_split_publish_rpc.sql
20260810025415_wp20_02_storage_manifest.sql
20260810_wp1601_audit_reimplementation.sql
20260810_wp1701_outbox_retry.sql
20260811_wp0101_submission_outbox.sql
20260811_wp0102_submission_domain_remediation.sql
20260811_wp1602_crypto_hash_chain.sql
20260812_wp0201_review_outbox.sql
20260814000000_wp0301_decision_core.sql
20260815000000_wpgov_01_prep_resolver.sql
20260815000001_wpgov_01b_outbox_read.sql
```

## 4. Remote Migration History
Read-only queries to `npx supabase migration list` and `supabase_migrations.schema_migrations` confirm that the remote database migration history ends at `20260809000002`.

No migrations from `20260810025415` or `20260810` onwards have ever been applied to the remote production database.

## 5. Remote Schema State
The remote database contains the legacy `public.audit_log` table but does **not** contain `audit_log_v2` or `outbox`. 

This confirms **Scenario D**: Neither WP-16 nor WP-17 is actually present remotely, neither in migration history nor in schema state.

## 6. WP-16/WP-17 Dependency Relationship
* `20260810_wp1601_audit_reimplementation.sql` creates the `public.outbox` table.
* `20260810_wp1701_outbox_retry.sql` alters the `public.outbox` table by adding columns `retry_count` and `next_retry_at`.

Dependency Graph:
```text
WP-16
  ↓
WP-17
```
WP-17 strictly depends on WP-16.

## 7. Additional Duplicate Migration Versions
Inspection of the local directory reveals another massive collision cluster on `20260811`.

| Version  | Files                                |
| -------- | ------------------------------------ |
| 20260810 | wp1601, wp1701                       |
| 20260811 | wp0101, wp0102, wp1602               |

## 8. Strategy A-E Comparison

### Strategy A (Rename wp1701 to a unique timestamp after WP-16)
**Safe.** Since neither migration is recorded remotely, renaming the files to unique 14-digit timestamps (e.g., `20260810030000_...` and `20260810040000_...`) preserves the exact chronological execution order locally without impacting remote state.

### Strategy B (Rename wp1601 to a unique timestamp and preserve WP-17)
**Dangerous.** Renaming WP-16 to sort *after* WP-17 would reverse the execution order. WP-17 would attempt to alter the `outbox` table before WP-16 creates it, causing a crash.

### Strategy C (Merge WP-16 and WP-17)
**Undesirable.** While technically safe, it merges two logically distinct work packages into a single file, destroying the historical boundary between audit reimplementation and outbox retries.

### Strategy D (Migration-history repair)
**Irrelevant.** Neither migration exists remotely in the history table.

### Strategy E (Create a new compatibility migration)
**Irrelevant.** The issue is a filename parsing collision, not a database schema divergence.

## 9. Recommended Remediation Strategy
**Strategy A:** Rename WP-16, WP-17, and the WP-01/WP-16 duplicates in the `20260811` cluster. 
Provide each file with a strict, unique 14-digit timestamp (e.g., `YYYYMMDDHHMMSS`) that precisely preserves their current lexicographical sorting order.

## 10. Exact Safe Sequence for Implementation
1. `20260810025415_wp20_02_storage_manifest.sql` (Existing, unchanged)
2. `20260810030000_wp1601_audit_reimplementation.sql` (Renamed WP-1601)
3. `20260810040000_wp1701_outbox_retry.sql` (Renamed WP-1701)
4. `20260811010000_wp0101_submission_outbox.sql` (Renamed WP-0101)
5. `20260811020000_wp0102_submission_domain_remediation.sql` (Renamed WP-0102)
6. `20260811030000_wp1602_crypto_hash_chain.sql` (Renamed WP-1602)

## 11. Which Files May Eventually Be Renamed/Created
* `20260810_wp1601_audit_reimplementation.sql` -> rename
* `20260810_wp1701_outbox_retry.sql` -> rename
* `20260811_wp0101_submission_outbox.sql` -> rename
* `20260811_wp0102_submission_domain_remediation.sql` -> rename
* `20260811_wp1602_crypto_hash_chain.sql` -> rename

## 12. Which Files Must Remain Immutable
All migrations from `20260627000000` up to `20260810025415_wp20_02_storage_manifest.sql` are either applied remotely or have a safe unique prefix, and must remain completely immutable.

## 13. Exact Local Verification Steps
Run `npx supabase db reset` to confirm that the entire local migration chain succeeds without `schema_migrations_pkey` violations.

## 14. Exact Remote Verification Steps
Run `npx supabase db push --dry-run --include-all --linked` to verify that the newly renamed pending migrations cleanly target the remote database without conflicts.

## 15. Risk Analysis
Because **none** of the affected migrations (`20260810_...` or `20260811_...`) have ever been applied to the remote database, renaming them carries **zero risk** of disrupting Supabase's remote state tracking or double-applying SQL. The renames merely correct the filename metadata for the CLI parser before the migrations are ever formally deployed to production.
