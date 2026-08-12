# Governance Database Provisioning Forensic Review

## 1. Forensic Statement
The `governance` PostgreSQL schema and its associated tables (e.g., `EventReceipt`, `CertificationResult`) are missing from the local development database after a clean `npx supabase db reset`. This prevents the WP-GOV-01A runtime certification from executing.

## 2. Root Cause Analysis
1. **Migration Isolation**: `npx supabase db reset` exclusively executes migrations located in `supabase/migrations/*.sql` and the `supabase/seed.sql` file.
2. **Missing Supabase Migration**: The approved specification (`wp-gov-01-engineering-specification.md`) mandated the creation of `supabase/migrations/YYYYMMDD_wp_gov_01a_governance_schema.sql` to explicitly provision the `governance` schema and core roles. This file does not exist in the `supabase/migrations/` directory.
3. **Misplaced DDL**: The implementer placed the DDL for the schema, the roles, and all the Governance tables inside a Prisma migration file: `governance/prisma/migrations/20260815000002_init_governance_schema.sql`.
4. **Missing Deployment Hook**: There is no script, lifecycle hook, or GitHub Action (e.g., in `package.json` or a separate `deploy.sh`) configured to execute `npx prisma migrate deploy --schema governance/prisma/schema.prisma` automatically after the Supabase database reset.

Therefore, because the migration file exists outside of the Supabase migration directory and no secondary migration runner is invoked, the database reset silently skips provisioning the entire Governance boundary.

## 3. Why the Roles and Resolver Exist
Post-reset inspection confirmed that `governance_ingest_role` and `public.governance_evidence_resolver` *do* exist. This occurs because their DDL was correctly placed in the `supabase/migrations/` directory during predecessor work packages:
- `supabase/migrations/20260815000000_wpgov_01_prep_resolver.sql` (Creates `governance_ingest_role` and `public.governance_evidence_resolver`)
- `supabase/migrations/20260815000001_wpgov_01b_outbox_read.sql` (Creates `governance_outbox_reader` and `governance_worker`)

These two files are successfully executed by `supabase db reset`, leaving the database partially provisioned.

## 4. Architectural Violation
The current implementation violates the `wp-gov-01-engineering-specification.md`:
- **Section 5.3 (File Permissions)** explicitly defined `- NEW: supabase/migrations/YYYYMMDD_wp_gov_01a_governance_schema.sql (governance schema + roles ONLY)`.
- The implementer inappropriately consolidated the schema creation, role creation, and table creation into a single Prisma migration file (`governance/prisma/migrations/20260815000002_init_governance_schema.sql`).

## 5. Proposed Correction Path
A correction is required to align the repository with the specification and enable deterministic provisioning:
1. **Move Migration**: Move `governance/prisma/migrations/20260815000002_init_governance_schema.sql` into the authoritative `supabase/migrations/` directory.
2. **Rename Migration**: Rename it to match the Supabase migration sequence (e.g., `20260815000002_wp_gov_01a_governance_schema.sql`).
3. **Clean Prisma Migrations**: Remove the `governance/prisma/migrations/` folder, as all authoritative migrations must flow through the Supabase toolchain to ensure a single source of truth for the database schema.
4. **Validate**: Run `npx supabase db reset` to confirm the `governance` schema and all tables are successfully created.

*(Note: Per the directive, NO correction has been implemented during this read-only forensic audit).*

## 6. Classification Status
**GOVERNANCE DATABASE PROVISIONING GAP IDENTIFIED — CORRECTION REQUIRED**
