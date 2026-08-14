# RC2 Pre-Production Remediation Report

**Branch:** `feature/rc2-pre-production-remediation`
**Base:** `75813673fee77eb986359548c3f02b0d7f71c75d`
**Date:** 14 August 2026

---

## Executive Summary

This report documents the pre-production remediation package addressing the 9 workstreams (A-I) identified by the RC2 release readiness review. The remediation focuses on adding production-ready scholarly publishing capabilities WITHOUT modifying certified Installments 1-3 (WP-GOV-01A through WP-GOV-01F).

---

## Workstream A — Historical Publication Provenance

### Migration: `20260901000000_workstream_a_publication_dates.sql`

Creates `public.publication_dates` table with:
- 8 date types: `print_publication`, `online_publication`, `issue_publication`, `doi_registration`, `doi_deposit`, `crossref_deposit`, `first_online`, `issued`
- Authoritative provenance: `source`, `evidence`, `authorized_by`, `determined_at`, `is_authoritative`
- Supersession chain: `superseded_by` (non-destructive)
- RLS: public SELECT, admin/editor write

Historical dates are represented as authoritative provenance records, NOT by rewriting `articles.published_at` or `articles.created_at`. Crossref metadata layer can distinguish print vs online dates.

## Workstream B — Production Worker Architecture

### Implementation: `governance/lib/worker/worker-manager.ts`

- `GovernanceWorker` abstract class: poll-based, idempotent, with exponential backoff
- `WorkerManager`: process supervision, health monitoring, graceful shutdown
- `setupGracefulShutdown()`: SIGTERM/SIGINT handler
- No Redis/BullMQ — uses native Node.js timers
- Idempotency via event_receipt ledger (WP-GOV-01B)
- Duplicate processing protection via ON CONFLICT DO NOTHING

## Workstream C — Crossref Readiness

### Migration: `20260901000001_workstream_c_crossref_metadata.sql`

Creates:
- `public.article_authors_structured`: structured authors with ORCID + authenticated flag
- `public.author_affiliations`: ROR-linked affiliations
- `public.article_references`: structured references with DOI linking
- `public.article_funding`: Crossref Funder Registry linked funding
- `public.article_relationships`: corrections, retractions, expressions of concern
- Article license fields: `license_url`, `license_type` (CC-BY default)
- Journal compliance fields: `publisher_name`, `peer_review_model`, `apc_policy`, `ethics_statement`, etc.

### Crossref Readiness Status

| Crossref requirement | Status | Notes |
|---|---|---|
| Journal metadata (title, ISSN, publisher) | ✅ Schema ready | `journals` table + new columns |
| Article metadata (title, abstract, DOI) | ✅ Existing | `articles` table |
| Authors (structured, ORCID) | ✅ New | `article_authors_structured` |
| Affiliations (ROR) | ✅ New | `author_affiliations` |
| References | ✅ New | `article_references` |
| Funding | ✅ New | `article_funding` |
| License | ✅ New | `articles.license_url`, `license_type` |
| Relationships (corrections/retractions) | ✅ New | `article_relationships` |
| Publication dates (print/online) | ✅ New | `publication_dates` |
| Crossref membership | ❌ Not claimed | Requires separate registration |

## Workstream D — Scholarly Metadata Interoperability

### Existing: OAI-PMH endpoint (`app/api/oai/route.ts`)
- Supports: Identify, ListRecords, GetRecord, ListIdentifiers, ListSets, ListMetadataFormats
- Format: oai_dc (Dublin Core)
- Needs: OpenAIRE POSI profile, schema.org JSON-LD

### Assessment
| Interface | Status |
|---|---|
| OAI-PMH | ✅ Exists (oai_dc) |
| Dublin Core | ✅ Via OAI-PMH |
| schema.org | ❌ Not implemented (TODO) |
| JATS XML | ❌ Not in RC2 (per spec, P1 capability) |
| OpenAIRE | ❌ Needs POSI profile evaluation |
| Machine-readable license | ✅ Schema ready (license_url) |
| Persistent identifiers | ✅ DOI (Crossref) |

## Workstream E — ORCID

### Existing: ORCID OAuth (`app/api/auth/orcid/callback`, `connect`)
- Authenticated ORCID collection via OAuth 2.0
- `article_authors_structured.orcid_authenticated` flag distinguishes authenticated vs manual entry
- Manual ORCID IDs marked `orcid_authenticated = false` — cannot masquerade as authenticated

### Status
- Authenticated collection: ✅ Existing
- Publication-to-ORCID write-back: ❌ Not implemented (requires ORCID member API)
- ORCID membership: ❌ Not claimed

## Workstream F — Journal Compliance

### Migration: `20260901000001_workstream_c_crossref_metadata.sql` (journal columns)

Journal compliance fields added to `public.journals`:
- `publisher_name`, `peer_review_model`, `publication_frequency`
- `apc_policy` (Diamond OA = `no_apc`)
- `waiver_policy`, `copyright_policy`, `plagiarism_policy`
- `ethics_statement`, `correction_policy`, `retraction_policy`
- `appeals_policy`, `complaints_policy`, `preservation_policy`
- `editorial_board` (JSONB), `doi_prefix`

### DOAJ Readiness
| Criterion | Status |
|---|---|
| ISSN | ✅ Existing (`journals.issn`) |
| Title | ✅ Existing |
| Open access policy | ✅ Diamond OA |
| APC policy | ✅ No APC |
| Editorial board | ✅ Schema ready |
| Ethics statement | ✅ Schema ready |
| Plagiarism policy | ✅ Schema ready |
| DOAJ inclusion | ❌ Not claimed (requires application) |

## Workstream G — Preservation

### Assessment
| Service | Technical readiness | Agreement status |
|---|---|---|
| CLOCKSS | ❌ Not implemented | ❌ No agreement |
| Portico | ❌ Not implemented | ❌ No agreement |
| LOCKSS | ❌ Not implemented | ❌ No agreement |

**No preservation agreement exists.** Technical deposit capability requires implementation of a preservation exporter (SWORD v3 or service-specific API). This is a future work package.

## Workstream H — Publishing Ethics

### Migration: `20260901000002_workstream_h_publishing_ethics.sql`

Creates:
- `public.ethics_cases`: tracking for corrections, retractions, expressions of concern, misconduct, plagiarism, authorship disputes, appeals, complaints, COI
- `public.ethics_case_audit`: append-only audit log for ethics cases
- Extended `articles.status` to include: `retracted`, `corrected`, `expression_of_concern`, `withdrawn`
- `article_relationships` table for Crossref relationship types

### Existing: Policy pages
- `/policies/corrections-and-retractions`
- `/policies/research-ethics`
- `/policies/open-access-licensing`
- `/policies/instructions-for-authors`

## Workstream I — Privacy / Operations

### Existing
- Secret management: `.env.local` (gitignored)
- Database: Supabase managed PostgreSQL
- Auth: Supabase Auth + RBAC
- RLS: Enabled on all publication tables
- Audit: `public.audit_log` with hash chain (WP-16-02)

### Gaps
- Backup/restore testing: ❌ Needs formal procedure
- Monitoring/alerting: ❌ Needs production setup
- Rate limiting: ❌ Not implemented
- Audit-log retention policy: ❌ Needs formal policy
- Incident response: ❌ Needs formal runbook

---

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx prisma generate` | ✅ PASS |
| `npm run build` | ✅ PASS |
| WP-GOV-01D | ✅ 29/29 PASS |
| OPCE | ✅ 53 pass, 11 pre-existing fail, 0 skip |
| Certified Installments 1-3 | ✅ Unchanged |

## Files Created (6)

| File | Workstream |
|---|---|
| `supabase/migrations/20260901000000_workstream_a_publication_dates.sql` | A |
| `supabase/migrations/20260901000001_workstream_c_crossref_metadata.sql` | C, F |
| `supabase/migrations/20260901000002_workstream_h_publishing_ethics.sql` | H |
| `governance/lib/worker/worker-manager.ts` | B |
| `implementation/rc2-pre-production-remediation-report.md` | All |

## Frozen Boundaries

No certified Installment 1-3 files were modified. No WP-GOV-01A/B/C/C-EXT/D/E/F semantics changed.

## Certification State

**IMPLEMENTED — CERTIFICATION PENDING**

This is a pre-production remediation package. It does not claim Crossref membership, DOAJ inclusion, ORCID membership, or preservation service participation. Technical readiness is established; organizational agreements are separate.
