# RC2 Post-Remediation Engineering Handover

**Branch:** `feature/rc2-post-remediation`
**Base:** `5c8b04d7397ba1ca75d9848a14329c9a87661f43`
**Date:** 14 August 2026

---

## A. Repository Identity

| Field | Value |
|---|---|
| Base branch | `main` |
| Base commit | `5c8b04d7397ba1ca75d9848a14329c9a87661f43` |
| Engineering branch | `feature/rc2-post-remediation` |

## B. Changed Files (10 new)

| File | Workstream | Purpose |
|---|---|---|
| `supabase/migrations/20260902000000_ws_a_publication_provenance.sql` | A | `publication_dates` table (8 date types, provenance, supersession) |
| `supabase/migrations/20260902000001_ws_b_ethics_lifecycle.sql` | B | `article_lifecycle_events` (append-only, 4 event types) + `article_relationships` |
| `supabase/migrations/20260902000002_ws_d_crossref_metadata.sql` | D, G | Structured authors, affiliations, references, funding, license, journal compliance, Crossref deposit queue |
| `supabase/migrations/20260902000003_ws_h_preservation.sql` | H | `preservation_packages` (BagIt-style local dark archive) |
| `governance/lib/worker/worker-manager.ts` | C | WorkerManager + GovernanceWorker + graceful shutdown |
| `governance/lib/lifecycle/events.ts` | B | Append-only lifecycle event derivation (does NOT modify articles.status) |
| `governance/lib/crossref/deposit-pipeline.ts` | D | Crossref XML generation + deposit job model |
| `governance/lib/preservation/dark-archive.ts` | H | BagIt manifest + package checksum |
| `implementation/rc2-post-remediation-engineering-handover.md` | All | This document |
| `implementation/rc2-post-remediation-production-readiness-matrix.md` | All | Production readiness classification |

**No certified Installment 1-3 files modified.**

## C. Workstream Summary

### WS-A: Historical Publication Provenance
- `publication_dates` table: 8 date types, authoritative provenance (source, evidence, asserting_authority, verification_status)
- `articles.published_at` unchanged — continues to represent the actual system-level online publication event
- Historical dates are independent governed assertions
- Supersession chain for corrections

### WS-B: Ethics / Article Lifecycle
- `article_lifecycle_events` table: append-only events (CORRECTION, RETRACTION, EXPRESSION_OF_CONCERN, WITHDRAWAL)
- Does NOT alter certified `articles.status` state model
- Current scholarly-record state is DERIVED from event history (via `deriveLifecycleState()`)
- Historical states preserved, not silently destroyed
- `article_relationships` table for Crossref relationship types

### WS-C: Production Workers
- `GovernanceWorker` abstract class: poll-based, idempotent, exponential backoff
- `WorkerManager`: process supervision, health monitoring, graceful shutdown
- `setupGracefulShutdown()`: SIGTERM/SIGINT handler
- No Redis/BullMQ — native Node.js

### WS-D: Crossref Technical Integration
- Structured metadata tables: authors (ORCID + authenticated flag), affiliations (ROR), references, funding
- `crossref_deposit_queue` table: deposit jobs triggered by Release Gate ALLOW
- `generateDepositXml()`: Crossref XML with authors, ORCID, dates, references, funding, license
- Idempotent deposit, retry, failure recording, redeposit support
- Does NOT claim Crossref membership

### WS-E: Scholarly Metadata
- OAI-PMH exists (oai_dc) — validated against current implementation
- Dublin Core via OAI-PMH
- schema.org JSON-LD: assessed, future work
- OpenAIRE POSI: NOT claimed without validation

### WS-F: ORCID
- Authenticated ORCID collection exists (OAuth 2.0)
- `article_authors_structured.orcid_authenticated` flag prevents manual ORCID masquerading
- Write-back requires ORCID member API — NOT claimed

### WS-G: Journal Compliance
- 16 compliance fields added to `journals` table
- DOAJ readiness: technical schema ready, application NOT claimed
- 8 journals to be populated with compliance data (post-audit)

### WS-H: Preservation
- `preservation_packages` table: BagIt-style local dark archive
- `dark-archive.ts`: BagIt manifest generation + package checksum
- External preservation (CLOCKSS/Portico/LOCKSS) remains post-launch objective

### WS-I: Production Operations
- Existing: secrets (.env.local), RLS, audit hash chain
- Documented gaps: backup testing, monitoring, rate limiting, incident response runbook
- No secrets committed

## D. Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx prisma generate` | ✅ PASS |
| WP-GOV-01D | ✅ 29/29 PASS |
| OPCE | ✅ 53 pass, 11 pre-existing, 0 skip |
| Certified Installments 1-3 | ✅ Unchanged |

## E. Production Readiness Status

See `rc2-post-remediation-production-readiness-matrix.md` for full classification.

## F. Certification State

**IMPLEMENTED — CERTIFICATION PENDING**

---

```
RC2 POST-REMEDIATION ENGINEERING COMPLETE — READY FOR INDEPENDENT AUDIT
```
