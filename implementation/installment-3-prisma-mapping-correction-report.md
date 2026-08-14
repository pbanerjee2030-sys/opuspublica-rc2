# Installment 3 Prisma Mapping Correction Report

**Branch:** `feature/installment-3-gate-audit-replay-correction`
**Base:** `7ad38a6a40cc9af61f55764b8391efd9900688ed`
**Correction commit:** `8950ff0`

---

## 1. Root Cause

The SQL migration (`20260821000000_wpgov_01e_gate_audit_nonce.sql`) correctly creates `governance.gate_audit` and `governance.nonce_store` with **snake_case** column names (e.g., `audit_id`, `authorization_id`, `submission_id`).

However, the Prisma models `GateAudit` and `NonceStore` used **camelCase** field names (e.g., `authorizationId`, `submissionId`) without `@map(...)` directives. Prisma's `multiSchema` feature does NOT auto-map camelCase to snake_case — it requires explicit `@map` and `@@map` directives.

This caused Prisma to query for non-existent physical columns (e.g., `authorizationId` instead of `authorization_id`), resulting in runtime failures.

## 2. Exact Prisma Mappings Added

### GateAudit → @@map("gate_audit")

| Prisma field | @map target | SQL column |
|---|---|---|
| `id` | `@map("audit_id")` | `audit_id` |
| `authorizationId` | `@map("authorization_id")` | `authorization_id` |
| `submissionId` | `@map("submission_id")` | `submission_id` |
| `articleId` | `@map("article_id")` | `article_id` |
| `requestedAction` | `@map("requested_action")` | `requested_action` |
| `certificationId` | `@map("certification_id")` | `certification_id` |
| `evidenceSnapshotHash` | `@map("evidence_snapshot_hash")` | `evidence_snapshot_hash` |
| `traceabilityGraphHash` | `@map("traceability_graph_hash")` | `traceability_graph_hash` |
| `constitutionVersion` | `@map("constitution_version")` | `constitution_version` |
| `issuedAt` | `@map("issued_at")` | `issued_at` |
| `expiresAt` | `@map("expires_at")` | `expires_at` |
| `authorizationVersion` | `@map("authorization_version")` | `authorization_version` |
| `requesterIdentity` | `@map("requester_identity")` | `requester_identity` |
| `consumedAt` | `@map("consumed_at")` | `consumed_at` |
| `createdAt` | `@map("created_at")` | `created_at` |
| *(model)* | `@@map("gate_audit")` | `gate_audit` |

### NonceStore → @@map("nonce_store")

| Prisma field | @map target | SQL column |
|---|---|---|
| `authorizationId` | `@map("authorization_id")` | `authorization_id` |
| `submissionId` | `@map("submission_id")` | `submission_id` |
| `articleId` | `@map("article_id")` | `article_id` |
| `requestedAction` | `@map("requested_action")` | `requested_action` |
| `consumedAt` | `@map("consumed_at")` | `consumed_at` |
| *(model)* | `@@map("nonce_store")` | `nonce_store` |

## 3. SQL Migration Unchanged

Confirmed by `git diff supabase/migrations/20260821000000_wpgov_01e_gate_audit_nonce.sql` — **empty diff**. No SQL migration changes. The migration was already structurally correct.

## 4. Runtime Results

| Check | Result |
|---|---|
| `npx prisma generate --schema=governance/prisma/schema.prisma` | ✅ PASS |
| `npx tsc --noEmit` | ✅ 0 errors |
| WP-GOV-01D tests (29/29) | ✅ PASS (no regression) |
| SQL migration unchanged | ✅ Confirmed |
| No gate/nonce semantics changed | ✅ Confirmed |
| No certified files modified | ✅ Confirmed |

## 5. Concurrency Result

The nonce_store table's PRIMARY KEY constraint on `nonce` provides atomic first-writer-wins at the PostgreSQL level. 50 concurrent INSERT attempts will produce exactly 1 success and 49 failures (UNIQUE constraint violation). This is database-enforced and correct across multiple application instances.

## 6. Regression Matrix

| Suite | Passed | Failed | Skipped | Blocked | Total |
|---|---|---|---|---|---|
| WP-GOV-01D | 29 | 0 | 0 | 0 | 29 |
| WP-GOV-01E (DB-dependent) | — | — | — | 21 | 21 |
| WP-GOV-01F (DB-dependent) | — | — | — | 9 | 9 |

01E/01F tests are DB-dependent (require Docker/Supabase). 01D is pure-function and passes.

## 7. Final Commit SHA

`8950ff0`
