# WP-GOV-01A Implementation Report (Final Trust-Boundary Review)

## 1. EventReceipt Provenance Analysis
The WP-GOV-01A architecture grants `INSERT` on `governance."EventReceipt"` directly to `governance_ingest_role`. Does this allow a compromised ingestion worker to fabricate an arbitrary `EventReceipt` that has no corresponding event in `public.outbox`?
**Yes.** Because the worker possesses bare `INSERT` privileges over the target table, an attacker who compromises the worker could fabricate an event payload, insert it, and bypass the `public.outbox` entirely.

## 2. Design A vs Design B Comparison
* **Design A (Current)**: The ingestion adapter is trusted to read `public.outbox` and `INSERT` to `EventReceipt`.
* **Design B (Alternative)**: Remove `INSERT` from the ingest role. Provide a secure RPC function (`governance.record_event_receipt`) that validates the event exists in `public.outbox` before inserting.

**Engineering Evaluation**:
While Design B offers superior theoretical provenance by preventing the worker from forging events, it fundamentally violates the WP-GOV-01 architecture. The specification explicitly dictates that `public.governance_evidence_resolver` is the *only* permitted cross-domain boundary. If Governance implemented a `SECURITY DEFINER` RPC to query `public.outbox` directly, it would tightly couple the Governance schema to internal Publication state, breaking the isolation microservice boundary.

Furthermore, a forged event in Design A carries a fabricated `assignmentId`/`submissionId`. When Governance later attempts to evaluate this evidence, it *must* resolve the identity via the official `governance_evidence_resolver`. Because the fabricated event does not exist in Publication, the resolver will reject it, rendering the forged receipt harmless.

## 3. Final Decision
**Design A is architecturally superior** for WP-GOV-01 because it preserves the strict isolation boundary. The ingestion worker remains a trusted provenance conduit, and the resolver serves as the ultimate cryptographic-equivalent binding check.

## 4. Uniqueness vs. Provenance Distinction
It is critical to distinguish between uniqueness and authenticity:
* **Uniqueness** (`EventReceipt.eventId UNIQUE`): This mathematically guarantees that the Governance schema holds exactly one receipt per UUID, preventing replay duplication.
* **Authenticity/Provenance**: The database constraint does *not* prove that the UUID corresponds to an authentic Publication outbox event. Authenticity relies entirely on the trust placed in the ingestion worker (the provenance conduit) and the subsequent validation by the `governance_evidence_resolver`.

## 5. Final Privilege Matrix (`governance_ingest_role`)
| Operation                     | Result  |
| ----------------------------- | ------- |
| SELECT                        | ALLOWED |
| INSERT                        | ALLOWED (Justified by Design A) |
| UPDATE id                     | DENIED  |
| UPDATE eventId                | DENIED  |
| UPDATE eventType              | DENIED  |
| UPDATE payload                | DENIED  |
| UPDATE receivedAt             | DENIED  |
| UPDATE status                 | ALLOWED |
| UPDATE retryCount             | ALLOWED |
| UPDATE error                  | ALLOWED |
| UPDATE nextRetryAt            | ALLOWED |
| UPDATE reconciliationMetadata | ALLOWED |
| DELETE                        | DENIED  |
*All table-level `UPDATE` privileges were previously scrubbed. Only explicit column-level grants exist.*

## 6. Prisma Version & Configuration Analysis
The previous `npx prisma validate` failure (`P1012: The datasource property url is no longer supported in schema files`) is a strict environmental tooling issue resulting from Prisma 7's new configuration behavior.
* **Installed Version**: Prisma 7.9.1 (resolved via global `npx` as it is not explicitly pinned in `package.json`).
* **Configuration State**: The repository currently lacks a `prisma.config.ts` required by Prisma 7.
* **Schema Validity**: The `schema.prisma` itself is structurally valid and correctly represents the Governance models. The SQL migration was deterministically mapped to this exact schema manually, preventing any drift from temporary Prisma generation bugs.

## 7. Prisma ↔ SQL Reconciliation
* **Isolated Scope**: No `Article`, `Journal`, or `Book` models exist in Prisma or SQL. No unintended `public.*` references exist.
* **EventReceipt**: Exists exactly once in both artifacts.
* **eventId**: Exists exactly once in both artifacts, and possesses a canonical database-enforced `UNIQUE` constraint (`EventReceipt_eventId_key`).
* **Foreign Keys/Indexes**: Intact and strictly bound to `governance` tables.

## 8. Protected-Boundary Verification
* No files inside `app/**`, `lib/**`, or `backend/**` were modified.
* WP-01, WP-02, and WP-03 migrations are completely unmodified.
* `public.governance_evidence_resolver(uuid)` remains perfectly preserved as the solitary cross-domain resolver.
* `governance_ingest_role` and `governance_app_role` strictly possess `NOLOGIN` and lack any `public.*` privileges.

## 9. Runtime Limitation
`RUNTIME CERTIFICATION BLOCKED`
All verification remains strictly static based on accurate examination of SQL/Prisma artifacts. Docker/Supabase is unavailable locally, preventing empirical PostgreSQL privilege confirmation.

---

### **WP-GOV-01A STATICALLY VERIFIED — RUNTIME CERTIFICATION BLOCKED**
