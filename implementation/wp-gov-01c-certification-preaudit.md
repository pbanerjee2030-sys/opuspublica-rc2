# WP-GOV-01C Certification Pre-Audit

## 1. WP-GOV-01B FROZEN-BOUNDARY AUDIT
**Exact Changes:**
- 1 import line added for `synthesizeForSubmission`.
- 3 lines added to invoke the trigger if `evidence.state.submissionId` is present.
- All modifications are strictly confined to the `withIngestRole(async tx => ...)` block.

**Impact Analysis:**
- Only authorized 01C synthesis trigger: **Yes**
- Ingestion semantics change: **Yes (by design)**. Because synthesis is synchronous and shares the same transaction, if synthesis fails, projection is rolled back and the event undergoes normal WP-GOV-01B backoff/quarantine.
- Retry behavior change: **No**.
- Cursor semantics change: **No**.
- Synthesis failure affects ingestion success/failure: **Yes**, preserving atomicity.

**Recommendation:** A. Explicitly authorized 01C integration.

## 2. SYNCHRONOUS TRIGGER FAILURE ISOLATION
- **Succeeds:** Projection and synthesis are committed atomically. Event receipt is updated to `processed`.
- **Fails transiently:** The Prisma transaction rolls back. The `catch` block intercepts the failure in `processEvent`, increments `retryCount`, and updates the event receipt to `pending` with `nextRetryAt` exponential backoff.
- **Fails permanently:** The backoff exhausts (5 retries), and the receipt is marked `failed` (quarantined). No projection or synthesis occurs.
- **Times out:** Treated as a transient failure; rollback and exponential backoff apply.
- **Throws after EvidenceProjection is persisted:** Since projection and synthesis are executed within the *same database transaction context*, a throw during synthesis completely rolls back the projection. The `EventReceipt` is updated in a separate subsequent transaction in the `catch` block.

**Conclusion:** Failure isolation perfectly preserves atomicity and idempotency.

## 3. 01C DATA-COVERAGE AUDIT
- `SUBMISSION`, `REVIEW`, `DECISION`, `PROVISION` nodes are created correctly based on evidence payload classification.
- `EVIDENCES`, `DECIDES`, `REQUIRES`, `SUPERSEDES` edges are correctly drawn.
- **Contradictions & Superseding:** Properly handled by sorting decisions by `updatedAt` and drawing `SUPERSEDES` edges from newer decisions to older ones.
- **Duplicate evidence & Idempotency:** Managed correctly via Prisma `upsert` and `findFirst` checks.
- **Deterministic Graph Hash:** **FAILED**. Edge IDs are generated dynamically via `randomUUID()` during the initial run (`data: { id: randomUUID(), ... }`). While they remain stable on subsequent runs *within the same database*, hashing the same evidence payload in a fresh database will yield different Edge IDs, and therefore a completely different graph hash.
- **Incomplete Evidence:** If `Review` evidence is processed before `Submission` evidence is present, the `SUBMISSION` node is skipped but `EVIDENCES` edges are still drawn to the bare `submissionId`. 

## 4. PROVISION SEMANTICS
- **Source of active provisions:** Global query `tx.provision.findMany({ where: { status: 'active' } })`.
- **Definition of "active":** String equality on the `status` column.
- **Journal association:** **MISSING**. Provisions are applied uniformly to all submissions without respecting the originating journal, venue, or context.
- **Deterministic ordering:** `findMany` lacks an `orderBy` clause, meaning the order of provision processing relies on internal Postgres retrieval order.
- **Leaked 01D Policy:** None. The synthesis engine strictly builds the graph without evaluating the rules.

## 5. NEW PRIVILEGE MIGRATION
Audit of `20260815000003_wpgov_01c_synthesis_permissions.sql`:
- **Schema Ownership:** Maintained (postgres).
- **Table Privileges:** `governance_ingest_role` granted `SELECT` on `Provision`, and `SELECT, INSERT, UPDATE` on `TraceabilityNode` and `TraceabilityEdge`.
- **DELETE Privileges:** None granted, ensuring the graph is append/update-only for the ingest role.
- **Publication Access Expansion:** None. It strictly targets the `governance` schema.

## 6. RESET REPRODUCIBILITY
- `npx supabase db reset` succeeds completely.
- Predecessor migrations remain unaltered and hash-consistent.

## 7. REGRESSION
- WP-GOV-01B Ingestion-Adapter Tests: 45/45 PASS.
- WP-01-02 Submission Boundary Tests: 14/14 PASS.
- WP-GOV-01C Synthesis Tests: 3/3 PASS.

## 8. FINAL RECOMMENDATION
**`WP-GOV-01C CORRECTION REQUIRED`**

**Justification:**
1. **Hash Non-Determinism:** Generating random UUIDs for Edge IDs prevents deterministic hashing of identical evidence states across environments. Edge IDs must be deterministically derivable (e.g., hash of `fromId + toId + kind`).
2. **Provision Scoping:** Active provisions are applied globally. They must be scoped to the specific journal/venue of the submission.
3. **Incomplete Evidence Topology:** Edges can be created pointing to a `SUBMISSION` node that does not yet exist if the event arrival order is skewed.
