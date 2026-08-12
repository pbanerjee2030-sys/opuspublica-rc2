# WP-GOV-01C Architecture Authorization Review

## PART I — EXACT PURPOSE OF WP-GOV-01C
1. **What exactly is an Evidence Synthesis Engine?** It is a deterministic worker/process that transforms flat `governance.EvidenceProjection` records (produced by WP-GOV-01B) into a structured, relational Architectural Traceability Graph (ATG).
2. **What problem does it solve?** It bridges the gap between disparate immutable event projections (e.g., individual Submissions, Reviews, Decisions) and the constitutional provisions they satisfy by establishing structural linkages (`EVIDENCES`, `DECIDES`, `SATISFIES`, `REQUIRES`, `SUPERSEDES`). This explicit topology is required for the Certification Engine (WP-GOV-01D) to evaluate policy deterministically.
3. **What inputs does it consume?** `governance.EvidenceProjection` (evidence state) and `governance.Provision` (constitutional rules).
4. **What outputs does it produce?** `governance.TraceabilityNode` and `governance.TraceabilityEdge` records.
5. **What outputs are durable?** The derived nodes and edges are stored durably in the database.
6. **Which outputs are merely derived projections?** All `TraceabilityNode` and `TraceabilityEdge` records are purely derived projections that can be completely recomputed from the underlying `EvidenceProjection` records if graph construction logic changes.
7. **What evidence remains authoritative outside Governance?** The Publication Plane remains the absolute sole authority for the actual lifecycle and state of Articles, Submissions, Journals, Books, Reviews, and Decisions.
8. **Which artifacts require cryptographic/provenance linkage?** The synthesized traceability subgraph for a given submission must be deterministically hashed (per Part V 5.5 of the specification) to provide a tamper-evident topological version for certification.

## PART II — INPUT CONTRACT
- **Source**: `governance.EvidenceProjection` (immutable once projected) and `governance.Provision` (mutable via amendment).
- **Boundary**: Direct internal reads within the `governance` schema.
- **Identifiers**: UUIDs for evidence projections, string IDs for provisions.
- **Timestamp Semantics**: `updatedAt` / `lastEventId` from projections dictate logical time for superseding rules.
- **Provenance / Trust**: Inherited directly from WP-GOV-01B's ingestion trust chain.
- **Schema**: `EvidenceProjection` JSON `state` structure.
- **Forbidden Fields**: 01C MUST NOT attempt to read abstract, manuscript content, raw review text, or actor PII, as WP-GOV-01B already strips these. 01C MUST NOT gain generalized access to `public.articles`, `public.submissions`, or any other Publication tables.

## PART III — SYNTHESIS CONTRACT
- **Evidence normalization**: Nodes map 1:1 with `EvidenceProjection` records, classified by `entityType` (SUBMISSION, REVIEW, DECISION).
- **Evidence grouping**: Nodes are grouped by `submissionId`, which is already securely resolved and embedded in the `EvidenceProjection` state by WP-GOV-01B.
- **Identity correlation**: `TraceabilityEdge` connects nodes based on relational keys in the projection state (e.g., DECIDES edge from a Decision to a Submission).
- **Provenance preservation**: Nodes retain `id` mappings back to their source `EvidenceProjection`.
- **Contradiction handling**: Contradictory evidence (e.g., multiple active decisions) is synthesized as-is in the graph. Resolution of contradiction is the responsibility of WP-GOV-01D (Evaluation), not WP-GOV-01C.
- **Incomplete/duplicate evidence**: Handled via idempotent node and edge creation (UPSERTs).
- **Stale evidence**: `SUPERSEDES` edges are generated when newer evidence of the same type (e.g., a newer decision) overrides an older one.
- **Replay**: Re-running synthesis for a submission idempotently recreates or updates the subgraph.
- **Deterministic ordering**: Subgraph hash depends on lexicographical sorting of node IDs, types, and edge connections.
- **Synthesis versioning**: Handled via the deterministic graph hash.
- **Confidence/quality semantics**: `UNSPECIFIED — REQUIRES ARCHITECTURAL DECISION` (WP-GOV-01D evaluates this, but synthesis simply maps the raw scores/recommendations as node metadata).

## PART IV — OUTPUT CONTRACT
1. **Allowed to persist**: `TraceabilityNode` and `TraceabilityEdge` records.
2. **Owned tables**: `governance.TraceabilityNode`, `governance.TraceabilityEdge`.
3. **Derived Governance artifact**: The Traceability Graph topology for a given submission.
4. **Non-authoritative output**: Graph nodes and edges are strictly derived, non-authoritative representations of the authoritative `EvidenceProjection`.
5. **Immutable or versioned**: The graph is mutable/recomputable (derived view), but the point-in-time subgraph hash (used by 01D) acts as an immutable topological version.
6. **Superseding**: New synthesis runs UPDATE/UPSERT the nodes and edges for that submission context.
7. **Hashes required**: Yes, a deterministic subgraph hash (SHA-256 of sorted nodes and edges).
8. **Source evidence changes**: New `EvidenceProjection` records trigger an update to the graph topology. 01C MUST NOT become a second Publication authority.

## PART V — AUTHORITY BOUNDARY
- **Article**: Publication (Authoritative) → Gov (No Access) → Pub (Read/Write) → Persistence (`public.articles`)
- **Submission**: Publication (Authoritative) → Gov (No Access) → Pub (Read/Write) → Persistence (`public.submissions`)
- **Outbox event**: Publication (Authoritative) → Gov (Read via WP-GOV-01B Reader) → Pub (Read/Write) → Persistence (`public.outbox`)
- **EventReceipt**: Governance (Authoritative) → Gov (Read/Write) → Pub (No Access) → Persistence (`governance.EventReceipt`)
- **EvidenceProjection**: Governance (Authoritative) → Gov (Read/Write) → Pub (No Access) → Persistence (`governance.EvidenceProjection`)
- **SynthesisResult (Graph)**: Governance (Authoritative derived view) → Gov (Read/Write) → Pub (No Access) → Persistence (`governance.TraceabilityNode`, `governance.TraceabilityEdge`)
- **CertificationResult**: Governance (Authoritative for Cert) → Gov (Read/Write) → Pub (Read via Gate API) → Persistence (`governance.CertificationResult`)

## PART VI — SECURITY MODEL
- **Execution role**: `governance_worker` or a specific internal synthesis identity.
- **Read privileges**: `governance.EvidenceProjection`, `governance.Provision`.
- **Write privileges**: `governance.TraceabilityNode`, `governance.TraceabilityEdge`.
- **RPC boundaries**: None required; operates purely via backend ORM/SQL inside `governance` schema.
- **Schema boundaries**: Strictly confined to the `governance` schema.
- **SECURITY DEFINER usage**: Not required (no cross-schema access needed since 01B handled it).
- **SQL risks**: Low, uses Prisma ORM on controlled schema.
- **Injection risks**: Metadata JSON must be carefully constructed, but no AI-assisted synthesis exists.
- **Payload handling**: Node metadata only contains minimized fields transferred from `EvidenceProjection`. No sensitive content exists.

## PART VII — DETERMINISM / REPLAY
- **Same evidence twice**: Idempotent. The node/edge UPSERT results in the same graph state.
- **Out of order events**: Corrected by inspecting logical timestamps/versions from `EvidenceProjection` to map `SUPERSEDES` edges correctly.
- **Corrected/Withdrawn evidence**: Triggers a graph recomputation which drops/updates nodes and edges.
- **Replay**: Deterministic replay is mandatory. Re-synthesizing the same `EvidenceProjection` set MUST yield the exact same subgraph hash.
- **Concurrency**: Database transactions or deterministic queueing must ensure concurrent synthesis runs for the same submission resolve cleanly via Row Locks or `ON CONFLICT` constraints.

## PART VIII — FAILURE AND QUARANTINE
- **Transient failure**: Retry synthesis (handled by worker queue or poll logic).
- **Permanent failure**: Log as an `AuditFinding` (SEV-2); synthesis for that submission stalls.
- **Invalid evidence**: Handled upstream by 01B. If corrupted state is found, log `AuditFinding`.
- **Contradictory evidence**: Mapped into the graph as-is (e.g., two concurrent DECISION nodes). WP-GOV-01D evaluates the contradiction.
- **Unsupported evidence type**: Ignored by 01C, or mapped as an isolated node.
- **Partial synthesis**: Transactions must be used to ensure the graph for a submission is updated atomically.
- **Operator visibility**: Logged to `governance.AuditFinding`.

## PART IX — DATA MODEL
The existing `governance/prisma/schema.prisma` deployed in WP-GOV-01A already contains the required structures:
- `TraceabilityNode`
- `TraceabilityEdge`
No new models, tables, or migrations are required. The schema is complete and ready.

## PART X — FILE BOUNDARY

### MAY MODIFY
- `governance/workers/synthesis-engine.ts` (new)
- `governance/lib/synthesis/graph.ts` (new)
- `governance/workers/__tests__/synthesis-engine.test.ts` (new)

### READ ONLY
- `governance/prisma/schema.prisma`
- `implementation/wp-gov-01-engineering-specification.md`

### MUST NOT MODIFY
- WP-01-02 RPCs
- WP-GOV-01-PREP Resolver
- WP-GOV-01A Schema Migrations
- WP-GOV-01B Ingestion Adapter (`ingestion-adapter.ts`)
- Any `public.*` schema models

## PART XI — TEST PLAN
- **Deterministic Hashing**: Verify that the same input nodes/edges always produce the exact same SHA-256 graph hash regardless of processing order.
- **Idempotency/Replay**: Verify that running synthesis twice on the same evidence does not duplicate nodes or edges, and yields the same hash.
- **Contradiction Mapping**: Verify that two conflicting decisions are both added to the graph and linked properly.
- **Superseding**: Verify that a newer decision correctly creates a `SUPERSEDES` edge to an older decision.
- **Isolation**: Verify that the synthesis engine does not attempt to read from `public.outbox` or `public.submissions`.
- **Concurrency**: Verify that concurrent synthesis triggers for the same submission do not corrupt edge links.

## PART XII — DEPENDENCY CHECK
**READY TO AUTHORIZE**
WP-GOV-01B successfully implemented the ingestion adapter and the `governance_evidence_resolver`, which binds `assignment_id` to `submission_id` within the `EvidenceProjection`. Therefore, WP-GOV-01C has all necessary identities and data natively within the `governance` schema.

## PART XIII — RECOMMENDED IMPLEMENTATION SEQUENCE
1. Implement subgraph deterministic hashing utility (`graph.ts`).
2. Implement core node and edge UPSERT logic inside a Prisma transaction.
3. Implement `SUPERSEDES` and `REQUIRES` relationship mappers based on `EvidenceProjection` state.
4. Write test suite verifying determinism and idempotency.
5. Integrate synthesis trigger (either polled or triggered by WP-GOV-01B projection success).

## FINAL CLASSIFICATION
`WP-GOV-01C ARCHITECTURE READY TO AUTHORIZE`
