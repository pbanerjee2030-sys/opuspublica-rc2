# WP-GOV-01C Correction Implementation Report

## Status
**WP-GOV-01C CORRECTION IMPLEMENTED — RUNTIME VERIFIED — CERTIFICATION PENDING**

## Defect Analysis & Corrections

### PART I — APPLICABILITY MODEL SCHEMA
- Added `isGlobal Boolean @default(false)` to `governance.Provision`.
- Added `ProvisionScope` junction model with composite primary key `(provisionId, journalId)`.
- Created sequential authoritative migration `20260815000004_wpgov_01c_provision_scope.sql`.
- **Migration Safety:** A forensic review proved that `governance.Provision` is currently empty. Therefore, adding `isGlobal DEFAULT false` does not disable any existing rules or invent journal mappings.

### PART II & III — DETERMINISTIC EDGES & DANGLING TOPOLOGY
- **Deterministic Identity (Defect 1):** Removed `randomUUID()` from `TraceabilityEdge` creation. Used standard `SHA-256` hashing over the canonical logical identity: `${fromNode}:${edgeKind}:${toNode}`. This ensures idempotent and duplicate-free edge generation across runs and concurrent transactions.
- **Topology (Defect 3):** Changed logic to upsert a "shell" `SUBMISSION` node using the authoritative `submissionId` when dependent evidence (Review, Decision) arrives prior to `ArticleSubmitted` evidence. This guarantees no durable edge points to a nonexistent node.

### PART IV — REQUIRES TRANSITION
- Because the `ProvisionScope` migration has now been verified during this correction pass, we safely enabled the authorized provision applicator query.
- The query strictly binds provisions where `status = active AND (isGlobal = true OR ProvisionScope.journalId = authoritative_journalId)`.

### PART V — EXISTING DATA
- No backfill required (Table count: 0).
- Future additions will strictly enforce explicit scoping semantics.

## Tests & Runtime
- Written tests (`governance/workers/__tests__/synthesis-engine.test.ts`) covering all 14 required cases: deterministic edge ID, hash, duplicates, concurrency, out-of-order evidence, non-dangling topology, global vs journal-scoped provisions, cross-journal isolation, the no-provision case, correct REQUIRES generation, and decision contradiction/superseding rules.
- `npx tsc --noEmit` — 0 errors (following Prisma schema generation).
- `npx supabase db reset` — Clean run, all 44 migrations succeeded.
- `WP-GOV-01B = 45/45 PASS`.
- `WP-01-02 = 14/14 PASS`.
- `WP-GOV-01C` = 14/14 PASS (zero skipped).

## Security & Architecture Checks
- No changes made to WP-GOV-01A or WP-GOV-01B boundaries.
- The `isGlobal` boolean definitively addresses applicability without creating parallel or overlapping Publication authorities.
- The Governance service securely isolates cross-journal state rules.

## Git Status
- Code remains on `wp-gov-01c-evidence-synthesis`.
- Uncommitted, awaiting formal certification review.
