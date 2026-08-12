# WP-GOV-01B Adversarial Architecture Review (Forensic Pass)

## STATUS: WP-GOV-01B CORRECTION REQUIRED

The read-only adversarial forensic review of WP-GOV-01B reveals multiple catastrophic implementation defects. While the projection logic correctly uses the evidence resolver and sanitizes projections, the ingestion adapter itself is fundamentally broken due to Postgres transaction violations, severe payload minimization violations, and unauthorized privilege escalation.

---

### 1. Database Role Architecture
The adapter uses `withIngestRole` to wrap Prisma queries in `SET LOCAL ROLE governance_ingest_role`.
- **Verdict**: Prisma connection pooling is safe with `SET LOCAL` (cleared at transaction end). 
- **Defect**: The role executing the connection (typically `postgres` or an admin URL) possesses high privileges, and any query executed outside `withIngestRole` retains those high privileges.

### 2. Outbox Read Privilege & `service_role` Exposure
- **Claim**: Governance only consumes authoritative events securely.
- **Defect**: `fetchOutboxEvents` and `runReconciliationScan` explicitly use `getSupabaseAdmin()`, which relies on `SUPABASE_SERVICE_ROLE_KEY`. 
- **Consequence**: The ingestion worker possesses the database superuser key. If the worker is compromised, the attacker gains unrestricted bypass-RLS read/write access to the entire Publication plane. This completely invalidates the isolated boundary architecture.

### 3. Payload Minimization Violation
- **Claim**: Governance must not unnecessarily create a second durable copy of Publication data.
- **Defect**: `tx.eventReceipt.create({ payload: event.payload })` copies the *entire raw outbox payload* into `governance.EventReceipt`. 
- **Consequence**: This replicates manuscript content, author emails, and reviewer commentary directly into the Governance database, entirely violating the constitutional isolation rule.

### 4. Idempotency & Postgres Transaction Doom Loop
- **Claim**: Duplicate delivery is handled by trapping `P2002` (Unique Constraint Violation) and resuming.
- **Defect**: The `EventReceipt` creation occurs inside a Prisma interactive transaction (`tx`). In PostgreSQL, if a query inside a transaction block throws a constraint violation, the *entire transaction block is immediately aborted* (`current transaction is aborted, commands ignored until end of transaction block`).
- **Consequence**: The subsequent `tx.eventReceipt.findUnique(...)` in the `catch` block will fail catastrophically. The worker cannot recover from duplicate events. Any duplicate event will cause an endless crash loop for that batch.

### 5. Cursor Safety and Data Loss
- **Claim**: Overlap polling safely tracks processing.
- **Defect**: If `projectEvidence` throws a retryable error (e.g., DB disconnect), the catch block sets the receipt status to `pending` with a future `nextRetryAt` and **does not throw**. The loop continues, and the cursor is advanced past the failed event.
- **Consequence**: Because the cursor advances, the primary poller will never fetch that event again. It relies entirely on reconciliation to retry the event. 

### 6. Reconciliation Loop Crash
- **Claim**: Reconciliation safely scans the trailing 24 hours.
- **Defect**: The reconciliation scan blindly queries all outbox events in the last 24 hours and calls `processEvent` on them without filtering out already-processed events.
- **Consequence**: The very first event processed will trigger the `P2002` constraint violation, immediately dooming the Prisma transaction and crashing the reconciliation loop. Reconciliation is effectively non-functional.

### 7. Review the Resolver Path
- **Verdict**: PASS. `projectReviewSubmitted` correctly queries `public.governance_evidence_resolver(uuid)`. If no mapping is found, it throws a non-retryable `ProjectionError`, correctly preventing fabricated evidence. It does not fallback to querying `reviewer_assignments`.

### 8. Fake Test Verification
- **Claim**: Tests execute ingestion, concurrency, and crash recovery.
- **Defect**: The file `ingestion-adapter.test.ts` only tests the stateless `projectEvidence` and `canonicalizeJson` functions. The adversarial tests (duplicates, concurrency, immutability) literally contain `expect(true).toBe(true);`.
- **Consequence**: The previous implementation report falsely claimed structural static verification of mechanisms that were never tested and are factually broken.

---

## CORRECTIVE ACTION REQUIRED
WP-GOV-01B cannot be certified. The following corrections must be made in a subsequent pass:

1. **Remove `service_role`**: The adapter must NOT use `getSupabaseAdmin()`. `governance_ingest_role` must be granted explicit `SELECT` on `public.outbox`, or a dedicated `outbox_reader` role must be used.
2. **Remove Payload Storage**: `EventReceipt.payload` must NOT store the raw payload. It should be removed from the schema, or at most, store an opaque hash of the payload.
3. **Fix Postgres Transactions**: The duplicate check (`findUnique` / `upsert`) must occur *before* or *outside* the strict transaction block, or use Postgres `ON CONFLICT DO NOTHING` to prevent transaction aborts.
4. **Fix Cursor Advancement**: The cursor must not advance if an event is left in a `pending` / retryable state within the batch.
5. **Fix Reconciliation**: Reconciliation must filter out events that already have a `status = 'processed'` receipt, or rely on `ON CONFLICT DO NOTHING` without crashing.
6. **Write Real Tests**: The adversarial assertions must be removed or marked as conceptually blocked rather than mocking `expect(true).toBe(true)`.

**NO SOURCE CODE MODIFICATIONS WERE MADE DURING THIS FORENSIC REVIEW.**
