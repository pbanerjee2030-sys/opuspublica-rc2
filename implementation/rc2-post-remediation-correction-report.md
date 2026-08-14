# RC2 Post-Remediation Operationalization Correction Report

**Branch:** `feature/rc2-post-remediation`
**Base:** `bb5c86e7ebc510ac3dccbe647d8ff6e26d3bb415`
**Date:** 14 August 2026

---

## 1. Original Audit Finding

The post-remediation package had schemas and libraries that existed but were not connected:
- `publication_dates` schema existed but no domain service
- `article_lifecycle_events` schema existed but no lifecycle service
- `WorkerManager` existed but no entrypoint wiring actual workers
- `deposit-pipeline.ts` existed but no worker consuming the queue
- `dark-archive.ts` existed but no preservation trigger
- No remediation test suite existed

## 2. Files Created (7 new)

| File | Workstream | Purpose |
|---|---|---|
| `governance/lib/lifecycle/publication-date-service.ts` | A | Domain service: create, supersede, verify, retrieve publication dates |
| `governance/lib/lifecycle/lifecycle-service.ts` | B | Service: create lifecycle events, derive state, supersede |
| `governance/lib/crossref/crossref-deposit-worker.ts` | D | Worker: polls queue, generates XML, submits to Crossref, records results |
| `governance/lib/preservation/preservation-service.ts` | H | Service: trigger preservation, verify packages |
| `governance/worker-entrypoint.ts` | C | Production entrypoint: wires IngestionWorker, SynthesisWorker, CrossrefDepositWorker |
| `tests/governance/remediation.test.ts` | All | 31 tests across all workstreams |
| `implementation/rc2-post-remediation-correction-report.md` | All | This report |

## 3. What Was Operationalized

### WS-A: Publication Date Service
- `createPublicationDate()`: controlled write path with authority + provenance
- `supersedePublicationDate()`: correction chain (prior record kept)
- `verifyPublicationDate()`: verification status workflow
- `getActivePublicationDates()`: query non-superseded dates
- `getOnlinePublicationDate()`: maps to articles.published_at (invariant preserved)

### WS-B: Lifecycle Service
- `createLifecycleEvent()`: authorized event creation (CORRECTION, RETRACTION, EOC, WITHDRAWAL)
- `getLifecycleEvents()`: immutable history retrieval
- `getArticleLifecycleState()`: derived current state from events
- `supersedeLifecycleEvent()`: non-destructive supersession (is_active = false)
- Does NOT modify articles.status (frozen boundary)

### WS-C: Worker Entrypoint
- `governance/worker-entrypoint.ts`: production entrypoint
- Wires: IngestionWorker, SynthesisWorker, CrossrefDepositWorker
- `WorkerManager`: startup, health reporting, graceful shutdown
- PM2/systemd → worker-entrypoint → WorkerManager → workers

### WS-D: Crossref Deposit Worker
- `CrossrefDepositWorker extends GovernanceWorker`: polls `crossref_deposit_queue`
- Verifies Release Gate ALLOW authorization before depositing
- `queueCrossrefDeposit()`: creates deposit job after gate authorization
- `CrossrefHttpClient` interface: mockable for tests (no live deposits)
- XML generation from: article metadata, structured authors, ORCID, affiliations, references, funding, dates, license
- Retry + failure recording + redeposit support

### WS-H: Preservation Service
- `triggerPreservation()`: creates BagIt package after governed publication
- `verifyPreservation()`: restore verification
- Package: PDF reference, metadata JSON, manifest, checksums

### WS-F: Journal Compliance
- 16 compliance fields verified in migration
- Default APC: `no_apc` (Diamond OA)
- Default peer review: `double-blind`

## 4. Test Matrix

| Suite | Tests | Passed | Failed | Skipped |
|---|---|---|---|---|
| Remediation (A-H) | 31 | 31 | 0 | 0 |
| WP-GOV-01D | 29 | 29 | 0 | 0 |
| OPCE | 64 | 53 | 11 (pre-existing) | 0 |

**tsc: 0 errors. Build: PASS.**

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

**No certified Installment 1-3 files modified.**

## 6. Updated Production Readiness Matrix

| Status | Count | Change |
|---|---|---|
| GREEN (operational + tested) | 31 | ↑ from 0 |
| AMBER (functional, ops prep needed) | 12 | unchanged |
| RED (production blocker) | 0 | unchanged |
| BLUE (external dependency) | 5 | unchanged |

## 7. Migration Status

5 new migrations (from original post-remediation + this correction):
- `20260902000000_ws_a_publication_provenance.sql`
- `20260902000001_ws_b_ethics_lifecycle.sql`
- `20260902000002_ws_d_crossref_metadata.sql`
- `20260902000003_ws_h_preservation.sql`
- (No new migrations in this correction — only code + tests)
