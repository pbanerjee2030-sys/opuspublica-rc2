# RC2 Post-Remediation Production Readiness Matrix

**Branch:** `feature/rc2-post-remediation`
**Date:** 14 August 2026

Legend: GREEN = complete | AMBER = non-blocking | RED = production blocker | BLUE = external/governance dependency

## Workstream A — Historical Publication Provenance

| Requirement | Status | Notes |
|---|---|---|
| Multi-date model (print/online/issue/DOI/system) | GREEN | `publication_dates` table with 8 date types |
| Historical dates do NOT overwrite digital timestamps | GREEN | `articles.published_at` unchanged |
| Authoritative provenance (source, evidence, authority) | GREEN | Fields in `publication_dates` |
| Supersession/correction chain | GREEN | `superseded_by` FK |
| Crossref mapping (print vs online) | GREEN | `generateDepositXml()` distinguishes media_type |
| Verification status | GREEN | `verification_status` field |

## Workstream B — Ethics / Article Lifecycle

| Requirement | Status | Notes |
|---|---|---|
| Append-only ethics events (NOT modifying articles.status) | GREEN | `article_lifecycle_events` table |
| CORRECTION event type | GREEN | |
| RETRACTION event type | GREEN | |
| EXPRESSION_OF_CONCERN event type | GREEN | |
| WITHDRAWAL event type | GREEN | |
| Current state derived from event history | GREEN | `deriveLifecycleState()` |
| Historical states preserved | GREEN | Append-only, no destruction |
| Article relationships (Crossref) | GREEN | `article_relationships` table |
| Release Gate compatibility | GREEN | No certified WP-GOV-01E/F changes |

## Workstream C — Production Workers

| Requirement | Status | Notes |
|---|---|---|
| WorkerManager process supervision | GREEN | `governance/lib/worker/worker-manager.ts` |
| Graceful shutdown (SIGTERM/SIGINT) | GREEN | `setupGracefulShutdown()` |
| Health monitoring | GREEN | `WorkerHealth` interface + `getHealthStatus()` |
| Exponential backoff | GREEN | In `executePoll()` |
| Idempotency | GREEN | Via event_receipt ledger (WP-GOV-01B) |
| Production entrypoint (PM2/systemd config) | AMBER | WorkerManager ready; deployment config is ops task |
| Production topology documentation | AMBER | Documented in handover; formal runbook is ops task |

## Workstream D — Crossref Technical Integration

| Requirement | Status | Notes |
|---|---|---|
| Structured authors (ORCID + authenticated flag) | GREEN | `article_authors_structured` table |
| Affiliations (ROR-linked) | GREEN | `author_affiliations` table |
| References (DOI-linked) | GREEN | `article_references` table |
| Funding (Crossref Funder Registry) | GREEN | `article_funding` table |
| Publication dates (print/online) | GREEN | `publication_dates` table |
| License information | GREEN | `articles.license_url`, `license_type` |
| Article relationships | GREEN | `article_relationships` table |
| Crossref XML generation | GREEN | `generateDepositXml()` |
| Deposit queue (triggered by Gate ALLOW) | GREEN | `crossref_deposit_queue` table |
| Idempotent deposit | GREEN | Retry count + unique batch ID |
| Crossref membership | BLUE | Not claimed — requires separate registration |

## Workstream E — Scholarly Metadata

| Requirement | Status | Notes |
|---|---|---|
| OAI-PMH endpoint | GREEN | Exists (`app/api/oai/route.ts`) |
| Dublin Core | GREEN | Via OAI-PMH (oai_dc) |
| Persistent identifiers (DOI) | GREEN | Existing Crossref integration |
| Citation metadata | GREEN | Via Crossref XML + article_references |
| License metadata | GREEN | `articles.license_url` |
| Funding metadata | GREEN | `article_funding` table |
| Relationships | GREEN | `article_relationships` table |
| Version information | AMBER | Article versions exist; formal version metadata is future work |
| Access rights | GREEN | Diamond OA (no APC, no reader fees) |
| schema.org JSON-LD | AMBER | Assessed, future work |
| JATS XML | AMBER | Per spec, P1 capability; future work |
| OpenAIRE POSI compliance | BLUE | NOT claimed without explicit validation |

## Workstream F — ORCID

| Requirement | Status | Notes |
|---|---|---|
| Authenticated ORCID collection (OAuth 2.0) | GREEN | Existing `app/api/auth/orcid/*` |
| Authenticated vs manual distinction | GREEN | `orcid_authenticated` boolean |
| Correct author association | GREEN | `article_authors_structured` |
| Publication-to-ORCID write-back | BLUE | Requires ORCID member API |
| ORCID membership | BLUE | Not claimed |

## Workstream G — Journal Compliance

| Requirement | Status | Notes |
|---|---|---|
| ISSN | GREEN | Existing `journals.issn` |
| Title | GREEN | Existing `journals.name` |
| Publisher | GREEN | `journals.publisher_name` |
| Editorial board | GREEN | `journals.editorial_board` (JSONB) |
| Peer review model | GREEN | `journals.peer_review_model` |
| Publication frequency | GREEN | `journals.publication_frequency` |
| APC policy | GREEN | `journals.apc_policy` (Diamond OA = no_apc) |
| Waiver policy | GREEN | `journals.waiver_policy` |
| Copyright | GREEN | `journals.copyright_policy` |
| Licensing | GREEN | `journals` + `articles.license_type` |
| Ethics statement | GREEN | `journals.ethics_statement` |
| Plagiarism policy | GREEN | `journals.plagiarism_policy` |
| Correction policy | GREEN | `journals.correction_policy` |
| Retraction policy | GREEN | `journals.retraction_policy` |
| Appeals | GREEN | `journals.appeals_policy` |
| Complaints | GREEN | `journals.complaints_policy` |
| Preservation statement | GREEN | `journals.preservation_policy` |
| DOI status | GREEN | Existing + `doi_deposit_status` |
| ORCID status | GREEN | Authenticated collection |
| DOAJ inclusion | BLUE | Not claimed — requires application |

## Workstream H — Preservation

| Requirement | Status | Notes |
|---|---|---|
| Local dark archive (BagIt) | GREEN | `preservation_packages` table + `dark-archive.ts` |
| Preservation package (PDF + metadata + manifest + checksum) | GREEN | BagIt manifest + checksum |
| Immutable storage | GREEN | `is_immutable` flag |
| Restore verification | AMBER | Schema ready; verification workflow is ops task |
| CLOCKSS/Portico/LOCKSS | BLUE | Post-launch, requires organizational agreements |

## Workstream I — Production Operations

| Requirement | Status | Notes |
|---|---|---|
| Secret management | GREEN | `.env.local` (gitignored), no secrets committed |
| Production env separation | GREEN | Config via env vars |
| Database backups | AMBER | Supabase managed; formal procedure documented |
| Restore testing | AMBER | Documented gap; ops task |
| Monitoring | AMBER | Worker health via WorkerManager; production APM is ops task |
| Health checks | GREEN | `WorkerHealth` + `getHealthStatus()` |
| Alerting | AMBER | Worker error events emitted; production alerting is ops task |
| Logging | GREEN | Structured console logging in workers |
| Rate limiting | AMBER | Not implemented; documented gap |
| Incident response | AMBER | Documented gap; runbook is ops task |
| Worker deployment | AMBER | WorkerManager ready; PM2/systemd config is ops task |
| Rollback | GREEN | Flux GitOps + tested rollback (WP-01-02) |
| Dependency/security monitoring | AMBER | Dependabot active; formal SCA is ops task |

## Summary

| Status | Count |
|---|---|
| GREEN | 38 |
| AMBER | 12 |
| RED | 0 |
| BLUE | 5 |

**No RED (production blockers).** All AMBER items are non-blocking operational tasks. BLUE items require external organizational agreements.
