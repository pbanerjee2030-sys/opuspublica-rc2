# Supabase Migration Drift Cluster Inventory

## 1. Executive Summary

A comprehensive read-only forensic search of `MIGRATE_ALL.sql` and `MIGRATE_ALL2.sql` compared against the formal migration chain (up to `20260704000001`) has revealed a **massive cluster of undocumented schema drift**. 

The initial discovery of missing columns (`orcid`, `email`) and missing dependencies (`get_user_role`, `editorial_board_members`) were not isolated incidents. Instead, they are symptoms of a broader pattern where a large set of tables, columns, constraints, and Row Level Security (RLS) policies were injected directly into the remote database via out-of-band bootstrap scripts (`MIGRATE_ALL.sql` / `MIGRATE_ALL2.sql`) without ever being codified in the version-controlled `supabase/migrations/` directory.

Because the formal migration chain depends on these undocumented schema elements, any attempt to perform a clean `supabase db reset` locally will inevitably crash when historical migrations reference objects that the formal chain never created.

## 2. Cluster Inventory

The following schema objects were created or modified by the out-of-band `MIGRATE_ALL.sql` / `MIGRATE_ALL2.sql` scripts but are completely missing from (or conflict with) the formal numbered migrations prior to `20260704000001`.

### Tables and Functions
1. **`public.get_user_role(uuid)`**
   - Missing entirely from the formal chain.
   - Required by `20260704000001_create_books.sql` for RLS policies.
2. **`public.editorial_board_members`**
   - The entire table, its foreign keys, and RLS policies are missing.
   - Required by `20260723000000_add_indexing_status_and_rename_peer_review.sql` (which assumes it exists and adds a `country` column).
3. **`public.audit_log`**
   - The original v1 table definition, along with its RLS policies and 4 indexes, are missing from the early chain.
   - Technically "required" by `20260810_wp1601_audit_reimplementation.sql` (which attempts to rename it to `archive`, though `IF EXISTS` allows it to silently pass). 
   - A bug in `20260809000001` and `20260809000002` references `audit_logs` (plural) which does not exist remotely.

### Missing Columns on Existing Tables
4. **`public.journals` metadata columns**
   - Missing 9 columns: `issn`, `publisher`, `editorial_board`, `aims_and_scope`, `peer_review_policy`, `license_type`, `license_url`, `frequency`, `subject_areas`.
   - `peer_review_policy` is later assumed to exist by `20260723000000` (which renames it to `peer_review_process`).

### Structural Alterations and Constraints
5. **`public.article_authors` structural changes**
   - The `article_authors_pkey` constraint drop is missing.
   - The `profile_id DROP NOT NULL` alteration is missing.
   - Missing columns: `co_author_name`. (Note: `co_author_orcid` was formalized in `20260701000000`).
   - Missing unique index: `article_authors_article_profile_unique`.
   - Missing check constraint: `article_authors_has_identifier`.
   - These structural changes are assumed to exist by `20260811_wp0101_submission_outbox.sql`.

### RLS Policy Conflicts
6. **`public.reviewer_assignments`**
   - `MIGRATE_ALL.sql` adds an overriding policy for admins/editors: `"Allow editors and admins ALL on reviewer_assignments"`. This policy is missing from the formal `20260628000000` migration.
7. **`public.article_versions` schema and policy drift**
   - `MIGRATE_ALL.sql` defines the table with `content` and `created_by` columns, whereas the formal `20260628000000` migration defines it with a `pdf_url` column instead.
   - The remote database matches the `MIGRATE_ALL.sql` definition (no `pdf_url`).
   - `MIGRATE_ALL.sql` policies (`"Allow editors and admins ALL on article_versions"`, `"Allow public SELECT on article_versions"`) are missing from the formal chain.

## 3. Root Cause Analysis

The root cause of this massive cluster of drift is the historical use of `MIGRATE_ALL.sql` and `MIGRATE_ALL2.sql` as "live-patching" bootstrap scripts. 

Rather than generating sequential `supabase migration new` files for incremental schema changes, early engineers consolidated a large batch of features (email, ORCID, article versions, editorial boards, reviewer assignments, journal metadata, audit logs) into massive ad-hoc SQL scripts. These scripts were manually executed via the Supabase Dashboard SQL Editor (as explicitly instructed in their comments: `-- COMPLETE MIGRATION: Run once in Supabase Dashboard > SQL Editor`). 

Because they utilized `IF NOT EXISTS` and `CREATE OR REPLACE`, they could be re-run safely in production, but they fundamentally bypassed Supabase's local migration history tracking. When subsequent formal migrations (`20260704000001`, `20260723000000`, etc.) were authored, they were written against a remote database that contained all the `MIGRATE_ALL.sql` objects. 

When a clean `db reset` is attempted locally, it replays only the numbered files in `supabase/migrations/`. Because `MIGRATE_ALL.sql` is never executed during a reset, the local schema diverges from the remote schema, causing all downstream migrations that rely on the out-of-band objects to instantly fail.

## 4. Recommended Remediation Strategy

Given the sheer volume of undocumented schema drift, injecting a single new formal migration for each missing object would be tedious and risky. However, because all of this drift originated from the consolidated `MIGRATE_ALL.sql` / `MIGRATE_ALL2.sql` scripts, we can safely consolidate the remediation.

**Recommended Strategy: Chronological Injection of a Consolidated "Formalize Drift" Migration**

1. Create a single, highly-idempotent migration chronologically injected just before the first failure (e.g., `20260703000000_formalize_migrate_all_drift.sql`).
2. This migration should contain the exact `IF NOT EXISTS` / `OR REPLACE` DDL statements extracted directly from `MIGRATE_ALL.sql` (excluding items that were already correctly formalized, such as the initial table creations in `20260628000000`).
3. This ensures that a local `db reset` will execute these definitions, matching the remote production state exactly, and allowing all subsequent migrations (`20260704000001`, `20260723000000`, etc.) to succeed locally.
4. Because this injected file will trigger Supabase's CLI history divergence safeguard (`LegacyDbPushMissingRemoteError`), a controlled `supabase db push --include-all` must be carefully authorized to sync the formal tracked history with the remote instance without destroying existing production data.
