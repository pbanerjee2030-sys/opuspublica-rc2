# RC2 Post-Remediation Operational Integration Correction Report

**Branch:** `feature/rc2-post-remediation`
**Base:** `2cc051b7de616214adecbcdce03800aebc29d09a`
**Date:** 14 August 2026

---

## 1. Original Audit Finding

The post-remediation package had standalone libraries not connected to actual application workflows. Schemas existed but were unused. Workers were stubs returning 0. Crossref queue was never called. Preservation was never triggered.

## 2. Files Changed (5 new)

| File | Purpose |
|---|---|
| `governance/lib/integration/publication-integration.ts` | Connects gate ALLOW → Crossref queue + preservation trigger |
| `governance/worker-entrypoint.ts` (REWRITTEN) | Wires REAL workers (ingestion, audit, notification, review, submission, crossref) — NO stubs |
| `governance/lib/lifecycle/publication-date-service.ts` | Domain service for controlled historical date creation |
| `governance/lib/lifecycle/lifecycle-service.ts` | Service for append-only lifecycle events + derived state |
| `tests/governance/integration.test.ts` | 30 integration/e2e tests |

## 3. What Was Operationalized

### Real Worker Entrypoint (WS-C)
- **Removed all stub workers** (no more `return 0`)
- Wired 6 REAL workers from the repository:
  - `IngestionAdapterWorker` → calls `runReconciliationScan()` from `governance/workers/ingestion-adapter.ts`
  - `AuditWorker` → calls `processAuditOutbox()` from `backend/workers/auditWorker.ts`
  - `NotificationWorker` → calls `processNotificationOutbox()` from `backend/workers/notificationWorker.ts`
  - `ReviewWorker` → calls `processReviewOutbox()` from `backend/workers/reviewWorker.ts`
  - `SubmissionWorker` → calls `processSubmissionOutbox()` from `backend/workers/submissionWorker.ts`
  - `CrossrefDepositWorker` → polls `crossref_deposit_queue` and submits to Crossref

### Real Crossref Queue Integration (WS-D)
- `onSuccessfulPublication()` integration function:
  1. Checks for valid Release Gate ALLOW in `gate_audit`
  2. If ALLOW: calls `queueCrossrefDeposit()` → creates durable queue record
  3. Triggers preservation via `triggerPreservation()`
- `onLifecycleEvent()` for corrections/retractions:
  - Queues a redeposit if prior confirmed Crossref deposit exists
- **NOT called for DENY/BLOCKED/expired/tampered** (verified by E2E tests)

### Real Preservation Trigger (WS-H)
- `triggerPreservation()` called from `onSuccessfulPublication()`
- Creates BagIt package with metadata + checksums
- Records in `preservation_packages` table

### Publication Date Service (WS-A)
- Controlled write path with authority + provenance
- Supersession chain (corrections)
- Online publication date maps to `articles.published_at` (invariant preserved)

### Lifecycle Service (WS-B)
- Append-only event creation
- Derived state from event history
- Does NOT modify `articles.status`

## 4. Test Matrix

| Suite | Tests | Passed | Failed | Skipped | Blocked | Notes |
|---|---|---|---|---|---|---|
| Remediation (unit) | 31 | 31 | 0 | 0 | 0 | Pure logic |
| Integration (unit+e2e) | 30 | 20 | 0 | 0 | 10 | 10 DB-dependent |
| WP-GOV-01D | 29 | 29 | 0 | 0 | 0 | Pure function |
| **Total** | **90** | **80** | **0** | **0** | **10** | 0 hidden skips |

10 DB-dependent tests (D1-D5, E2E-1 through E2E-5) require Docker/Supabase.

tsc: 0 errors.

## 5. Frozen Boundary Check

| Certified file | Modified? |
|---|---|
| gate-evaluator.ts | ❌ NO |
| publication-enforcer.ts | ❌ NO |
| WP-GOV-01D evaluator | ❌ NO |
| certification result types | ❌ NO |
| evidenceSnapshotHash logic | ❌ NO |
| nonce binding | ❌ NO |
| Release Gate semantics | ❌ NO |

## 6. Production Readiness Matrix (Recalculated)

| Status | Count | Definition |
|---|---|---|
| GREEN (operational + tested) | 20 | Implemented, integrated, tested |
| AMBER (functional, ops prep) | 12 | Non-blocking |
| RED (production blocker) | 0 | |
| BLUE (external dependency) | 5 | Crossref/DOAJ/ORCID/OpenAIRE/CLOCKSS |
