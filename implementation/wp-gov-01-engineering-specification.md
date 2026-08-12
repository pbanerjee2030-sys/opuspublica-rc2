# WP-GOV-01 Engineering Specification

**Status:** FORMAL ENGINEERING SPECIFICATION
**Date:** 2026-08-11
**Predecessor:** WP-GOV-01 Adversarial Architecture Review (APPROVED WITH CORRECTIONS)

---

# Part I — Architectural Position

## 1.1 Bounded Contexts

### Publication Plane (EXISTING — PROTECTED)

The existing Opus Publica system is the sole authority for:

- Submissions (`public.submissions`)
- Articles (`public.articles`)
- Journals (`public.journals`)
- Books (`public.books`)
- Reviews (`public.reviewer_assignments`)
- Decisions (`public.decisions`)
- Publication state (article status lifecycle)
- DOI operations (`/api/doi/mint`)
- Publication storage (Supabase Storage)
- Transactional outbox (`public.outbox`)
- Audit hash chain (`public.audit_log`)

### Governance Control Plane (NEW — THIS SPECIFICATION)

A separate bounded context responsible for:

- Constitutional rules (Provisions)
- Machine-readable provisions (MRC)
- Architectural Traceability Graph (ATG)
- Derived evidence from Publication events
- Continuous Certification Engine (CCE)
- Deterministic policy evaluation
- Release authorization (gates)
- Governance audit evidence
- SLO/SLA tracking
- Amendment lifecycle

Governance MUST NOT become a second Publication authority.

## 1.2 Architectural Invariants

These are non-negotiable. Any implementation that violates these invariants is rejected.

| # | Invariant |
|---|-----------|
| GOV-INV-01 | Publication executes; Governance verifies. |
| GOV-INV-02 | Governance never mutates Publication state. No INSERT, UPDATE, or DELETE on any `public.*` table. |
| GOV-INV-03 | Publication is the sole Article authority. No second `Article` entity exists in the Governance schema. |
| GOV-INV-04 | Publication is the sole Submission authority. |
| GOV-INV-05 | Publication is the sole Journal authority. No second `Journal` entity exists in the Governance schema. |
| GOV-INV-06 | Publication is the sole Book authority. No second `Book` entity exists in the Governance schema. |
| GOV-INV-07 | Governance evidence is derived exclusively from Publication outbox events. |
| GOV-INV-08 | Source evidence records are append-only and immutable once written. |
| GOV-INV-09 | Certification results are reproducible: identical evidence + identical rules + identical evaluator = identical certification hash. |
| GOV-INV-10 | Release authorization artifacts are object-bound, action-bound, evidence-bound, time-limited, and replay-resistant. |
| GOV-INV-11 | Protected release actions (DOI minting, final publication, archival finalization) fail closed when Governance is unavailable. |
| GOV-INV-12 | Ordinary editorial actions (submission, review, decision) fail open when Governance is unavailable. |
| GOV-INV-13 | Certified predecessor work packages (WP-01-02, WP-02-01, WP-02-02, WP-03-01, WP-16-01, WP-16-02, WP-17-01, WP-19-01, WP-20-01, WP-20-02) are not modified. |
| GOV-INV-14 | Missing evidence, evaluator failure, unavailable Governance, ambiguous evidence, or contradictory evidence MUST NEVER produce a PASS certification result. |
| GOV-INV-15 | The existing Opus Publica website remains unchanged. Governance attaches around the Publication Plane; it does not rewrite it. |
| GOV-INV-16 | Governance never stores manuscript content, PDFs, reviewer identities beyond opaque UUIDs, author profiles, or DOI ownership records. |

---

# Part II — Governance Database

## 2.1 Schema Strategy

A dedicated `governance` PostgreSQL schema inside the existing Supabase PostgreSQL instance.

**Rationale:** The Governance Model currently uses SQLite (`datasource db { provider = "sqlite" }`). Migration to a `governance` schema within the existing PostgreSQL cluster provides:

- Transactional reads against `public.outbox` without network hops
- Shared backup infrastructure
- Operational simplicity
- Strict schema-level isolation via PostgreSQL `search_path` and role grants

The Governance Prisma client MUST target `provider = "postgresql"` with `schemas = ["governance"]` and all models annotated `@@schema("governance")`.

## 2.2 Forbidden Duplicate Models

The following models from the external Governance Prisma schema are **forbidden** in the integrated Governance schema:

| Model | Reason | Replacement |
|-------|--------|-------------|
| `Article` | Creates second Article authority (GOV-INV-03) | External reference via `submission_id` / `article_id` stored as opaque UUID fields in evidence records |
| `Journal` | Creates second Journal authority (GOV-INV-05) | External reference via `journal_id` in evidence records |
| `Book` | Creates second Book authority (GOV-INV-06) | External reference via `book_id` in evidence records |

Associated API routes (`api/articles/*`, `api/journals/*`, `api/books/*`) and UI components (`publications-explorer.tsx`, `PublicationsSection.tsx`) from the Governance Model application are NOT migrated.

## 2.3 Retained Models

All other Governance models are retained and adapted to `@@schema("governance")`:

`Provision`, `Slo`, `Sla`, `CertificationCriterion`, `Release`, `Signoff`, `TraceabilityNode`, `TraceabilityEdge`, `IntegrityRuleResult`, `AuditFinding`, `Amendment`, `OperationalRole`, `Runbook`, `GovernanceDoc`, `RoadmapPhase`, `Component`, `RegoPattern`, `DataFlow`, `Adr`, `Threshold`, `ContactMessage`, `Office`

---

# Part III — Event Ingestion

## 3.1 Publication Outbox Schema (Current — Verified)

```sql
CREATE TABLE IF NOT EXISTS public.outbox (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    processed_at timestamptz,
    retry_count integer NOT NULL DEFAULT 0,   -- WP-17-01
    next_retry_at timestamptz,                -- WP-17-01
    last_error text                           -- WP-17-01
);

CREATE INDEX idx_outbox_status ON public.outbox(status);
CREATE INDEX idx_outbox_next_retry_at ON public.outbox(next_retry_at);
```

**NO authoritative per-aggregate ordering field exists.** No `SERIAL`/`BIGSERIAL` sequence column. No monotonic LSN. `id` is UUIDv4 (random, non-sortable). `created_at` is a transaction-scoped timestamp.

**NO Row Level Security is enabled on `public.outbox`.** This was verified by exhaustive search of all migrations. However, absence of RLS does not prove arbitrary authenticated user access — Supabase table-level grants and PostgREST configuration also control access. The actual grants MUST be verified at runtime (see §3.7).

## 3.2 Outbox Event Identity (Verified)

The `outbox.id` field has **inconsistent semantics** across event types:

| Event Type | `outbox.id` source | Identity semantics |
|------------|--------------------|--------------------|
| `ArticleSubmitted` | `gen_random_uuid()` (explicit `v_event_id` in WP-01-02) | Unique event instance ID, distinct from `submission_id` and `article_id` |
| `ReviewSubmitted` | `payload.assignmentId` (set in `submitReview.ts` L71) | Conflated with domain entity ID (`reviewer_assignments.id`) |
| `ReviewDeclined` | `payload.assignmentId` (set in `submitReview.ts` L154) | Conflated with domain entity ID (`reviewer_assignments.id`) |
| `DecisionRecorded` | `v_new_decision_id` (WP-03-01 L175) | Explicitly `= decision_id` by design |
| `AuditRecorded` | `gen_random_uuid()` (default) | Unique event instance ID |
| `NotificationQueued` | `gen_random_uuid()` (default) | Unique event instance ID |

**Governance consequence:** `outbox.id` is always unique (PK constraint) but its semantic meaning varies. Governance MUST treat `outbox.id` strictly as a **deduplication key** without inferring domain semantics from the UUID value itself. Domain identifiers must be extracted from `payload`.

## 3.3 Existing Event Inventory (Verified)

| Event | Exists | Producer | `outbox.id` | Payload Fields Useful for Governance | Ordering |
|-------|--------|----------|-------------|--------------------------------------|----------|
| `ArticleSubmitted` | YES | `submit_article_transition` RPC (WP-01-02) | Dedicated event UUID | `submission_id`, `article_id`, `actor_id`, `idempotency_key`, `journalId` | `created_at` only |
| `ReviewSubmitted` | YES | `submitReview` server action | `= assignmentId` | `assignmentId`, `actorId`, `recommendation`, `scores`, `fingerprint` | `created_at` only |
| `ReviewDeclined` | YES | `declineReview` server action | `= assignmentId` | `assignmentId`, `actorId`, `fingerprint` | `created_at` only |
| `DecisionRecorded` | YES | `record_decision` RPC (WP-03-01) | `= decision_id` | `decision_id`, `submission_id`, `decision`, `decided_by`, `decided_at` | `created_at` only |
| `AuditRecorded` | YES | Secondary event from RPCs | Random UUID | `actor_id`, `action`, `target_type`, `target_id` | `created_at` only |
| `NotificationQueued` | YES | Secondary event from RPCs | Random UUID | Email payload (SENSITIVE — must not be ingested) | `created_at` only |
| `EditorialCheckStarted` | NO | — | — | — | — |
| `EditorialCheckCompleted` | NO | — | — | — | — |
| `ReviewerAssigned` | NO | — | — | — | — |
| `ReviewerAccepted` | NO | — | — | — | — |
| `RevisionRequested` | NO | — | — | — | — |
| `RevisionSubmitted` | NO | — | — | — | — |

### 3.3.1 Governance-Relevant Events

Governance ingests ONLY these event types:

1. **`ArticleSubmitted`** — proof of submission existence and journal binding
2. **`ReviewSubmitted`** — proof of peer review completion with recommendation
3. **`ReviewDeclined`** — proof of reviewer declining (audit completeness)
4. **`DecisionRecorded`** — proof of editorial decision with decision type

Governance MUST NOT ingest:
- `NotificationQueued` — contains email addresses; no governance value
- `AuditRecorded` — internal audit chain; handled by WP-16-01/WP-16-02

### 3.3.2 Missing Event Classification

| Missing Event | Classification | Rationale |
|---------------|----------------|-----------|
| `EditorialCheckStarted/Completed` | NON-BLOCKING EVIDENCE GAP | Desirable for audit completeness; not constitutionally required for release certification |
| `ReviewerAssigned` | NON-BLOCKING | Reviewer assignment is a Publication workflow concern; implicit from `ReviewSubmitted` existence |
| `ReviewerAccepted` | NON-BLOCKING | Implied by `ReviewSubmitted` (cannot submit without accepting) |
| `RevisionRequested` | DERIVABLE | `DecisionRecorded` with `decision IN ('MinorRevision', 'MajorRevision')` provides this evidence |
| `RevisionSubmitted` | FUTURE EVENT INSTRUMENTATION | Required for multi-round certification; deferred to WP-GOV-02 |

### 3.3.3 Minimum Evidence Set for Release Certification

A submission MAY be certified for release when ALL of the following exist:

1. At least one `ArticleSubmitted` event for the `submission_id`
2. At least N `ReviewSubmitted` events (N defined by journal-level constitutional provisions) referencing assignments linked to the submission
3. Exactly one non-superseded `DecisionRecorded` event with `decision = 'Accept'` for the `submission_id`

If ANY of the above is absent, certification result is `BLOCKED`.

## 3.4 Rejected Ingestion Strategy

The previous design used a `last_processed_created_at` timestamp watermark.

**REJECTED.** This strategy fails under:

- **Case A:** Multi-event transactions (e.g., `ArticleSubmitted` + `AuditRecorded` + `NotificationQueued` share identical `created_at`)
- **Case B:** In-flight transaction reordering (Transaction A begins at T=1, commits at T=5; Transaction B begins at T=2, commits at T=3; poll at T=4 misses A)
- **Case E:** Late events with `created_at` earlier than the watermark are permanently invisible

## 3.5 Corrected Ingestion Strategy

### 3.5.1 Overlap-Window Polling

The adapter polls `public.outbox` using an overlap window to compensate for in-flight transactions.

**Poll query:**
```sql
SELECT id, event_type, payload, created_at
FROM public.outbox
WHERE event_type IN ('ArticleSubmitted', 'ReviewSubmitted', 'ReviewDeclined', 'DecisionRecorded')
  AND created_at >= ($last_poll_start - $OVERLAP_INTERVAL)
ORDER BY created_at ASC, id ASC
```

**Parameters:**
- `$OVERLAP_INTERVAL`: 60 seconds (configurable). This compensates for the maximum expected in-flight transaction duration.
- `$last_poll_start`: The `created_at` of the most recently successfully processed event from the previous poll cycle.

**Deterministic traversal:** The `ORDER BY created_at ASC, id ASC` provides a deterministic `(created_at, id)` composite cursor. When multiple events share the same `created_at`, the UUID comparison provides a stable tiebreaker.

### 3.5.2 Event Receipt Ledger

```
governance.event_receipt (
    outbox_event_id   uuid PRIMARY KEY,
    event_type        text NOT NULL,
    received_at       timestamptz NOT NULL DEFAULT now(),
    projected         boolean NOT NULL DEFAULT false,
    projection_error  text,
    attempt_count     integer NOT NULL DEFAULT 0
)
```

Every fetched `outbox.id` is checked against this ledger:
- If `outbox_event_id` exists and `projected = true`: skip (already processed)
- If `outbox_event_id` exists and `projected = false`: retry projection
- If `outbox_event_id` does not exist: `INSERT ... ON CONFLICT DO NOTHING`, then project

### 3.5.3 Ingestion Cursor

```
governance.ingestion_cursor (
    cursor_id         text PRIMARY KEY DEFAULT 'primary',
    last_poll_start   timestamptz NOT NULL,
    last_poll_end     timestamptz NOT NULL,
    events_processed  bigint NOT NULL DEFAULT 0,
    updated_at        timestamptz NOT NULL DEFAULT now()
)
```

After each successful poll cycle, `last_poll_start` advances to `MAX(created_at)` of newly processed events.

### 3.5.4 Idempotent Projection

The projection step (writing evidence records from outbox events) is idempotent:
- Evidence records use `outbox_event_id` as a unique constraint
- `INSERT INTO governance.evidence ... ON CONFLICT (source_event_id) DO NOTHING`
- After successful projection, `governance.event_receipt.projected` is set to `true`

### 3.5.5 Dead-Letter State

Events that fail projection after 5 attempts are marked as dead-lettered:

```
governance.dead_letter (
    outbox_event_id   uuid PRIMARY KEY,
    event_type        text NOT NULL,
    raw_payload       jsonb NOT NULL,
    error_message     text NOT NULL,
    attempts          integer NOT NULL,
    dead_lettered_at  timestamptz NOT NULL DEFAULT now()
)
```

Dead-lettered events generate a `SEV-2` `AuditFinding` in the Governance schema.

### 3.5.6 Crash Recovery

| Failure Point | Recovery Mechanism |
|---------------|-------------------|
| Crash after reading outbox, before writing receipt | Next poll re-reads the event (overlap window); receipt INSERT is idempotent |
| Crash after writing receipt, before projection | Next cycle retries unprojected receipts (`projected = false`) |
| Crash after projection, before updating cursor | Next poll re-reads some events; deduplication prevents double-projection |
| Worker restart | Reads cursor, resumes from `last_poll_start - OVERLAP_INTERVAL` |

### 3.5.7 Concurrent Worker Handling

Multiple adapter instances are safe:
- Receipt ledger `INSERT ... ON CONFLICT DO NOTHING` ensures exactly one receipt per event
- Evidence projection `INSERT ... ON CONFLICT DO NOTHING` ensures exactly one evidence record
- Cursor updates are per-worker-instance (use `cursor_id = worker_instance_id` if multiple)
- No distributed locking required; at-least-once delivery with idempotent processing

### 3.5.8 Periodic Reconciliation

An overlap window alone does NOT provide absolute guarantees. A reconciliation mechanism is required.

**Reconciliation schedule:** Every 6 hours (configurable).

**Reconciliation query:**
```sql
SELECT o.id
FROM public.outbox o
LEFT JOIN governance.event_receipt r ON r.outbox_event_id = o.id
WHERE o.event_type IN ('ArticleSubmitted', 'ReviewSubmitted', 'ReviewDeclined', 'DecisionRecorded')
  AND o.created_at >= (now() - interval '7 days')
  AND r.outbox_event_id IS NULL
ORDER BY o.created_at ASC, o.id ASC
```

This scans the last 7 days of outbox events (configurable) and identifies any that lack a corresponding receipt.

**Duplicate prevention:** The receipt ledger's `INSERT ... ON CONFLICT DO NOTHING` ensures that reconciliation does not re-process already-ingested events.

**Recovery:** Missing events discovered by reconciliation are processed through the normal projection pipeline.

**Interaction with receipt ledger:** Reconciliation writes to the same `event_receipt` and `evidence` tables using the same idempotent operations. It is indistinguishable from normal polling except for its broader time window.

### 3.5.9 Future Evolution (Not WP-GOV-01)

PostgreSQL logical replication / CDC provides WAL-based ordering with guaranteed event delivery. This eliminates the need for overlap windows and reconciliation. It is recommended as a WP-GOV-02 evolution once the core ingestion pipeline is proven. The Publication Plane MUST NOT be modified to introduce a sequence column.

## 3.6 Payload Minimization

The specification strictly distinguishes between **source event access** and **durable governance evidence storage**. 

While the Governance ingestion role MAY temporarily inspect a `public.outbox` event payload in memory to route it, the durable evidence ledger (`governance.evidence.evidence_payload`) MUST persist ONLY the absolute minimum constitutionally relevant evidence fields required for traceability, certification, auditability, and release authorization.

Governance MUST NEVER persist:
- `abstract`, `content`, `title` (raw manuscript content)
- `storagePath`, `pdfUrl` (file references)
- `comments`, `comments_to_author`, `comments_internal` (review text, internal comments)
- `email` or notification presentation templates/payloads
- `authorIds`, `externalCoAuthors`, reviewer identities (except opaque UUIDs)
- Unrelated Publication fields not explicitly required by a constitutional rule

Governance DOES store (per event type):

| Event | Projected Fields |
|-------|-----------------|
| `ArticleSubmitted` | `submission_id`, `article_id`, `actor_id`, `journal_id`, `idempotency_key` |
| `ReviewSubmitted` | `assignment_id`, `actor_id`, `recommendation`, `scores` (numeric only) |
| `ReviewDeclined` | `assignment_id`, `actor_id` |
| `DecisionRecorded` | `decision_id`, `submission_id`, `decision_type`, `decided_by`, `decided_at` |

## 3.7 Runtime Grant Verification

The engineering work package MUST verify the actual database grants at runtime before the adapter is certified:

**Test 1: SELECT on outbox succeeds**
```sql
SET ROLE governance_ingest_role;
SELECT id, event_type FROM public.outbox LIMIT 1;
-- Expected: SUCCESS
```

**Test 2: INSERT on outbox fails**
```sql
SET ROLE governance_ingest_role;
INSERT INTO public.outbox (event_type, payload, status) VALUES ('test', '{}', 'pending');
-- Expected: ERROR permission denied
```

**Test 3: INSERT on articles fails**
```sql
SET ROLE governance_ingest_role;
INSERT INTO public.articles (id, title, abstract, status, journal_id) VALUES (gen_random_uuid(), 'test', 'test', 'draft', gen_random_uuid());
-- Expected: ERROR permission denied
```

**Test 4: EXECUTE on Publication RPCs fails**
```sql
SET ROLE governance_ingest_role;
SELECT public.process_article_submission(gen_random_uuid());
-- Expected: ERROR permission denied
SELECT public.record_decision(gen_random_uuid(), gen_random_uuid(), 'Accept', '', '', 1, NULL, NULL, 'test');
-- Expected: ERROR permission denied
```

**Test 5: WRITE to governance schema succeeds**
```sql
SET ROLE governance_ingest_role;
INSERT INTO governance.event_receipt (outbox_event_id, event_type) VALUES (gen_random_uuid(), 'test');
-- Expected: SUCCESS
```

> [!IMPORTANT]
> WP-01-01's `process_article_submission` and `submit_article_transition` (WP-01-02) currently lack `REVOKE EXECUTE FROM PUBLIC`. WP-02-01 and WP-03-01 do have these REVOKE/GRANT statements. The `governance_ingest_role` MUST explicitly have all `public` schema function execution revoked regardless.

---

# Part IV — Evidence Ledger

## 4.1 Canonical Evidence Record

```
governance.evidence (
    evidence_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_event_id       uuid NOT NULL UNIQUE,       -- outbox.id (deduplication key)
    source_event_type     text NOT NULL,               -- outbox.event_type
    source_payload_hash   text NOT NULL,               -- SHA-256 of raw outbox.payload::text
    evidence_payload      jsonb NOT NULL,               -- minimized projection (§3.6)
    source_created_at     timestamptz NOT NULL,         -- outbox.created_at
    governance_received_at timestamptz NOT NULL DEFAULT now(),
    adapter_version       text NOT NULL,                -- SemVer of ingestion adapter
    constitution_version  text NOT NULL,                -- active constitution version at ingestion
    evidence_version      integer NOT NULL DEFAULT 1    -- incremented only if re-projection is ever required
)
```

## 4.2 Layered Data Model

### Source Evidence (IMMUTABLE)

`governance.evidence` rows are append-only. Once written, they MUST NOT be modified or deleted. The `source_event_id` UNIQUE constraint prevents duplicate evidence for the same outbox event.

### Derived Interpretation (RECOMPUTABLE)

Traceability graph nodes and edges are derived from evidence records. They MAY be recomputed when:
- A new evidence record changes the graph topology
- A constitution amendment alters provision requirements
- A bug fix corrects the graph construction logic

Recomputation produces new graph state; it does NOT mutate evidence records.

### Certification Result (VERSION-PINNED ARTIFACT)

Certification results are snapshots computed from a specific combination of evidence, provisions, and evaluator version. They are immutable once produced. A new certification against the same submission creates a new `CertificationResult` with a new `certification_id`; it does NOT overwrite the previous one.

---

# Part V — Traceability Graph

## 5.1 Node Types

| Node Type | Source | Identity |
|-----------|--------|----------|
| `SUBMISSION` | `ArticleSubmitted` evidence | `submission_id` |
| `REVIEW` | `ReviewSubmitted` evidence | `assignment_id` |
| `REVIEW_DECLINED` | `ReviewDeclined` evidence | `assignment_id` |
| `DECISION` | `DecisionRecorded` evidence | `decision_id` |
| `PROVISION` | Constitutional provision | `provision_id` (e.g., `INV-I-01`) |
| `CERTIFICATION` | Certification result | `certification_id` |

## 5.2 Edge Types

| Edge Type | From → To | Meaning |
|-----------|-----------|---------|
| `EVIDENCES` | REVIEW → SUBMISSION | Review provides evidence for submission |
| `DECIDES` | DECISION → SUBMISSION | Decision resolves submission |
| `SATISFIES` | Evidence Node → PROVISION | Evidence satisfies a constitutional requirement |
| `REQUIRES` | CERTIFICATION → PROVISION | Certification requires this provision to pass |
| `SUPERSEDES` | DECISION(new) → DECISION(old) | Newer decision supersedes prior decision |
| `CERTIFIED_BY` | SUBMISSION → CERTIFICATION | Submission was certified by this result |

## 5.3 Graph Construction Rules

1. When a `SUBMISSION` node is created (from `ArticleSubmitted`), `REQUIRES` edges are generated to all provisions applicable to the target journal.
2. When a `REVIEW` node is created (from `ReviewSubmitted`), an `EVIDENCES` edge connects it to its submission. The submission_id is determined by looking up the `assignment_id` → `article_id` mapping. **Note: this mapping is NOT currently available in the outbox payload.** The `ReviewSubmitted` payload contains `assignmentId` but not `submission_id`. This is addressed in §5.4.

3. When a `DECISION` node is created (from `DecisionRecorded`), a `DECIDES` edge connects it to its submission via `payload.submission_id`. If a prior decision exists for the same submission, a `SUPERSEDES` edge is created.

## 5.4 Review-to-Submission Binding Gap

**Problem:** The `ReviewSubmitted` outbox payload contains `assignmentId` and `actorId` but NOT `submission_id` or `article_id`. Governance cannot determine which submission a review belongs to without violating bounded context principles (Governance MUST NOT receive general `SELECT` access to `public.reviewer_assignments`).

**Resolution:**
To maintain strict isolation, Governance must NOT query `public.reviewer_assignments` directly. Instead, a narrowly scoped Publication-owned READ-ONLY evidence-resolution boundary must be created.

This requires a controlled Publication Plane database object change (classified as a separate prep work package: **WP-GOV-01-PREP**).

Publication will expose a `SECURITY DEFINER` view or RPC (e.g., `public.governance_evidence_resolver`) that accepts an `assignment_id` and returns ONLY the minimal immutable relationship:
`assignment_id -> submission_id -> article_id -> journal_id`

This boundary:
- Exposes NO manuscript content, abstracts, or PDF contents
- Exposes NO reviewer or author identities
- Exposes NO review text, internal comments, or credentials
- Exposes NO arbitrary Publication rows
- Provides NO mutation capability

Governance ingestion will call this boundary during projection to bind the `REVIEW` node to its `SUBMISSION`.

## 5.5 Graph Hashing

The traceability subgraph for a given `submission_id` is hashed deterministically:

1. Collect all nodes reachable from the submission node
2. Sort nodes by `(node_type, node_id)` lexicographically
3. For each node, emit `canonical_string(node_type) || canonical_string(node_id)`
4. Collect all edges between collected nodes
5. Sort edges by `(from_id, edge_type, to_id)` lexicographically
6. For each edge, emit `canonical_string(from_id) || canonical_string(edge_type) || canonical_string(to_id)`
7. Concatenate all emissions in order
8. SHA-256 hash the concatenated string

## 5.6 Missing Dependencies and Contradictions

- **Missing dependency:** A `REQUIRES` edge exists but no corresponding `SATISFIES` edge. Result: `BLOCKED`.
- **Contradiction:** A `DECISION` node with `decision = Accept` exists alongside two `REVIEW` nodes with `recommendation = Reject`. Result: Contradiction is flagged as a `FINDING` but does NOT automatically produce FAIL — the editorial decision is constitutionally authoritative. However, the finding is included in the certification artifact for auditability.
- **Missing REVIEW → SUBMISSION binding:** If Option 1 (§5.4) fails (e.g., assignment deleted), the review evidence is marked `unresolvable` and excluded from certification. An `AuditFinding` is generated.

---

# Part VI — Certification Engine

## 6.1 Certification States

| State | Meaning | Persisted | Returned to Callers |
|-------|---------|-----------|---------------------|
| `NOT_EVALUATED` | Submission has never been evaluated | YES | YES |
| `EVALUATING` | Evaluation in progress (transient) | NO | NO (internal only) |
| `PASS` | All required provisions satisfied by sufficient evidence | YES | YES |
| `FAIL` | One or more required provisions violated by contradictory or invalid evidence | YES | YES |
| `BLOCKED` | One or more required provisions lack sufficient evidence | YES | YES |
| `EXPIRED` | A prior PASS certification has exceeded its TTL | YES (derived) | YES |
| `REVOKED` | A prior PASS certification has been administratively revoked | YES | YES |

**Fail-safe rule:** The engine returns `BLOCKED` for any state it cannot confidently determine. `PASS` requires affirmative evidence for every required provision. `FAIL` requires affirmative evidence of violation.

## 6.2 CertificationResult Artifact

```
governance.certification_result (
    certification_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id           uuid NOT NULL,
    constitution_version    text NOT NULL,
    provision_snapshot       jsonb NOT NULL,  -- { provision_id: version } for all evaluated provisions
    policy_version          text NOT NULL,
    evaluator_version       text NOT NULL,
    evidence_event_ids      uuid[] NOT NULL,  -- sorted array of source_event_ids used
    evidence_hash           text NOT NULL,    -- SHA-256 of sorted evidence_event_ids + evidence_payloads
    traceability_graph_hash text NOT NULL,    -- §5.5
    evaluated_at            timestamptz NOT NULL DEFAULT now(),
    result                  text NOT NULL,    -- PASS | FAIL | BLOCKED
    findings                jsonb NOT NULL,   -- array of Finding objects
    certification_hash      text NOT NULL,    -- deterministic hash of all above fields
    expires_at              timestamptz,      -- TTL for PASS results
    revoked_at              timestamptz,      -- set if administratively revoked
    revoked_reason          text
)
```

## 6.3 Deterministic Hashing Algorithm

The `certification_hash` is computed as:

```
canonical_input =
    canonical_string(submission_id) ||
    canonical_string(constitution_version) ||
    canonical_json(provision_snapshot) ||   -- keys sorted alphabetically
    canonical_string(policy_version) ||
    canonical_string(evaluator_version) ||
    canonical_string(sorted_join(evidence_event_ids, ',')) ||
    canonical_string(evidence_hash) ||
    canonical_string(traceability_graph_hash) ||
    canonical_string(iso8601(evaluated_at)) ||
    canonical_string(result) ||
    canonical_json(findings)               -- sorted by finding_id

certification_hash = SHA-256(canonical_input)
```

Where `canonical_string(val)` = `length_in_bytes(val) || ':' || val` (matching the pattern established by WP-16-02's `canonical_string` function).

Where `canonical_json(val)` = JSON with keys sorted alphabetically at all levels, no whitespace.

## 6.4 Version Change Behavior

| Change | Effect on Historical Certifications | Effect on Future Certifications |
|--------|-------------------------------------|--------------------------------|
| Constitution version changes | Historical certifications remain valid under their recorded `constitution_version` | New evaluations use the new constitution version |
| Provision version changes | Historical certifications retain their `provision_snapshot` | New evaluations use the updated provision version |
| Policy version changes | Historical certifications retain their `policy_version` | New evaluations use the new policy |
| Evaluator version changes | Historical certifications retain their `evaluator_version` | New evaluations use the new evaluator; if hash differs, the change is detectable |
| Evidence changes (new event arrives) | Historical certifications are NOT retroactively invalidated | New evaluations include the new evidence; if the result changes, the new certification hash differs |
| Evidence superseded | Historical certifications are NOT retroactively invalidated | New evaluations use latest non-superseded evidence |

**Reproducibility guarantee:** Given the same `constitution_version`, `provision_snapshot`, `policy_version`, `evaluator_version`, and `evidence_event_ids`, the same `certification_hash` MUST be produced.

## 6.5 Review Quality Assessment

### What Governance CAN Infer from `ReviewSubmitted`

| Fact | Observable | Source |
|------|-----------|--------|
| A review was submitted | YES | Event existence |
| The reviewer's recommendation (Accept/Reject/Revise) | YES | `payload.recommendation` |
| Numeric quality scores | YES | `payload.scores` |
| Who submitted the review | YES | `payload.actorId` |
| Which assignment was completed | YES | `payload.assignmentId` |

### What Governance CANNOT Infer from `ReviewSubmitted`

| Fact | Observable | Consequence |
|------|-----------|-------------|
| Reviewer eligibility (expertise, credentials) | NO | Cannot verify reviewer qualifications |
| Reviewer acceptance of the assignment | NO | Implied by submission but not proven |
| Conflict-of-interest clearance | NO | Cannot verify COI compliance |
| Review completeness (minimum word count, all sections filled) | NO | Cannot verify review quality threshold |
| Review timeliness (submitted within deadline) | PARTIAL | `created_at` exists but deadline is not in the event |

### Certification Treatment

For WP-GOV-01, the following constitutional requirements are marked as **CANNOT_VERIFY** in the certification result:

- Reviewer eligibility → Finding: `EVIDENCE_INSUFFICIENT`, severity: `INFO`
- COI clearance → Finding: `EVIDENCE_INSUFFICIENT`, severity: `INFO`
- Review quality threshold → Finding: `EVIDENCE_INSUFFICIENT`, severity: `INFO`

These do NOT block certification in WP-GOV-01. They are recorded as findings. Future event instrumentation (WP-GOV-02+) may provide sufficient evidence to upgrade these to GATE requirements.

The certification engine MUST NOT infer PASS for these requirements. It must explicitly record that verification was not possible.

---

# Part VII — Policy Engine

## 7.1 Current State Assessment

The `RegoPattern` model stores 8 verbatim Rego code templates as strings. No OPA binary, WASM module, or evaluation harness exists anywhere in the repository. The mock certification route hardcodes `PASS`.

**Classification: NOT AN EXECUTABLE POLICY ENGINE.**

## 7.2 WP-GOV-01 Strategy: Deterministic TypeScript Evaluator

For WP-GOV-01, a TypeScript-based policy evaluator provides:

- Deterministic execution (pure functions, no side effects)
- Zero additional deployment dependencies
- Standard unit test coverage
- Policy version pinning via application SemVer

### 7.2.1 Policy Interface

```typescript
interface PolicyInput {
  submission_id: string;
  evidence: EvidenceRecord[];
  provisions: Provision[];
  graph: TraceabilitySubgraph;
}

interface PolicyOutput {
  result: 'PASS' | 'FAIL' | 'BLOCKED';
  findings: Finding[];
  evaluated_provisions: Map<string, 'SATISFIED' | 'VIOLATED' | 'INSUFFICIENT_EVIDENCE'>;
  policy_version: string;
  evaluation_trace: TraceEntry[];  // deterministic trace for reproducibility
}

interface Finding {
  finding_id: string;
  provision_id: string;
  severity: 'SEV-1' | 'SEV-2' | 'SEV-3' | 'INFO';
  type: 'SATISFIED' | 'VIOLATED' | 'EVIDENCE_INSUFFICIENT' | 'CONTRADICTION' | 'STALE';
  message: string;
  evidence_refs: string[];  // evidence_ids supporting this finding
}
```

### 7.2.2 Policy Version

The policy evaluator version is the SemVer of the governance application. Each deployment pins its policy version. The `policy_version` is included in the `CertificationResult` and the `certification_hash`, making it tamper-evident.

### 7.2.3 Policy Hash

`policy_hash = SHA-256(policy_source_code)` where `policy_source_code` is the canonical text of the evaluator module. This is computed at build time and embedded as a constant.

### 7.2.4 Failure Behavior

If the policy evaluator throws an exception:
- Result is `BLOCKED` (never PASS)
- The exception is logged as an `AuditFinding` with `SEV-1`
- The certification record stores `result = BLOCKED` with a finding of type `EVALUATOR_ERROR`

### 7.2.5 Future Evolution

The `RegoPattern` model is retained in the governance schema. When the Rego/WASM path is needed:
1. Compile Rego templates into WASM bundles
2. Execute via `@open-policy-agent/opa-wasm` npm package
3. Comparison testing: run both TypeScript and WASM evaluators, assert identical results
4. Cut over when WASM produces identical results for all test cases

This is a WP-GOV-02+ concern, not WP-GOV-01.

---

# Part VIII — Release Authorization

## 8.1 Authorization Artifact

```typescript
interface ReleaseAuthorization {
  authorization_id: string;      // UUID, unique per authorization
  submission_id: string;         // bound to specific submission
  article_id: string;            // bound to specific article (from submission)
  requested_action: string;      // 'MINT_DOI' | 'PUBLISH' | 'ARCHIVE'
  certification_id: string;      // which certification supports this
  certification_hash: string;    // tamper-evidence
  evidence_hash: string;         // evidence snapshot hash
  constitution_version: string;
  result: 'ALLOW' | 'DENY' | 'BLOCKED';
  nonce: string;                 // UUID, for replay resistance
  issued_at: string;             // ISO 8601
  expires_at: string;            // ISO 8601, default 15 minutes after issued_at
  authorization_version: string; // SemVer of the gate implementation
}
```

### 8.1.1 Properties

| Property | Mechanism |
|----------|-----------|
| Object-bound | `submission_id` + `article_id` in artifact |
| Action-bound | `requested_action` in artifact |
| Evidence-bound | `certification_hash` + `evidence_hash` in artifact |
| Time-limited | `expires_at` = `issued_at + 15 minutes` |
| Replay-resistant | `nonce` is unique per authorization; Publication stores consumed nonces |
| Auditable | `governance.gate_audit` stores every authorization request and response |

### 8.1.2 Single-Use Semantics

DOI minting via Crossref is inherently idempotent (same DOI = same deposit). Therefore, strict single-use semantics are NOT required for `MINT_DOI`. However:

- The `nonce` provides replay detection if needed
- Publication SHOULD log the `authorization_id` alongside the DOI deposit record
- A second `MINT_DOI` request for the same submission reuses the existing DOI; the authorization is merely a re-check

For `PUBLISH` and `ARCHIVE` actions, which may trigger irreversible state changes, the `nonce` SHOULD be verified as unconsumed before proceeding.

## 8.2 Gate API Contract

### Request

```
POST /api/governance/gates/authorize
Content-Type: application/json
Authorization: Bearer <publication_gate_token>

{
  "submission_id": "uuid",
  "article_id": "uuid",
  "action": "MINT_DOI"
}
```

### Response (ALLOW)

```json
{
  "authorization_id": "uuid",
  "submission_id": "uuid",
  "article_id": "uuid",
  "requested_action": "MINT_DOI",
  "certification_id": "uuid",
  "certification_hash": "sha256-hex",
  "evidence_hash": "sha256-hex",
  "constitution_version": "1.0.0",
  "result": "ALLOW",
  "nonce": "uuid",
  "issued_at": "2026-08-11T12:00:00Z",
  "expires_at": "2026-08-11T12:15:00Z",
  "authorization_version": "1.0.0"
}
```

### Response (DENY / BLOCKED)

```json
{
  "authorization_id": "uuid",
  "result": "DENY",
  "reason": "Certification FAIL: provision INV-I-01 violated",
  "certification_id": "uuid",
  "findings": [...]
}
```

### Governance responsibility

- Evaluate the traceability graph for the requested submission
- Verify that a current (non-expired, non-revoked) PASS certification exists
- Generate and return the authorization artifact
- Record the gate decision in `governance.gate_audit`

### Publication responsibility

- Call the gate API before executing protected actions
- Verify `result === 'ALLOW'`
- Verify `submission_id` and `article_id` match the intended operation
- Verify `requested_action` matches the intended operation
- Verify `expires_at > now()`
- Store the `authorization_id` alongside the operation record
- Execute the actual mutation (DOI mint, publish, archive)

## 8.3 Race Condition Analysis

| Scenario | Handling | Boundary |
|----------|----------|----------|
| Two release attempts use the same authorization | Idempotent DOI deposit makes this safe for `MINT_DOI`; for `PUBLISH`/`ARCHIVE`, the `nonce` check prevents double-execution | Publication |
| Certification changes between authorization and execution | The authorization artifact is evidence-bound via `certification_hash`. If evidence changes, a new certification produces a different hash, but the existing authorization remains valid until `expires_at`. This is acceptable because the authorization captures a point-in-time certified state. | Governance |
| Authorization expires | Publication verifies `expires_at > now()` before executing. If expired, Publication re-requests. | Publication |
| Certification is revoked | The gate API checks `revoked_at IS NULL` on the referenced certification before issuing ALLOW. An authorization issued before revocation remains valid until `expires_at`; the 15-minute TTL limits exposure. | Governance + Publication |
| Governance unavailable | Publication receives a connection error or timeout. Protected actions fail closed — Publication MUST NOT proceed. | Publication |
| Publication state changes after certification | Governance certifies based on its own evidence graph, not Publication's live state. If Publication state has diverged (e.g., article deleted), Publication's own pre-conditions will catch the inconsistency. | Publication |
| Same submission presented with different article_id | The authorization artifact binds `submission_id` AND `article_id`. Publication verifies both match. Mismatch → reject. | Publication |
| Malicious caller replays authorization against another object | The artifact contains `submission_id`, `article_id`, and `requested_action`. Publication verifies all three match the actual operation. | Publication |

---

# Part IX — Security Model

## 9.1 Three Security Boundaries

### A. Ingestion Identity (`governance_ingest_role`)

**Purpose:** Read Publication outbox events and write to Governance schema.

| Aspect | Value |
|--------|-------|
| Authentication | PostgreSQL role (not Supabase Auth) |
| Database grants | `SELECT ON public.outbox`, `EXECUTE ON FUNCTION public.governance_evidence_resolver`, `ALL ON SCHEMA governance` |
| Schema search_path | `governance, public` (public for outbox reads only) |
| Publication RPCs | `REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM governance_ingest_role` |
| Publication tables (write) | NO INSERT, UPDATE, DELETE on any `public.*` table |
| Connection | Direct PostgreSQL connection string (not Supabase client library, not service_role key) |

### B. Governance Application Identity (`governance_app_role`)

**Purpose:** Run Governance APIs (certification, gate, traceability queries, provision management).

| Aspect | Value |
|--------|-------|
| Authentication | PostgreSQL role |
| Database grants | `SELECT, INSERT, UPDATE ON governance.*` |
| Publication access | NONE (no grants on `public` schema) |
| API authentication | Service-to-service token or Supabase Edge Function with scoped credentials |

### C. Publication Gate Identity

**Purpose:** Publication Plane calls the Governance gate API to request release authorization.

| Aspect | Value |
|--------|-------|
| Authentication | Bearer token (shared secret or JWT) specific to the gate endpoint |
| Authorization | Only `POST /api/governance/gates/authorize` is accessible |
| Governance write access | NONE — Publication cannot write to governance schema |
| Publication write access | Normal Publication credentials (service_role for DOI deposit — existing behavior) |

### 9.2 SECURITY DEFINER Function Risk

All Publication RPCs use `SECURITY DEFINER` and execute with the function owner's privileges (typically `postgres`). If the governance role can EXECUTE these functions, it can perform arbitrary Publication mutations.

**Current state:**
- `process_review_submission` (WP-02-01): `REVOKE ... FROM PUBLIC; GRANT ... TO service_role` ✓
- `record_decision` (WP-03-01): `REVOKE ... FROM PUBLIC; GRANT ... TO service_role` ✓
- `process_article_submission` (WP-01-01): NO REVOKE/GRANT statements ✗
- `submit_article_transition` (WP-01-02): NO REVOKE/GRANT statements ✗
- `process_single_audit_event` (WP-16-01/WP-16-02): NO REVOKE/GRANT statements ✗

**Mitigation:** The governance role creation migration MUST include:
```sql
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM governance_ingest_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM governance_app_role;
```
*(Note: Execution is then explicitly granted ONLY for `public.governance_evidence_resolver` to `governance_ingest_role`)*

This provides defense-in-depth regardless of individual function-level REVOKE/GRANT gaps.

## 9.3 Default Privileges and Future Immunity

To guarantee that future Publication migrations do not accidentally grant Governance any mutation capabilities, default privileges must be explicitly restricted:

```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM governance_ingest_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM governance_app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM governance_ingest_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM governance_app_role;
```
This ensures Governance roles remain structurally isolated and read-only with respect to Publication state.

---

# Part X — Fail-Open / Fail-Closed Matrix

| Action | Gate Type | Governance Unavailable | Required Behavior | Rationale |
|--------|-----------|----------------------|-------------------|-----------|
| Submission | None | Proceed | Fail-Open | Asynchronous outbox; Governance ingests later |
| Editorial check | None | Proceed | Fail-Open | Internal editorial workflow |
| Reviewer assignment | None | Proceed | Fail-Open | Internal editorial workflow |
| Review submission | None | Proceed | Fail-Open | Internal editorial workflow |
| Editorial decision | None | Proceed | Fail-Open | Internal editorial workflow |
| Revision request | None | Proceed | Fail-Open | Internal editorial workflow |
| **DOI minting** | **Mandatory** | **BLOCK** | **Fail-Closed** | Constitutionally protected release; external registry |
| **Publication** | **Mandatory** | **BLOCK** | **Fail-Closed** | Constitutionally protected release |
| **Archival finalization** | **Mandatory** | **BLOCK** | **Fail-Closed** | Constitutionally protected release |

---

# Part XI — Website Preservation

## Protected Surfaces

| Surface | Directory/File | Status |
|---------|---------------|--------|
| Website UI | `app/(site)/*` | PROTECTED — no modifications |
| Publication API routes | `app/api/*` (except future gate call in `doi/mint`) | PROTECTED |
| Server Actions | `app/actions/*` | PROTECTED |
| Publication business logic | `lib/*` | PROTECTED |
| Publication migrations | `supabase/migrations/*` | PROTECTED (new governance-schema-only migrations allowed) |
| Certified work packages | WP-01-02 through WP-20-02 | PROTECTED |

## Allowed Modifications (by work package)

| Surface | When | Scope |
|---------|------|-------|
| `app/api/doi/mint/route.ts` | WP-GOV-01F only | Add gate authorization check before Crossref deposit; existing logic unchanged |
| New `governance/` directory | WP-GOV-01A+ | All new Governance files |
| New `supabase/migrations/` | WP-GOV-01A only | Governance schema creation and role grants; NO modifications to `public` schema DDL |

---

# Part XII — Implementation Work Packages

## WP-GOV-01-PREP — Publication Evidence Boundary

**Objective:** Create the narrowly scoped read-only evidence-resolution boundary within the Publication schema to allow Governance to map assignments to submissions without exposing Publication table access.

**Inputs:** Forensic binding requirement from WP-GOV-01 adversarial review.

**Outputs:**
- A `SECURITY DEFINER` function or view `public.governance_evidence_resolver`

**Dependencies:** None (Precedes WP-GOV-01A).

**Allowed files/directories:**
- NEW: `supabase/migrations/YYYYMMDD_wpgov_01_prep_resolver.sql`

**Protected files/directories:**
- ALL other Publication Plane files. NO modifications to existing tables.

**Forbidden changes:**
- Must not expose any manuscript content, text, or identity details.

**Runtime verification (MANDATORY):**
- Function correctly maps `assignment_id` to `submission_id`, `article_id`, and `journal_id`.

**Rollback:** `DROP FUNCTION public.governance_evidence_resolver;`

---

## WP-GOV-01A — Governance Schema Foundation

**Objective:** Create the `governance` PostgreSQL schema, adapt the Prisma model, create database roles, and establish role grants.

**Inputs:** External Governance Model Prisma schema; adversarial review security findings.

**Outputs:**
- `governance` schema created in Supabase PostgreSQL
- Adapted Prisma schema (PostgreSQL provider, `@@schema("governance")`, Article/Journal/Book removed)
- `governance_ingest_role` and `governance_app_role` created with minimal grants
- Runtime grant verification passing

**Dependencies:** None.

**Allowed files/directories:**
- NEW: `governance/prisma/schema.prisma`
- NEW: `governance/prisma/migrations/*`
- NEW: `supabase/migrations/YYYYMMDD_wp_gov_01a_governance_schema.sql` (governance schema + roles ONLY)

**Protected files/directories:**
- ALL `app/*`, `lib/*`, `backend/*`, `supabase/migrations/2026081*` (existing migrations)

**Forbidden changes:**
- No modifications to `public` schema tables
- No modifications to existing RPC functions
- No modifications to existing Publication code

**Static verification:** Prisma schema compiles; migration applies cleanly.

**Runtime verification (MANDATORY):**
- All 5 grant verification tests (§3.7) pass
- `governance_ingest_role` cannot INSERT into `public.articles`
- `governance_ingest_role` cannot EXECUTE `process_article_submission`
- `governance_ingest_role` CAN SELECT from `public.outbox`
- `governance_ingest_role` CAN INSERT into `governance.event_receipt`

**Certification evidence:** Role grant test results.

**Rollback:** `DROP SCHEMA governance CASCADE; DROP ROLE governance_ingest_role; DROP ROLE governance_app_role;`

---

## WP-GOV-01B — Event Ingestion Adapter

**Objective:** Build the overlap-window poller, receipt ledger, evidence projection pipeline, dead-letter handling, and periodic reconciliation.

**Inputs:** WP-GOV-01A (governance schema + roles).

**Outputs:**
- Ingestion adapter worker
- Event receipt ledger populated from outbox events
- Evidence records projected with payload minimization
- Dead-letter handling for failed projections
- Reconciliation mechanism

**Dependencies:** WP-GOV-01A.

**Allowed files/directories:**
- NEW: `governance/workers/ingestion-adapter.ts`
- NEW: `governance/lib/evidence.ts`
- NEW: `governance/lib/projection.ts`

**Protected files/directories:**
- ALL `app/*`, `lib/*`, `backend/workers/*`, `supabase/migrations/*` (existing)

**Forbidden changes:**
- No modifications to Publication outbox or outbox workers
- No modifications to Publication server actions

**Static verification:** TypeScript compiles; unit tests pass.

**Runtime verification (MANDATORY):**
- Inject synthetic `ArticleSubmitted` event → evidence record created with correct minimized payload
- Inject duplicate event → no duplicate evidence (deduplication works)
- Inject events with identical `created_at` → both processed correctly
- Simulate crash after receipt, before projection → recovery processes unprojected receipt
- Reconciliation scan discovers un-receipted event within 7-day window
- `NotificationQueued` event is NOT ingested (filter works)

**Certification evidence:** Runtime test results for all scenarios above.

**Rollback:** `TRUNCATE governance.event_receipt, governance.evidence, governance.dead_letter, governance.ingestion_cursor;`

---

## WP-GOV-01C — Traceability Graph Engine

**Objective:** Build graph construction from evidence records, traversal logic, subgraph extraction, and deterministic graph hashing.

**Inputs:** WP-GOV-01B (evidence records).

**Outputs:**
- Graph construction logic (evidence → nodes + edges)
- Graph traversal (submission_id → subgraph)
- Deterministic graph hashing (§5.5)

**Dependencies:** WP-GOV-01B.

**Allowed files/directories:**
- NEW: `governance/lib/traceability.ts`
- NEW: `governance/lib/graph-hash.ts`

**Protected files/directories:**
- ALL Publication Plane files

**Forbidden changes:**
- No modifications to Publication Plane

**Static verification:** TypeScript compiles; unit tests pass.

**Runtime verification (MANDATORY):**
- Submission with 2 reviews and 1 Accept decision → graph contains SUBMISSION, 2 REVIEW, 1 DECISION nodes with correct edges
- Missing review → graph correctly represents incomplete chain
- Superseded decision → SUPERSEDES edge created
- Graph hash is deterministic (same inputs → same hash)
- Graph hash changes when evidence changes

**Certification evidence:** Graph construction and hash determinism test results.

**Rollback:** Truncate governance traceability tables.

---

## WP-GOV-01D — Certification Engine

**Objective:** Build the TypeScript certification evaluator, provision evaluation, certification result generation with deterministic hashing, and certification state management.

**Inputs:** WP-GOV-01C (traceability graph).

**Outputs:**
- Policy evaluator (TypeScript, deterministic)
- Certification result generation with `certification_hash`
- Provision satisfaction evaluation
- Finding generation
- Certification state management (PASS/FAIL/BLOCKED/EXPIRED/REVOKED)

**Dependencies:** WP-GOV-01C.

**Allowed files/directories:**
- NEW: `governance/lib/certification.ts`
- NEW: `governance/lib/policy-evaluator.ts`
- NEW: `governance/api/certification/*`

**Protected files/directories:**
- ALL Publication Plane files

**Forbidden changes:**
- No modifications to Publication Plane

**Static verification:** TypeScript compiles; unit tests pass.

**Runtime verification (MANDATORY):**
- Complete evidence set → PASS with valid `certification_hash`
- Same evidence re-evaluated → identical `certification_hash` (reproducibility)
- Missing ReviewSubmitted → BLOCKED
- Missing DecisionRecorded → BLOCKED
- DecisionRecorded with `decision = Reject` → FAIL
- Two contradictory decisions → finding generated, latest non-superseded decision used
- Evaluator exception → BLOCKED (never PASS)
- Changed provision version → new `certification_hash` (differs from prior)

**Certification evidence:** All runtime verification results, including hash reproducibility proof.

**Rollback:** Truncate governance certification tables.

---

## WP-GOV-01E — Release Gate API

**Objective:** Build the `/api/governance/gates/authorize` endpoint, authorization artifact generation, gate audit logging, and nonce management.

**Inputs:** WP-GOV-01D (certification engine).

**Outputs:**
- Gate API endpoint
- Authorization artifact generation (§8.1)
- Gate audit logging
- Nonce generation
- Expiry enforcement

**Dependencies:** WP-GOV-01D.

**Allowed files/directories:**
- NEW: `governance/api/gates/authorize/route.ts`
- NEW: `governance/lib/authorization.ts`

**Protected files/directories:**
- ALL Publication Plane files

**Forbidden changes:**
- No modifications to Publication Plane (gate integration is WP-GOV-01F)

**Static verification:** TypeScript compiles; unit tests pass.

**Runtime verification (MANDATORY):**
- Valid PASS certification → ALLOW authorization with valid artifact
- FAIL certification → DENY authorization
- BLOCKED certification → BLOCKED authorization
- Expired authorization artifact (simulated clock advance) → Publication rejects
- Authorization with wrong `submission_id` → Publication rejects
- Revoked certification → DENY
- Gate unavailability → Publication fails closed (connection timeout test)

**Certification evidence:** All runtime verification results.

**Rollback:** Truncate governance gate_audit table.

---

## WP-GOV-01F — Publication Gate Integration

**Objective:** Add a governance gate check to `app/api/doi/mint/route.ts` before Crossref deposit.

**Inputs:** WP-GOV-01E (gate API).

**Outputs:**
- Modified DOI mint route with pre-deposit gate check
- Fail-closed behavior when gate is unavailable

**Dependencies:** WP-GOV-01E.

**Allowed files/directories:**
- MODIFY: `app/api/doi/mint/route.ts` (gate check addition ONLY; existing Crossref logic unchanged)

**Protected files/directories:**
- ALL other Publication Plane files
- ALL governance files created in prior WPs

**Forbidden changes:**
- No modifications to Crossref deposit logic
- No modifications to authentication/authorization logic
- No modifications to article/book lookup logic

**Static verification:** TypeScript compiles; existing DOI mint tests still pass.

**Runtime verification (MANDATORY):**
- DOI mint with valid ALLOW authorization → Crossref deposit proceeds
- DOI mint with DENY authorization → 403 response, no Crossref deposit
- DOI mint with expired authorization → 403 response, no Crossref deposit
- DOI mint when gate API unavailable → 503 response, no Crossref deposit
- DOI mint for book (no governance gate yet) → existing behavior unchanged
- Existing DOI mint for article without governance deployment → configurable bypass (feature flag `GOVERNANCE_GATE_ENABLED=false` allows migration)

**Certification evidence:** All runtime verification results plus confirmation that existing book DOI minting is unaffected.

**Rollback:** Revert `app/api/doi/mint/route.ts` to pre-WP-GOV-01F state. Feature flag `GOVERNANCE_GATE_ENABLED=false` provides non-destructive rollback.

---

# Part XIII — Runtime Certification Requirements

The following runtime proofs are MANDATORY before the Governance Control Plane is declared certified:

| # | Requirement | Verification Method | Work Package |
|---|-------------|--------------------|--------------| 
| RC-01 | Governance can read outbox data | `SET ROLE governance_ingest_role; SELECT FROM public.outbox;` | WP-GOV-01A |
| RC-02 | Governance cannot mutate Publication data | `SET ROLE governance_ingest_role; INSERT INTO public.articles ...;` → ERROR | WP-GOV-01A |
| RC-03 | Governance cannot execute Publication RPCs | `SET ROLE governance_ingest_role; SELECT public.process_article_submission(...);` → ERROR | WP-GOV-01A |
| RC-04 | Duplicate events are deduplicated | Inject same outbox.id twice → one evidence record | WP-GOV-01B |
| RC-05 | Late events are recovered | Inject event older than cursor → reconciliation discovers it | WP-GOV-01B |
| RC-06 | Concurrent ingestion is safe | Two adapter instances process simultaneously → no duplicate evidence | WP-GOV-01B |
| RC-07 | Source evidence is immutable | Attempt UPDATE on governance.evidence → rejected by application constraint | WP-GOV-01B |
| RC-08 | Certification is deterministic | Same evidence + same rules → same certification_hash | WP-GOV-01D |
| RC-09 | Changed evidence produces different certification | Add new evidence → new certification_hash | WP-GOV-01D |
| RC-10 | Missing evidence cannot produce PASS | Remove required ReviewSubmitted → BLOCKED | WP-GOV-01D |
| RC-11 | Contradictory evidence cannot produce PASS | Reject decision with Accept certification attempt → FAIL | WP-GOV-01D |
| RC-12 | Expired authorization is rejected | Simulate clock advance → Publication rejects | WP-GOV-01E |
| RC-13 | Authorization cannot be replayed against another submission | Use authorization with different submission_id → rejected | WP-GOV-01E |
| RC-14 | Governance failure blocks protected release | Kill gate API → DOI mint returns 503 | WP-GOV-01F |
| RC-15 | Ordinary editorial workflow remains operational without Governance | Disable Governance → submission, review, decision all succeed | WP-GOV-01F |

---

# Part XIV — Design Status

### READY FOR ENGINEERING AUTHORIZATION

All mandatory corrections from the adversarial architecture review and subsequent boundary reconciliation pass have been incorporated:

1. ✅ Event ingestion: Overlap-window polling with `(created_at, id)` cursor + receipt ledger + periodic reconciliation
2. ✅ Certification reproducibility: Deterministic `CertificationResult` artifact with canonical hashing
3. ✅ Security model: Three distinct identities with explicit REVOKE of all Publication RPCs and DEFAULT PRIVILEGES restricted.
4. ✅ Boundary isolation: Introduction of WP-GOV-01-PREP to provide a strict, read-only `governance_evidence_resolver` to prevent direct `SELECT` access to Publication tables.
5. ✅ Payload minimization: Strict constitutional separation between temporary source event inspection and durable evidence storage.
6. ✅ Release authorization: Object-bound, action-bound, evidence-bound, time-limited, replay-resistant artifact
7. ✅ Policy engine: TypeScript deterministic evaluator for MVP; Rego/WASM deferred
8. ✅ Constitutional version binding: Evidence records bind `constitution_version` at ingestion; certifications pin `provision_snapshot`

---

**FILES MODIFIED: NONE**

**COMMITS MADE: NONE**
