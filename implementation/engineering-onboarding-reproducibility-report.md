# RC2 Engineering Onboarding Reproducibility Report

## 1. Repository Integrity
- **origin**: `https://github.com/pbanerjee2030-sys/opuspublica.git`
- **rc2**: `https://github.com/pbanerjee2030-sys/opuspublica-rc2.git`
- **branch**: `main`
- **HEAD**: `e8d87d8e532306b98cfc73a7753f76703c91eebe`
- **local Supabase stack**: Active

## 2. Environment / Tooling Verification
- **Node**: `v24.18.0`
- **npm**: `11.16.0`
- **Dependency Installation (`npm ci`)**: Completed, but reported 2 packages requiring explicit scripts allowance.
- **Docker Daemon**: Healthy (Client: `29.7.2`, Server: `29.7.2`).

## 3. Static Validation & Prisma Generation
**Result**: [FAIL] (Tooling / Source failures)
- **TypeScript Compiler (`tsc`)**: Failed.
  - *Source Failure*: `governance/workers/ingestion-adapter.ts` contains multiple type errors (`implicitly has an 'any' type`, `Property 'status' does not exist on type '{}'`).
- **Prisma Generation**: Failed.
  - *Environment / Tooling Failure*: `Prisma CLI Version : 7.9.1` fails validation with `Error code: P1012`. The property `url = env(...)` is no longer supported in Prisma schema files starting from Prisma 7. The current configuration in `governance/prisma/schema.prisma` is fundamentally incompatible with the tooling version. This also caused TypeScript compilation failures due to the missing `@prisma/client` module in `governance/lib/ingestion/db.ts`.

## 4. Runtime Integrity (`supabase db reset`)
**Result**: [PASS]
- The entire migration chain executed successfully from `20240810000000_storage_manifest.sql` through `20260815000001_wpgov_01b_outbox_read.sql` without collision or failure.

## 5. WP-01-02 Runtime Evidence Boundary Test
**Result**: [PASS]
- **Execution**: `node test_submission_boundary.mjs`
- **Outcome**: 14 tests passed, 0 failed.
- The certified RPCs and submission boundary (`submit_article_transition`) remain completely operational and perfectly isolated.

## 6. Governance Observations (READ-ONLY)
**Result**: [FAIL] (Runtime / Certification failures)

- `[FAIL]` governance schema exists: `false`
- `[FAIL]` EventReceipt exists: `false`
- `[FAIL]` IngestionCursor exists: `false`
- `[FAIL]` EvidenceProjection exists: `false`
- `[FAIL]` CertificationResult exists: `false`
- `[PASS]` governance_ingest_role exists: `true`
- `[FAIL]` governance_app_role exists: `false`
- `[PASS]` governance_evidence_resolver exists: `true`
- `[PASS]` governance_outbox_reader exists: `true`
- `[PASS]` no Article/Journal/Book duplicate authoritative models in Governance: `true`
- `[PASS]` Governance cannot execute submit_article_transition: `true`

*Note: The absence of the `governance` schema and `governance_app_role` indicates that the WP-GOV-01A implementation (which was built locally and pushed as Prisma definitions) did not successfully deploy its artifacts to the runtime database environment during the `db reset`, which corroborates the Prisma generation failure above. The read boundary components (ingest role, outbox reader, evidence resolver) deployed correctly because they are tracked in standard SQL migrations.*

## FINAL CLASSIFICATION:
RC2 ENGINEERING ONBOARDING — REPRODUCIBILITY BLOCKED
