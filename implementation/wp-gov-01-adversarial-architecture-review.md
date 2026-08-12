# WP-GOV-01 Adversarial Architecture Review

**Reviewer Model:** Claude Opus 4.6 (Thinking)
**Date:** 2026-08-11
**Mode:** Independent Adversarial Architecture Review — READ ONLY

---

## 1. EVENT INGESTION — ATTACK RESULTS

### Outbox Schema (verified)

```sql
public.outbox (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    retry_count integer NOT NULL DEFAULT 0,
    next_retry_at timestamptz,
    last_error text
)
```

**Critical observation: `public.outbox` has NO Row Level Security enabled.** Every migration was inspected. RLS is enabled on `articles`, `submissions`, `decisions`, `reviewer_assignments`, `audit_log`, `profiles`, `journals`, `books` — but NOT on `outbox`. This means any authenticated Supabase role with table-level access can read AND write the outbox. This is a security design defect for the governance boundary.

**Critical observation: There is no monotonic sequence column.** The `id` is UUIDv4 (random, non-sortable). `created_at` is a timestamp defaulting to `now()` within the inserting transaction. There is no `SERIAL`/`BIGSERIAL` column.

### Case Analysis

**Case A — Two events with the same `created_at`:**
**UNSAFE.** Two events inserted within the same transaction (e.g., `ArticleSubmitted` + `NotificationQueued` + `AuditRecorded` are all inserted atomically in `process_article_submission`) will have identical `created_at` values. A `last_processed_created_at` watermark cursor will either miss some or re-process all. **The previous design's watermark strategy is fundamentally broken for multi-event transactions.**

**Case B — Event B commits later but has earlier timestamp:**
**UNSAFE.** Transaction A begins at T=1, acquires `created_at=T1`, but commits at T=5. Transaction B begins at T=2, commits at T=3. If the adapter polls at T=4 and records watermark=T2, it will never see Transaction A's event at T=1 when it commits at T=5. **Data-loss risk.**

**Case C — Governance crashes after reading but before recording receipt:**
**RECOVERABLE** — provided the adapter uses a deduplication ledger keyed on `outbox.id`. On restart, the same event is re-read and the ledger INSERT is idempotent (ON CONFLICT DO NOTHING).

**Case D — Receipt recorded but projection crashes:**
**RECOVERABLE** — provided the receipt ledger tracks a `projected` boolean separately from `received`. On restart, unprojected receipts are retried.

**Case E — Late event after high-water mark:**
**UNSAFE with timestamp watermark.** This is Case B restated. A committed event with `created_at` earlier than the watermark will be permanently invisible.

**Case F — Two workers consume simultaneously:**
**RECOVERABLE** — provided the receipt ledger uses `INSERT ... ON CONFLICT DO NOTHING` and projections are idempotent. Both workers may process the same event, but only one projection succeeds.

**Case G — Single Publication transaction creates multiple related events:**
All three SQL RPCs (`process_article_submission`, `process_review_submission`, `record_decision`) insert secondary outbox events (e.g., `AuditRecorded`, `NotificationQueued`) within the same transaction. These events share the same `created_at` and have no explicit causal ordering. **A timestamp watermark cannot distinguish them.**

### Corrected Ingestion Strategy

The previous design's `last_processed_created_at` watermark is **REJECTED**.

**Corrected approach: Overlap-window polling with receipt ledger.**

1. The adapter maintains a `governance.ingestion_cursor` table with `last_poll_window_start timestamptz`.
2. Each poll cycle queries: `SELECT * FROM public.outbox WHERE created_at >= (last_poll_window_start - OVERLAP_INTERVAL) ORDER BY created_at ASC, id ASC`.
3. The overlap interval (e.g., 30 seconds) compensates for in-flight transactions that committed after the previous poll.
4. Every fetched `outbox.id` is checked against `governance.event_receipt(outbox_event_id uuid PRIMARY KEY)`.
5. Only events not already in the receipt ledger are projected.
6. After projection, `last_poll_window_start` advances to `MAX(created_at)` of newly processed events.
7. The `(created_at, id)` composite ordering provides deterministic iteration even when timestamps collide.

This strategy tolerates Cases A through G.

**Alternative considered: PostgreSQL logical replication / CDC.** This would provide WAL-based ordering and guarantee no missed events. However, it requires Supabase logical replication slots, which may not be available on all Supabase tiers, and introduces operational complexity. **Recommended as a future upgrade path (WP-GOV-02), not a WP-GOV-01 requirement.**

---

## 2. EVIDENCE IMMUTABILITY

For every ingested event, Governance must preserve immutably:

| Field | Immutable | Source |
| ----- | --------- | ------ |
| `outbox_event_id` | YES | `outbox.id` — canonical event instance identity |
| `event_type` | YES | `outbox.event_type` |
| `projected_payload` | YES | Minimized projection of `outbox.payload` (identifiers + semantic state only) |
| `payload_hash` | YES | SHA-256 of the raw `outbox.payload::text` at ingestion time |
| `source_created_at` | YES | `outbox.created_at` |
| `ingested_at` | YES | Governance-side timestamp of ingestion |
| `ingestion_adapter_version` | YES | SemVer of the adapter that projected the event |
| `constitution_version` | YES | Active constitution version at ingestion time |

**Governance MUST NOT reinterpret historical evidence after ingestion.** If a constitutional provision changes, that change applies only to future certification evaluations. Historical evidence records remain frozen with their original `constitution_version` binding. Re-evaluation uses the new provision but never mutates old evidence records.

---

## 3. CERTIFICATION REPRODUCIBILITY

The previous review admitted `DESIGN INCOMPLETE` for both rule version pinning and certification reproducibility. This is a **serious blocker** that must be resolved before implementation authorization.

### Corrected Certification Artifact

A `CertificationResult` must contain:

```
{
  certification_id: uuid,
  submission_id: uuid,
  constitution_version: semver,
  provision_versions: Map<provision_id, semver>,
  policy_version: semver,
  evaluator_version: semver,
  evidence_snapshot: {
    event_ids: uuid[],
    evidence_hash: sha256   // hash of sorted event_ids + projected_payloads
  },
  traceability_graph_hash: sha256,  // hash of relevant subgraph
  evaluated_at: timestamptz,
  result: PASS | FAIL | BLOCKED,
  findings: Finding[],
  certification_hash: sha256  // hash of all above fields
}
```

**The `certification_hash` is the deterministic reproducibility proof.** Given the same evidence snapshot, provision versions, and evaluator version, the same hash must be produced. This is verifiable: replay the evaluation against the frozen evidence and compare hashes.

**The authorization response for release gates MUST include `certification_hash` and `certification_id`.** The Publication Plane must store this alongside the DOI deposit record as irrefutable evidence of authorization.

**Ordinary database rows are NOT sufficient.** The certification hash provides tamper-evidence that database rows alone cannot guarantee (a database row can be silently updated). The hash chain in `public.audit_log` (WP-16-02) provides a precedent for this pattern.

---

## 4. CERTIFICATION ENGINE — FAILURE CASES

| Scenario | Correct Result | Rationale |
| -------- | -------------- | --------- |
| Missing evidence (e.g., no ReviewSubmitted for a submission) | BLOCKED | Cannot certify without required evidence |
| Contradictory evidence (e.g., 2 Reject reviews but Accept decision) | FAIL | Constitutional violation detected |
| Duplicate evidence (same event_id ingested twice) | Deduplicated at ingestion | Receipt ledger prevents duplicates |
| Stale evidence (evidence older than certification TTL) | BLOCKED | Evidence expired; re-evaluation required |
| Superseded evidence (Decision superseded by newer Decision) | Use latest non-superseded | Graph traversal follows supersession edges |
| Revoked certification | DENY at gate | Gate checks `revoked_at IS NULL` |
| Changed constitutional provision | Re-evaluate with new version | Old certifications remain valid under their version |
| Changed policy rule | Re-evaluate with new version | Policy version binding prevents silent drift |
| Changed evaluator | Re-evaluate; compare hashes | Version mismatch triggers mandatory re-certification |
| Partial event ingestion | BLOCKED | Graph is topologically incomplete |
| Out-of-order events | BLOCKED until graph resolves | Missing prerequisites prevent PASS |
| Unknown event types | IGNORED with AuditFinding | Unknown events generate SEV-3 findings but don't block |

**Fail-safe default: BLOCKED.** If the engine cannot determine PASS with certainty, the result is BLOCKED, not PASS.

---

## 5. RELEASE GATE — ATTACK RESULTS

### Scenario 1: ALLOW followed by evidence change
**UNSAFE if ALLOW is unbounded.** The authorization must include an `expires_at` timestamp (e.g., 15 minutes). After expiry, Publication must re-request. The authorization must also include `certification_hash` — if evidence changes, a new certification produces a different hash, and the old authorization becomes invalid.

### Scenario 2: ALLOW replayed against another article
**UNSAFE if authorization is not bound.** The authorization artifact must include `submission_id`, `action`, and `certification_id`. Publication must verify all three match before executing.

### Scenario 3: ALLOW replayed after revocation
**UNSAFE if Publication doesn't verify.** Publication must include the `certification_id` in its gate check. The gate endpoint must verify `revoked_at IS NULL`.

### Scenario 4: Attacker modifies request article_id
**UNSAFE if gate response is unsigned.** The authorization artifact must include the exact `submission_id` and `action` from the request, and Publication must verify these match the actual operation it's about to perform.

### Scenario 5: Stale Publication state
**Low risk.** Governance evaluates based on its own evidence graph, not Publication's current state. If Publication's state has diverged, the gate response is still based on constitutional requirements.

### Scenario 6: Two processes race with same authorization
**UNSAFE.** The authorization artifact must include a nonce or be single-use. Alternatively, DOI minting itself must be idempotent (which it already is — Crossref deposit is idempotent by DOI).

### Scenario 7: Governance temporarily unavailable
**CORRECT: Fail-closed for DOI/publication.** Publication must NOT proceed with DOI minting if the gate call times out or fails. Editorial workflow continues unimpeded.

### Scenario 8: Gate API compromised
**Mitigated by:** (a) The certification hash is independently verifiable — Publication can optionally verify the hash against a separate audit log or hash chain. (b) Service-role authentication prevents unauthenticated access. (c) Audit trail on gate decisions.

### Corrected Authorization Artifact

```json
{
  "authorization_id": "uuid",
  "submission_id": "uuid",
  "action": "MINT_DOI",
  "decision": "ALLOW",
  "certification_id": "uuid",
  "certification_hash": "sha256",
  "evidence_hash": "sha256",
  "constitution_version": "1.0.0",
  "issued_at": "timestamptz",
  "expires_at": "timestamptz",
  "nonce": "uuid"
}
```

---

## 6. EVENT CHAIN COMPLETENESS

### Verified Event Inventory

| Event | Exists in Code | Producer | Outbox Entry | Governance-Relevant |
| ----- | -------------- | -------- | ------------ | ------------------- |
| `ArticleSubmitted` | YES | `submit_article_transition` RPC | YES (explicit `outbox.id`) | YES |
| `EditorialCheckStarted` | NO | None | NO | YES but non-blocking |
| `EditorialCheckCompleted` | NO | None | NO | YES but non-blocking |
| `ReviewerAssigned` | NO | None (UI action, no outbox event) | NO | NO — reviewer identity is Publication-owned |
| `ReviewerAccepted` | NO | None | NO | NO — implied by ReviewSubmitted |
| `ReviewerDeclined` | YES | `declineReview` server action | YES (`outbox.id = assignmentId`) | PARTIAL — useful for audit but not certification |
| `ReviewSubmitted` | YES | `submitReview` server action | YES (`outbox.id = assignmentId`) | YES |
| `DecisionRecorded` | YES | `record_decision` RPC | YES (explicit, `outbox.id = decision_id`) | YES — critical for certification |
| `RevisionRequested` | NO | None (state exists as enum but no event) | NO | YES but derivable from DecisionRecorded type=MinorRevision/MajorRevision |
| `RevisionSubmitted` | NO | None | NO | YES — gap for multi-round certification |
| `AuditRecorded` | YES | Secondary event from submission/review RPCs | YES | NO — internal audit, not governance evidence |
| `NotificationQueued` | YES | Secondary event from submission RPC | YES | NO — notification, not governance evidence |

### Minimum Event Contract for Release Certification

Governance can certify a submission for release with:

1. `ArticleSubmitted` — proof of submission existence
2. `ReviewSubmitted` (N required) — proof of peer review
3. `DecisionRecorded` with `decision = Accept` — proof of editorial acceptance

**Missing events classified:**

| Missing Event | Classification |
| ------------- | -------------- |
| `EditorialCheckStarted/Completed` | NON-BLOCKING EVIDENCE GAP — desirable for audit completeness but not constitutionally required for release certification |
| `ReviewerAssigned` | NON-BLOCKING — reviewer assignment is a Publication workflow concern, not a constitutional certification requirement |
| `ReviewerAccepted` | NON-BLOCKING — implied by the existence of `ReviewSubmitted` |
| `RevisionRequested` | DERIVABLE — `DecisionRecorded` with `decision_type IN (MinorRevision, MajorRevision)` provides this evidence |
| `RevisionSubmitted` | FUTURE EVENT INSTRUMENTATION — required for multi-round certification but can be deferred to WP-GOV-02 since first-round certification does not require it |

**Conclusion: WP-GOV-01 can proceed with the existing event inventory.** The three core events (`ArticleSubmitted`, `ReviewSubmitted`, `DecisionRecorded`) provide sufficient constitutional evidence for initial release certification. Missing events should be instrumented in future work packages without modifying certified predecessors.

---

## 7. SPLIT-BRAIN ATTACK

| Entity | Authority | Governance Treatment | Split-Brain Risk |
| ------ | --------- | -------------------- | ---------------- |
| Article | PUBLICATION | **Forbidden duplicate** — Governance Prisma schema contains `model Article` with `title`, `abstract`, `authors`, `doi`, `pdfUrl`, `state`. Must be REMOVED. | **HIGH** if retained |
| Journal | PUBLICATION | **Forbidden duplicate** — Governance Prisma schema contains `model Journal` with `slug`, `name`, `issn`. Must be REMOVED. | **HIGH** if retained |
| Book | PUBLICATION | **Forbidden duplicate** — Governance Prisma schema contains `model Book` with `title`, `author`, `isbn`, `doi`. Must be REMOVED. | **HIGH** if retained |
| Author/reviewer identity | PUBLICATION | **Derived reference only** — Governance stores only `actor_id` (opaque UUID) from events | LOW |
| DOI | PUBLICATION | **Derived reference only** — Governance stores only the fact that a DOI mint was authorized, never the DOI value itself | LOW |
| Publication status | PUBLICATION | **Derived reference only** — Governance derives submission state from event sequence, never reads `articles.status` | LOW |
| Manuscript content | PUBLICATION | **Forbidden** — Governance must never ingest abstract text, HTML, or PDF | ZERO if designed correctly |
| Submission | PUBLICATION | **External reference** — Governance references `submission_id` only | LOW |
| Review | PUBLICATION | **External reference** — Governance references `assignment_id` and `recommendation` (semantic state) only | LOW |
| Decision | PUBLICATION | **External reference** — Governance references `decision_id`, `decision_type`, `submission_id` only | LOW |

### Governance Model API Routes That Constitute Split-Brain

| Route | Behavior | Verdict |
| ----- | -------- | ------- |
| `api/articles/route.ts` | Reads Governance `Article` table | **REMOVE** |
| `api/articles/[id]/route.ts` | Reads single Governance `Article` | **REMOVE** |
| `api/journals/route.ts` | Reads Governance `Journal` table | **REMOVE** |
| `api/books/route.ts` | Reads Governance `Book` table | **REMOVE** |
| `components/publications-explorer.tsx` | Renders Article/Journal/Book from Governance DB | **REMOVE** |
| `components/site/PublicationsSection.tsx` | Renders Article/Journal/Book from Governance DB | **REMOVE** |

**These components can be removed without affecting the existing Opus Publica publication website** because the website uses its own Supabase/PostgreSQL tables and Next.js routes. The Governance Model UI is a separate application that was never deployed as part of the Opus Publica website.

---

## 8. SECURITY BOUNDARY

### Attack Surface Analysis

**Attack 1: `SECURITY DEFINER` bypass.**
All Publication RPCs (`process_article_submission`, `process_review_submission`, `record_decision`, `process_single_audit_event`) use `SECURITY DEFINER`. These execute with the privileges of the function owner (typically `postgres`). If the Governance adapter's database role can call these functions, it can perform Publication mutations.

**Finding: CRITICAL.** WP-02-01 explicitly `REVOKE EXECUTE ... FROM PUBLIC` and `GRANT EXECUTE ... TO service_role` for `process_review_submission`. However, WP-01-01's `process_article_submission` does NOT contain these REVOKE/GRANT statements. If the Governance role inherits `PUBLIC` execute privileges, it could call `process_article_submission`.

**Mitigation:** The Governance database role (`governance_ingest_role`) must be created with:
```sql
CREATE ROLE governance_ingest_role NOLOGIN;
GRANT USAGE ON SCHEMA public TO governance_ingest_role;
GRANT SELECT ON public.outbox TO governance_ingest_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM governance_ingest_role;
```

**Attack 2: No RLS on `public.outbox`.**
The outbox table has no RLS enabled. Any role with `SELECT` can read all events, including those containing sensitive notification payloads (email addresses, article content). However, for the Governance adapter this is the intended behavior — it needs to read all events. The risk is that the Governance role can also `INSERT`/`UPDATE`/`DELETE` if granted table-level write access.

**Mitigation:** Grant only `SELECT`:
```sql
GRANT SELECT ON public.outbox TO governance_ingest_role;
-- No INSERT, UPDATE, DELETE grants
```

**Attack 3: Supabase `service_role` key.**
The `service_role` key bypasses ALL RLS. If the Governance adapter uses `service_role`, it can read and write every table in the database. This is the nuclear option and violates least privilege.

**Corrected architecture:** The Governance adapter must NOT use the `service_role` key. It must use a dedicated database role (`governance_ingest_role`) with explicit, minimal grants. The Governance API (gate endpoint) may use a separate role or a scoped Supabase edge function with its own credentials.

**Attack 4: Cross-schema access.**
If the Governance Prisma client connects as a user with access to both `public` and `governance` schemas, it could potentially join across schemas and inadvertently read Publication data beyond the outbox.

**Mitigation:** The Governance role's `search_path` must be set to `governance` only. Outbox reads use an explicit `public.outbox` qualified reference.

### Minimum Privilege Model

| Role | Schema | Tables | Permissions | Can call Publication RPCs |
| ---- | ------ | ------ | ----------- | ------------------------- |
| `governance_ingest_role` | `public` | `outbox` only | `SELECT` only | NO — all EXECUTE revoked |
| `governance_ingest_role` | `governance` | all governance tables | `SELECT, INSERT, UPDATE` | N/A |
| `governance_gate_role` | `governance` | certification, release tables | `SELECT` only | NO |

---

## 9. POLICY-AS-CODE

The previous review incorrectly classified Policy Engine as PASS. The actual status:

- `RegoPattern` model stores verbatim Rego code as strings. No interpreter exists.
- No OPA binary, WASM module, or evaluation harness exists anywhere in the repository.
- The certification evaluation route (`api/certification/evaluate/route.ts`) hardcodes PASS.

**Corrected classification: DESIGN INCOMPLETE.**

### Technology Evaluation

| Criterion | Embedded Rego/WASM | OPA Sidecar | Deterministic TypeScript Engine |
| --------- | ------------------ | ----------- | ------------------------------- |
| Determinism | YES | YES | YES (if carefully designed) |
| Security | Sandboxed WASM | Process isolation | Application-level (weaker) |
| Versioning | Policy WASM bundles | Policy bundles | Application code versioning |
| Explainability | Rego trace output | Decision logs | Custom implementation required |
| Deployment complexity | npm dependency | Container sidecar | Zero additional dependency |
| Offline capability | YES | Requires running sidecar | YES |
| Testability | `opa test` tooling | `opa test` tooling | Standard unit tests |
| Performance | Sub-millisecond | Network round-trip | Sub-millisecond |
| Auditability | Policy hash + trace | Decision logs | Code hash + test results |
| Maturity for this use | OVERKILL for MVP | OVERKILL for MVP | SUFFICIENT for MVP |

**Recommendation: Deterministic TypeScript Engine for WP-GOV-01.** The constitutional provisions are well-structured with explicit pass/fail criteria. A typed TypeScript evaluator with frozen rule snapshots provides determinism, zero dependency overhead, and full testability. The `RegoPattern` model can be retained as a future upgrade path, but WP-GOV-01 should not introduce a WASM/Rego dependency before the core certification loop is proven.

**Rationale for rejecting Rego/WASM in WP-GOV-01:** The 8 Rego patterns stored in `RegoPattern` are template strings, not executable policies. Building a WASM evaluation harness before the traceability graph, evidence model, and certification loop exist is premature optimization. Prove the loop first; optimize the engine later.

---

## 10. WEBSITE PRESERVATION

The existing Opus Publica website consists of:
- `app/(site)/*` — public-facing pages
- `app/api/*` — publication API routes
- `app/actions/*` — server actions
- `lib/*` — shared utilities

The proposed Governance integration touches NONE of these surfaces in WP-GOV-01. The only future integration point is the DOI mint route (`app/api/doi/mint/route.ts`), which would need to call the Governance gate before depositing. **That integration belongs in a later work package (WP-GOV-01E or later), NOT in WP-GOV-01A/B/C.**

**Website preservation: PASS.**

---

## 11. CERTIFIED PREDECESSOR PROTECTION

| Work Package | Status | Governance Can Consume Without Modification |
| ------------ | ------ | ------------------------------------------- |
| WP-01-02 | RETAIN AS-IS | YES — `ArticleSubmitted` event in outbox is sufficient |
| WP-02-01 | RETAIN AS-IS | YES — `ReviewSubmitted`/`ReviewDeclined` events in outbox are sufficient |
| WP-02-02 | RETAIN AS-IS | YES — no governance dependency |
| WP-03-01 | RETAIN AS-IS | YES — `DecisionRecorded` event with full payload is sufficient |
| WP-16-01 | RETAIN AS-IS | YES — outbox table creation is consumed, not modified |
| WP-16-02 | RETAIN AS-IS | YES — audit hash chain is independent of governance |
| WP-17-01 | RETAIN AS-IS | YES — retry columns are Publication-internal |
| WP-19-01 | RETAIN AS-IS | YES — no governance dependency |
| WP-20-01 | RETAIN AS-IS | YES — storage infrastructure is Publication-owned |
| WP-20-02 | RETAIN AS-IS | YES — storage manifests are Publication-owned |

**No certified predecessor needs modification.**

**Note: WP-01-01's `process_article_submission` lacks `REVOKE EXECUTE FROM PUBLIC` (unlike WP-02-01). This is a pre-existing security gap, NOT a Governance blocker. It should be addressed as a separate corrective maintenance task.**

---

## 12. ARCHITECTURAL DECISION

### B. APPROVE WITH MANDATORY PRE-IMPLEMENTATION CORRECTIONS

The architecture is fundamentally sound but contains three design defects that must be corrected before implementation:

**MANDATORY CORRECTION 1:** Replace `last_processed_created_at` watermark with overlap-window polling + receipt ledger strategy. The timestamp watermark is unsafe for multi-event transactions and in-flight commit ordering.

**MANDATORY CORRECTION 2:** Specify the certification reproducibility artifact (constitution version, evidence hash, certification hash). The previous design left this as DESIGN INCOMPLETE, which is incompatible with the constitutional requirement for explainable, auditable release authorization.

**MANDATORY CORRECTION 3:** Replace `service_role` with a dedicated least-privilege `governance_ingest_role` PostgreSQL role. Using `service_role` violates the security boundary.

---

## 13. DESIGN CORRECTION PACKAGE

### 1. Governance Bounded Context
- Dedicated `governance` PostgreSQL schema
- Prisma client targeting `governance` schema only
- No cross-schema foreign keys to `public`

### 2. Publication Bounded Context
- Unchanged
- `public` schema remains authoritative for all publication data
- Outbox remains Publication-owned and immutable from Governance perspective

### 3. Event Ingestion Boundary
- Overlap-window polling with `(created_at, id)` cursor
- `governance.event_receipt` deduplication ledger
- `governance.ingestion_cursor` watermark table
- Payload projection/minimization at ingestion time

### 4. Evidence Ledger
- `governance.evidence` table storing immutable projected payloads
- SHA-256 hash of raw payload at ingestion
- Constitution version binding at ingestion
- Adapter version recorded

### 5. Traceability Graph
- `governance.traceability_node` and `governance.traceability_edge`
- Derived from evidence records, not from raw outbox events
- Node types: `SUBMISSION`, `REVIEW`, `DECISION`, `PROVISION`, `CERTIFICATION`
- Edge types: `SATISFIES`, `REQUIRES`, `SUPERSEDES`, `EVIDENCES`

### 6. Certification Engine
- TypeScript evaluator with frozen rule snapshots
- Input: submission_id + traceability graph
- Output: `CertificationResult` with deterministic hash
- States: `NOT_EVALUATED`, `EVALUATING`, `PASS`, `FAIL`, `BLOCKED`, `EXPIRED`, `REVOKED`

### 7. Policy Engine
- TypeScript-based deterministic evaluator for WP-GOV-01
- `RegoPattern` model retained for future upgrade
- No WASM/OPA dependency in initial implementation

### 8. Release Authorization
- `/api/governance/gates/authorize` endpoint
- Returns signed authorization artifact with `certification_hash`, `expires_at`, `nonce`
- Publication must verify artifact before executing DOI mint
- Single-use nonce prevents replay

### 9. Security Model
- `governance_ingest_role`: SELECT on `public.outbox`, WRITE on `governance.*`
- `governance_gate_role`: SELECT on `governance.*`
- No `service_role` usage
- All Publication RPCs explicitly revoked from governance roles
- No RLS bypass

### 10. Failure Model
- Editorial workflow: fail-open (Governance unavailability does not block)
- DOI minting / publication: fail-closed (must receive ALLOW before proceeding)
- Event ingestion: overlap-window ensures eventual consistency
- Poison events: quarantined in `governance.dead_letter`, generate AuditFinding

### 11. Reproducibility Model
- Every certification result includes a deterministic `certification_hash`
- Hash computed over: constitution_version + provision_versions + evidence_hash + evaluator_version
- Verification: replay evaluation against frozen evidence and compare hashes

### 12. Audit Model
- All gate decisions recorded in `governance.gate_audit`
- All certification evaluations recorded with full input/output
- All ingestion failures recorded with error context

---

## 14. IMPLEMENTATION SEQUENCING

### WP-GOV-01A — Governance Schema Foundation
- **Objective:** Establish the `governance` PostgreSQL schema, adapt the Prisma schema (remove Article/Journal/Book, switch to PostgreSQL provider), create the foundation tables.
- **Allowed files:** New `governance/prisma/schema.prisma`, new `governance/migrations/*`
- **Protected files:** All `supabase/migrations/*`, all `app/*`, all `lib/*`, all `backend/*`
- **Dependencies:** None
- **Certification evidence:** Schema created, duplicate publication models absent, `governance_ingest_role` created with correct grants
- **Runtime verification:** MANDATORY — connect with governance role, verify SELECT on outbox succeeds, verify INSERT on public.articles fails

### WP-GOV-01B — Event Ingestion Adapter
- **Objective:** Build the overlap-window poller, receipt ledger, and evidence projection pipeline.
- **Allowed files:** New `governance/workers/ingestion-adapter.ts`, new `governance/lib/*`
- **Protected files:** All `supabase/migrations/*`, all `app/*`, all `backend/workers/*`
- **Dependencies:** WP-GOV-01A
- **Certification evidence:** Synthetic outbox events correctly projected into evidence records with payload minimization and deduplication
- **Runtime verification:** MANDATORY — inject duplicate events, verify deduplication; inject out-of-order events, verify graph handles gracefully

### WP-GOV-01C — Traceability Graph Engine
- **Objective:** Build the graph construction and traversal logic from ingested evidence.
- **Allowed files:** New `governance/lib/traceability.ts`
- **Protected files:** All Publication Plane files
- **Dependencies:** WP-GOV-01B
- **Certification evidence:** Graph correctly represents Submission→Review→Decision→Provision chain; missing evidence correctly leaves graph incomplete
- **Runtime verification:** MANDATORY

### WP-GOV-01D — Certification Engine
- **Objective:** Build the TypeScript certification evaluator that traverses the graph and produces deterministic CertificationResult artifacts.
- **Allowed files:** New `governance/lib/certification.ts`, new `governance/api/certification/*`
- **Protected files:** All Publication Plane files
- **Dependencies:** WP-GOV-01C
- **Certification evidence:** PASS on complete evidence, FAIL on contradictory evidence, BLOCKED on missing evidence; certification hash is deterministically reproducible
- **Runtime verification:** MANDATORY

### WP-GOV-01E — Release Gate API
- **Objective:** Build the `/api/governance/gates/authorize` endpoint and integrate it with the Publication Plane's DOI minting route.
- **Allowed files:** New `governance/api/gates/*`, MODIFICATION of `app/api/doi/mint/route.ts` (gate check addition only)
- **Protected files:** All other Publication Plane files
- **Dependencies:** WP-GOV-01D
- **Certification evidence:** DOI mint blocked when certification is FAIL/BLOCKED; DOI mint proceeds when ALLOW; authorization artifact includes certification_hash and is time-bounded; replay of expired authorization is rejected
- **Runtime verification:** MANDATORY

---

## 15. FINAL REVIEW TABLE

| Area                             | PASS | FAIL | BLOCKER | DESIGN CORRECTION |
| -------------------------------- | ---- | ---- | ------- | ----------------- |
| Domain separation                | ✓    |      |         |                   |
| Outbox ownership                 | ✓    |      |         |                   |
| Event identity                   | ✓    |      |         |                   |
| Event ingestion                  |      |      |         | Watermark strategy must be replaced with overlap-window + receipt ledger |
| Event ordering                   |      |      |         | `(created_at, id)` composite cursor required; timestamp-only is unsafe |
| Evidence integrity               | ✓    |      |         |                   |
| Certification reproducibility    |      |      |         | Certification artifact with deterministic hash must be specified |
| Certification engine             |      |      |         | TypeScript evaluator replaces Rego/WASM for MVP |
| Policy engine                    |      |      |         | Defer Rego/WASM; use TypeScript evaluator for MVP |
| Release authorization            |      |      |         | Authorization artifact must include nonce, expiry, certification_hash |
| Replay protection                |      |      |         | Nonce + expiry required in gate artifact |
| Security                         |      |      |         | Dedicated `governance_ingest_role` replaces `service_role` |
| Failure model                    | ✓    |      |         |                   |
| Constitutional versioning        |      |      |         | Evidence records must bind constitution version at ingestion |
| Website preservation             | ✓    |      |         |                   |
| Certified predecessor protection | ✓    |      |         |                   |

---

### FINAL ENGINEERING DECISION

## APPROVE WITH MANDATORY PRE-IMPLEMENTATION CORRECTIONS

The seven design corrections enumerated above (ingestion strategy, certification reproducibility, security model, authorization artifact, policy engine selection, constitutional version binding, event ordering cursor) must be incorporated into the WP-GOV-01 engineering specification before implementation authorization is granted.

The fundamental architecture (separate governance schema, read-only outbox consumption, traceability graph, certification engine, release gates) is sound and well-supported by repository evidence.

No certified predecessor needs modification.

---

**FILES MODIFIED: NONE**

**COMMITS MADE: NONE**
