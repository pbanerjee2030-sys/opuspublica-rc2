# WP-GOV-01A Certification Record

**Work Package**: WP-GOV-01A — Governance Schema Foundation  
**Status**: **CERTIFIED / FROZEN**  
**Certification Date**: 2026-08-12  
**Certified By**: RC2 Engineering Governance Authority (authorized per Master Engineering Directive Part IV, Gate 5–6)

---

## 1. Work Package Identity

| Field | Value |
|---|---|
| Work Package | WP-GOV-01A |
| Full name | Governance Schema Foundation |
| Preceding package | WP-GOV-01-PREP (CERTIFIED/FROZEN) |
| Succeeding package | WP-GOV-01B (IMPLEMENTED — runtime certification pending) |
| Engineering specification | `implementation/wp-gov-01-engineering-specification.md` |

---

## 2. Certification Basis

WP-GOV-01A is certified on the basis of the following independent evidence chain:

### 2a. Implementation Evidence

| Document | Classification |
|---|---|
| `implementation/wp-gov-01a-implementation-report.md` | Implementation Evidence |
| `implementation/governance-database-provisioning-forensic-review.md` | Forensic Evidence |
| `implementation/governance-database-provisioning-correction-report.md` | Correction Implementation Evidence |

### 2b. Independent Adversarial Audit

**Audit report**: `implementation/wp-gov-01a-independent-adversarial-certification-review.md`  
**Auditor**: Antigravity (independent audit role per Master Engineering Directive Part XI)  
**Audit verdict**: `WP-GOV-01A READY FOR CERTIFICATION`

The audit conducted:
- 26-model/26-table Prisma ↔ live database reconciliation
- Full column type, nullability, default, FK, and index verification
- 28-point privilege matrix check (live `has_table_privilege` / `has_function_privilege`)
- EventReceipt 9-column immutability attack
- Duplicate `eventId` replay attack
- Publication plane isolation (10-vector attack)
- Resolver security inspection (`SECURITY DEFINER`, `search_path`, body analysis)
- Outbox reader security inspection
- Privilege escalation attack (15-vector)
- Default privilege analysis
- WP-01-02 regression

All adversarial checks passed. No blocking defects were found.

### 2c. Clean Runtime Reset

**Command**: `npx supabase db reset`  
**Environment**: Local Supabase (Docker) — see §7  
**Result**: Exit code 0. All 36 migrations applied without error from an empty database.  
**Post-reset verification**: `governance` schema present; all 26 tables present; all roles present; all RPC functions present.

### 2d. Privilege Attack Results

Full 15-vector privilege escalation check confirmed:
- `governance_ingest_role` — no SUPERUSER, CREATEROLE, CREATEDB; CANLOGIN = false
- `governance_app_role` — no SUPERUSER, CREATEROLE, CREATEDB; CANLOGIN = false
- `PUBLIC` pseudo-role has no USAGE on `governance` schema (REVOKE effective)
- All direct Publication table access denied
- All Publication RPC access denied except the two approved boundary functions

### 2e. WP-01-02 Regression Results

**Command**: `node test_submission_boundary.mjs`  
**Result**: 14/14 PASS  

```
[PASS] Anonymous submission DENIED
[PASS] Author submission PASS
[PASS] Editor submission PASS
[PASS] Submission identity PASS
[PASS] Article identity PASS
[PASS] Idempotent replay PASS
[PASS] Conflict detection PASS
[PASS] Governance submission DENIED (Regression Test PASS)
[PASS] Submission record exists
[PASS] Submission state is Submitted
[PASS] Submission owner is correct
[PASS] Article record exists independently
[PASS] ArticleSubmitted PASS
[PASS] Independent event_id PASS
Tests completed: 14 passed, 0 failed
```

The Governance Schema Foundation provisioning does not regress the certified WP-01-02 Publication submission boundary.

---

## 3. Canonical Migration Authority

### Canonical Migration

```
supabase/migrations/20260815000002_wpgov_01a_governance_schema.sql
```

This migration is the sole authoritative runtime deployment for the Governance schema (`governance`), all 26 Governance tables, Governance role assignments, and associated schema-level grants.

### Canonical Authority

**`supabase/migrations/`** is the exclusive runtime deployment authority for all PostgreSQL objects including the Governance schema. This is mandated by:
- `RC2_BASELINE.md` §4 Database Authority
- `implementation/OPUS_PUBLICA_RC2_MASTER_ENGINEERING_DIRECTIVE.md` Part VIII §1

### Prisma Authority

**`governance/prisma/schema.prisma`** is the model and client-generation authority. It serves as:
- the structural source of truth for all Governance models;
- the input for `prisma generate` (Prisma Client generation);
- the input for `prisma validate`.

It does **not** deploy DDL independently and must never be used as a substitute for `supabase/migrations/`.

### Explicit Statement: Old Prisma Migration Superseded

The file:
```
governance/prisma/migrations/20260815000002_init_governance_schema.sql
```
is **no longer the runtime deployment authority** for the Governance schema. It has been superseded by the canonical migration listed above and its source directory (`governance/prisma/migrations/`) has been removed from the repository. The Prisma migrations directory is not an active migration runner path in this project.

**This supersession is permanent for WP-GOV-01A. Any future schema evolution must proceed through `supabase/migrations/` with a new sequential migration file.**

---

## 4. Migration Chain Position

The WP-GOV-01A migration is the third in the Governance foundation chain:

```
supabase/migrations/20260815000000_wpgov_01_prep_resolver.sql  [WP-GOV-01-PREP]
  ↓ creates: governance_ingest_role, governance_evidence_resolver
supabase/migrations/20260815000001_wpgov_01b_outbox_read.sql   [WP-GOV-01-PREP/01B]
  ↓ creates: governance_outbox_reader, governance_worker
supabase/migrations/20260815000002_wpgov_01a_governance_schema.sql  [WP-GOV-01A] ← THIS PACKAGE
  ↓ creates: governance schema, 26 tables, schema grants
```

All predecessor migrations are **PROTECTED / IMMUTABLE** per the Master Engineering Directive Part VIII §3.

---

## 5. Protected Boundaries

The following files and directories were **not modified** during the WP-GOV-01A correction pass:

- `supabase/migrations/20260815000000_wpgov_01_prep_resolver.sql` — PROTECTED
- `supabase/migrations/20260815000001_wpgov_01b_outbox_read.sql` — PROTECTED
- All Publication migrations — PROTECTED
- `governance/prisma/schema.prisma` — PROTECTED (model authority; read-only during this pass)
- `governance/workers/ingestion-adapter.ts` — PROTECTED (WP-GOV-01B scope)
- `app/**`, `lib/**`, `backend/**`, `components/**` — PROTECTED
- `test_submission_boundary.mjs` — PROTECTED (unmodified; used for regression)
- `RC2_BASELINE.md` — PROTECTED
- `REPOSITORY_ENGINEERING_BOUNDARY.md` — PROTECTED
- `implementation/OPUS_PUBLICA_RC2_MASTER_ENGINEERING_DIRECTIVE.md` — PROTECTED

---

## 6. Non-Blocking Findings

The following findings were documented by the independent adversarial audit and accepted as non-blocking for WP-GOV-01A certification:

### F-01 — `supabase_admin` Default Privileges Not Set

**Nature**: The statement `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA governance GRANT ... TO governance_app_role` was removed during the correction pass because `postgres` cannot alter default privileges for a role it does not own.

**Impact**: Future tables created by `supabase_admin` in the `governance` schema would not automatically inherit `governance_app_role` grants. This does not affect any current table, as all application-managed tables are created by `postgres` and covered by the surviving `ALTER DEFAULT PRIVILEGES FOR ROLE postgres` statement.

**Classification**: Security-neutral. PostgreSQL-enforced limitation. **ACCEPTED.**

---

### F-02 — Outbox Reader Exposes `payload` Field

**Nature**: `public.governance_outbox_reader` returns the `payload` JSONB column from `public.outbox`. This payload contains Publication event data including minimized content fields.

**Impact**: The payload is received in-memory by the ingestion adapter, which extracts only structural identity fields (submissionId, articleId) and explicitly discards the raw payload. The `EventReceipt` table has no `payload` column — confirmed in both the Prisma schema and live database. Payload never enters durable Governance storage.

**Classification**: Accepted architectural design per WP-GOV-01B specification. **ACCEPTED.**

---

### F-03 — Retry Backoff `nextRetryAt` Not Respected in Main Poll Loop

**Nature**: The main polling loop in `governance/workers/ingestion-adapter.ts` does not check `nextRetryAt` before attempting to re-process a `pending` event, leading to rapid retry exhaustion rather than exponential backoff.

**Scope**: This finding is **within WP-GOV-01B scope** (ingestion adapter implementation). It does not touch the Governance schema foundation, the migration, or any privilege boundary.

**WP-GOV-01A impact**: None. The schema, provisioning, and privilege matrix are correct and complete. This bug affects only application-layer retry timing.

**Classification**: WP-GOV-01B operational bug. **OPEN UNDER WP-GOV-01B. NOT PART OF WP-GOV-01A CERTIFICATION.**

F-03 is carried forward to the WP-GOV-01B certification scope as a known open item.

---

## 7. Runtime Evidence

| Property | Value |
|---|---|
| Environment | Local Supabase (Docker) |
| Supabase container | `supabase_db_opuspublica` |
| PostgreSQL user used for audit | `postgres` (superuser — for privilege inspection only) |
| Application role under audit | `governance_ingest_role`, `governance_app_role`, `governance_worker` |
| Prisma version | 6.19.3 (pinned — WP-GOV-01-PREP Prisma toolchain correction) |
| Node version | v24.18.0 |
| Reset command | `npx supabase db reset` |
| Evidence date | 2026-08-12 |
| Reproducibility | Clean reset from empty database — deterministic |

---

## 8. Files Created by WP-GOV-01A Correction Pass

| File | Action | Status |
|---|---|---|
| `supabase/migrations/20260815000002_wpgov_01a_governance_schema.sql` | CREATED (moved from Prisma migrations dir) | ✅ Canonical |
| `governance/prisma/migrations/20260815000002_init_governance_schema.sql` | DELETED (superseded) | ✅ Superseded |
| `governance/prisma/migrations/` | DIRECTORY REMOVED | ✅ No longer active |
| `implementation/governance-database-provisioning-correction-report.md` | CREATED | ✅ Evidence |
| `implementation/wp-gov-01a-independent-adversarial-certification-review.md` | CREATED | ✅ Audit |
| `implementation/wp-gov-01a-certification-record.md` | CREATED | ✅ This document |

---

## 9. Certification Conclusion

WP-GOV-01A — Governance Schema Foundation — has passed all required evidence gates:

| Gate | Status |
|---|---|
| Gate 1 — Authorization | ✅ Authorized by `wp-gov-01-engineering-specification.md` |
| Gate 2 — Implementation | ✅ Canonical migration created and deployed |
| Gate 3 — Evidence | ✅ Correction report, forensic review, privilege matrix |
| Gate 4 — Independent Audit | ✅ `WP-GOV-01A READY FOR CERTIFICATION` |
| Gate 5 — Certification | ✅ **CERTIFIED** |
| Gate 6 — Freeze | ✅ **FROZEN** |

The Governance Schema Foundation is **certified and frozen**. It may only be modified by a new explicitly authorized work package that creates a new sequential migration in `supabase/migrations/`. The existing canonical migration `20260815000002_wpgov_01a_governance_schema.sql` is **immutable**.

---

**Document Status**: CERTIFICATION RECORD — AUTHORITATIVE  
**Authority**: RC2 ENGINEERING GOVERNANCE  
**Date**: 2026-08-12
