# WP-GOV-01 Design Correction & Evidence Reconciliation

## A. Executive Finding
The previous WP-GOV-01 design assessment contained dangerous assumptions regarding the outbox ordering guarantees, event identity constraints, and read/write boundaries. Specifically, the outbox lacks strict monotonically increasing sequence numbers and is owned exclusively by the Publication Plane, meaning Governance cannot safely modify the outbox `status` field. WP-GOV-01 must implement a Governance-owned ingestion cursor and strictly adhere to an immutable-publication boundary.

## B. Evidence Inventory
- `public.outbox` architecture (`20260810_wp1601_audit_reimplementation.sql`, `20260810_wp1701_outbox_retry.sql`)
- Submission Domain (`20260811_wp0101_submission_outbox.sql`, `20260811_wp0102_submission_domain_remediation.sql`)
- Review Domain (`20260812_wp0201_review_outbox.sql`)
- Decision Domain (`20260814000000_wp0301_decision_core.sql`)
- Notifications/API boundary (`app/api/notifications/route.ts`)

## C. Publication Outbox Forensic

| Event | Exists? | Producer | Event ID | Idempotency | Payload completeness | Ordering evidence | Consumer | Runtime evidence |
| ----- | ------- | -------- | -------- | ----------- | -------------------- | ----------------- | -------- | ---------------- |
| `ArticleSubmitted` | YES | WP-01 | `outbox.id` | Via `outbox.id` generation | Canonical (Abstract, authors, journal) | `created_at` timestamp | WP-01 worker | Verified in SQL |
| `ReviewerAssigned` | NO | None | N/A | N/A | N/A | N/A | None | UNVERIFIED |
| `ReviewSubmitted` | YES | WP-02 | `outbox.id` | Handled internally | Missing specific reviewer ID | `created_at` timestamp | WP-02 worker | Verified in SQL |
| `DecisionRecorded` | YES | WP-03 | `outbox.id` = `decision_id` | `intent_hash` & `idempotency_key` | Canonical (decision, rationale, editors) | `created_at` timestamp | WP-03 worker | Verified in SQL |
| `RevisionRequested`| NO | None | N/A | N/A | N/A | N/A | None | UNVERIFIED |

*Note: Some events are planned but not yet implemented in the outbox pattern.*

## D. Identity and Idempotency Matrix
- **Event Identity:** `public.outbox.id` (UUIDv4) is the authoritative identity of the event instance.
- **Event Deduplication:** Governance must use `outbox.id` as its ingestion watermark/deduplication key.
- **Business Idempotency:** The Publication Plane handles business idempotency (e.g., `intent_hash` in `decisions`). Governance relies on the outbox event ID.
- **Traceability Identity:** The Governance `TraceabilityNode` maps 1:1 to `outbox.id`.
- **Aggregate Identity:** `submission_id` acts as the root identifier for linking a submission to its reviews and decisions.

## E. Event Ordering Analysis
**Ordering Evidence:** The `public.outbox` uses UUIDv4 for `id` and a `created_at` timestamp. **There is no monotonic database sequence or commit-ordering cursor (like LSN).** Timestamps can suffer from clock skew and concurrent transaction commit reordering.
**Handling Strategy:** Governance cannot rely on exact strict ordering from the outbox. It must build a graph dynamically where missing prerequisite nodes (e.g. a `DecisionRecorded` arriving before its `ReviewSubmitted`) put the evaluation into an `EVALUATING` (incomplete) state until all topological dependencies resolve.

## F. Event Payload / Data Minimization
- **Current Payloads:** Exist as raw `jsonb` dumps in the outbox containing publication data (e.g., `abstract`, `comments`).
- **Governance Requirement:** Governance does not need the `abstract` or `comments`.
- **Minimization Strategy:** The Governance Ingestion Adapter must project/strip the payload in memory, extracting only `event_type`, identifiers (`submission_id`, `decision_id`, `actor_id`), and semantic state (`decision = Accept`), discarding raw text before persisting the `TraceabilityNode`.

## G. Governance Ingestion Architecture
**Correction:** Governance must **not** update `status` in `public.outbox`. Doing so violates the Bounded Context.
- **State Model:** Governance maintains its own `IngestionCursor` table mapping `outbox.id` to a `processed_at` timestamp in the `governance` schema.
- **Mechanism:** A scheduled worker polls `public.outbox` for records where `created_at > last_watermark`, filters out already-ingested UUIDs, and writes to the Governance graph.
- **Immutability:** The Publication Plane remains completely immutable from Governance's perspective.

## H. Security and Least Privilege
- **Identity:** The Governance Adapter runs under a dedicated service role or application credential, not the generic `authenticated` web user.
- **Permissions:** 
  - `GRANT SELECT ON public.outbox TO governance_ingest_role;`
  - NO write access to `public.outbox` or any Publication tables.
  - Write access ONLY to the `governance` schema.
- **Gate API:** Evaluated via Supabase Service Role RPC; standard users cannot bypass or fake gate responses.

## I. Governance Schema Adaptation

| Model | Current purpose | Authority | Keep | Adapt | Remove | External reference |
| ----- | --------------- | --------- | ---- | ----- | ------ | ------------------ |
| `Article` | Publication UI | Publication | NO | NO | **YES** | `submission_id` |
| `Journal` | Publication UI | Publication | NO | NO | **YES** | `journal_id` |
| `Book` | Publication UI | Publication | NO | NO | **YES** | `book_id` |
| `Provision` | Constitution | Governance | YES | YES | NO | N/A |
| `TraceabilityNode` | Audit Graph | Governance | YES | YES | NO | Enforce strict payload constraints |
| `AuditFinding` | Self-Audit | Governance | YES | YES | NO | N/A |
| `Release` / `Signoff` | Gate Control | Governance | YES | YES | NO | Target `submission_id` |
| `RegoPattern` | Policy Code | Governance | YES | YES | NO | N/A |

## J. Traceability Architecture
- **Node Identity:** Governance UUID linked to `outbox_event_id`.
- **Node Type:** Mapped from `event_type` (e.g., `EVIDENCE_DECISION`).
- **Edge Semantics:**
  - `SATISFIES`: Evidence -> Provision.
  - `REQUIRES`: Gate -> Provision.
  - `SUPERSEDES`: Revision 2 -> Revision 1.
- **Missing Evidence:** The graph supports dangling edges. Certification evaluates to `EVALUATING` (Incomplete).

## K. Certification Engine Readiness
**STATUS: DESIGN INCOMPLETE**
The engine requires concrete logic to:
A. Take a `submission_id`.
B. Traverse the Traceability graph for all constitutional provisions required by the target Journal.
C. Assert that matching `EVIDENCE` nodes exist for each provision.
D. Handle contradictions (e.g. 2 Reject reviews but an Accept decision) by failing the certification.
E. Hash the specific Traceability nodes evaluated to generate a reproducible `CertificationResult` version.

## L. Release Gate Authority Model
- **Request:** Publication Plane POSTs to `/api/gates/authorize` with `{ action: 'MINT_DOI', submission_id: '123' }`.
- **Evaluation:** Governance looks up the most recent `CertificationResult` for `submission_id`.
- **Response:** Returns `ALLOW`, `DENY`, or `BLOCKED` with evidence hashes.
- **Crucial Rule:** Governance responds with a Boolean equivalent; the Publication Plane executes the actual DOI minting based on the response.

## M. Fail-Open / Fail-Closed Matrix

| Action | Gate Type | Governance Offline Behavior |
| ------ | --------- | --------------------------- |
| Submission | None | Proceed (Async outbox) |
| Review Assignment | Advisory | Proceed (Async outbox) |
| Review Submission | Advisory | Proceed (Async outbox) |
| Editorial Decision | Advisory | Proceed (Async outbox) |
| **DOI Minting** | Mandatory | **BLOCK (Fail-Closed)** |
| **Publication Finalization**| Mandatory | **BLOCK (Fail-Closed)** |

## N. Policy-as-Code Decision
**Embedded WASM/Rego inside Node.js.**
*Why:* Provides deterministic, offline execution with high performance and zero network latency. Prevents the operational complexity of deploying a standalone OPA sidecar. Policies can be securely version-controlled alongside the application.

## O. Website Preservation
The frontend (`app/(site)/...`) remains entirely untouched. The Governance ingestion adapter and Release Gate API run exclusively in the backend. 

## P. Certified Work Package Protection
WP-01-02, WP-02-01, WP-03-01, WP-16-01, WP-17-01 are completely protected. Because Governance adopts a zero-mutation read-only polling model against `public.outbox`, no predecessor packages need to be modified or reopened.

## Q. Exact Implementation Boundary
- **Allowed to Modify:** `prisma/schema.prisma` (to change to postgres and remove duplicates), `src/app/api/governance/*`, background workers specific to Governance ingestion.
- **MUST NOT Modify:** `public` schema migrations, existing Next.js frontend pages, existing Submission/Review/Decision API routes or Outbox processing RPCs.

## R. Runtime Certification Requirements
Governance cannot be certified merely by compiling. Runtime certification requires:
1. Injecting synthetic outbox events.
2. Proving the adapter successfully translates them to Traceability Nodes.
3. Proving the Certification Engine correctly traverses the graph and produces a FAIL on missing evidence and a PASS on complete evidence.
4. Proving the Release Gate successfully blocks a simulated Publication action when the engine returns FAIL.

## S. Open Architectural Decisions
- The exact mapping of out-of-order events (e.g., receiving a `DecisionRecorded` before a `ReviewSubmitted` due to async outbox processing delays). The graph engine must handle topological sorting dynamically.

## T. Final Authorization Decision

**READY FOR WP-GOV-01 IMPLEMENTATION AUTHORIZATION**

---
**FILES MODIFIED: NONE**

**COMMITS MADE: NONE**
