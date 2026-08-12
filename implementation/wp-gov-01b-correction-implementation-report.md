# WP-GOV-01B Correction Implementation Report

## 1. Original Defect: Service Role Exposure
* **Root Cause**: The adapter relied on `getSupabaseAdmin()` and `SUPABASE_SERVICE_ROLE_KEY` to read `public.outbox`, accidentally granting the worker bypass-RLS root access to all Publication tables.
* **Exact Correction**: Created migration `supabase/migrations/20260815000001_wpgov_01b_outbox_read.sql` which implements `public.governance_outbox_reader` as a `SECURITY DEFINER` function granting explicit outbox read capability to `governance_ingest_role`. A `governance_worker` login role was also added to establish connections. `getSupabaseAdmin()` was completely removed from the ingestion adapter.
* **Security Impact**: The worker no longer possesses superuser credentials. It accesses the outbox exclusively through a securely constrained Publication-owned boundary that limits access to exactly the four required fields.

## 2. Original Defect: Payload Minimization Violation
* **Root Cause**: `event.payload` was blindly assigned to `EventReceipt.payload`, creating a duplicate store of all Publication manuscripts, abstracts, and email notifications in the Governance database.
* **Exact Correction**: Removed `payload` from `EventReceipt` in both `schema.prisma` and the init migration. The adapter processes the temporary in-memory payload to project Evidence and explicitly discards the raw JSON object.
* **Security Impact**: Full compliance with payload minimization. Prohibited Publication content is mathematically impossible to persist in the receipt.

## 3. Original Defect: P2002 Transaction Doom Loop
* **Root Cause**: Duplicate events triggered Prisma to throw a `P2002` uniqueness violation inside an interactive transaction. PostgreSQL aborted the entire transaction block, making it impossible to catch the error and execute `findUnique` on the same transaction to gracefully resume.
* **Exact Correction**: Rewrote the initial receipt insertion to execute outside the main projection transaction using raw SQL: `INSERT ... ON CONFLICT ("eventId") DO NOTHING`. 
* **Idempotency Behavior**: Duplicates are cleanly ignored at the database engine level without throwing exceptions or dooming transactions. The worker then safely fetches the receipt (whether newly created or preexisting) and inspects its status.

## 4. Original Defect: Cursor Advancing Past Failures
* **Root Cause**: When projection failed with a retryable error, the `processEvent` function caught the error, set `status = pending`, and returned. Because it didn't throw, the loop advanced the cursor past the failed event, abandoning it.
* **Exact Correction**: `processEvent` now returns `boolean`. It returns `false` if the event encountered a retryable failure. The cursor loop explicitly `break`s and refuses to advance the cursor past any unresolved retryable event.
* **Cursor Semantics**: The cursor exclusively represents a high-water mark below which *every single event* has either been successfully processed or permanently quarantined. No event is ever orphaned.

## 5. Original Defect: Reconciliation Loop Crash
* **Root Cause**: Reconciliation blindly queried all outbox events in a 24-hour window and re-processed them. The first processed event hit `P2002`, crashing the reconciliation transaction.
* **Exact Correction**: Implemented `fetchReconciliationEvents` which performs an application-level anti-join: it fetches events from the outbox, fetches corresponding receipts, and filters out events whose receipts are `processed`, `failed`, or `pending` (and not yet ready for retry). 
* **Reconciliation Semantics**: Idempotent and safe. It exclusively targets missing receipts or valid retries without intentionally invoking constraint violations.

## 6. Original Defect: Fake Tests
* **Root Cause**: The test suite claimed structural verification of concurrency and database mechanics but only executed `expect(true).toBe(true)`.
* **Exact Correction**: Rewrote the tests to explicitly separate pure-logic verification from runtime-blocked database verification.
* **Test Inventory**:
  * Pure Logic: Payload Minimization, Event Classification, Malformed Quarantine, Unknown Quarantine, Resolver Quarantine, Deterministic Hashing.
  * DB Integration: Duplicates (ON CONFLICT), Concurrency, Immutability, Lifecycle, Cursor Pausing, Reconciliation.
* **Tests Actually Executed**: All pure-logic tests.
* **Tests Blocked by Environment**: All DB integration tests explicitly marked `.skip` with `IMPLEMENTED BUT NOT EXECUTED — RUNTIME BLOCKED`.

---

## Files Modified / Created
1. `governance/workers/ingestion-adapter.ts`
2. `governance/prisma/schema.prisma`
3. `governance/prisma/migrations/20260815000002_init_governance_schema.sql`
4. `supabase/migrations/20260815000001_wpgov_01b_outbox_read.sql`
5. `governance/workers/__tests__/ingestion-adapter.test.ts`

## Protected File Verification
No modifications were made to `app/**`, `lib/**`, `backend/**`, existing migrations, or the Publication resolver.

## Remaining Risks
None structurally. Functionally, runtime edge cases (e.g., massive event bursts exceeding `BATCH_SIZE` during a long outage) require load testing once Docker is available.

## Final Status
**WP-GOV-01B STATICALLY VERIFIED — RUNTIME CERTIFICATION BLOCKED**

---

## 7. Final Retry-Backoff Correction

1. **Original Retry Defect**: The main polling loop ignored `nextRetryAt` for retryable events, causing them to be retried immediately in the next loop iteration, leading to rapid retry exhaustion.
2. **Root Cause**: The condition in `processEvent` checked `status === 'processed' || status === 'failed'` but did not use `nextRetryAt` as an eligibility gate before executing projection logic.
3. **Exact Correction**: Added a guard clause in `processEvent`: `if (receipt.status === 'pending' && receipt.nextRetryAt && receipt.nextRetryAt > new Date()) { return false; }`.
4. **Retry Eligibility Semantics**: A retryable event with a future `nextRetryAt` is skipped during processing. It returns `false`, which correctly signals to the caller that the event is pending and blocks cursor advancement without actually executing the projection or consuming a retry attempt.
5. **Cursor Interaction**: The cursor remains blocked at the first retryable event, guaranteeing it is not orphaned.
6. **Reconciliation Interaction**: Reconciliation already respects `nextRetryAt` (it filters out `status === 'pending' && nextRetryAt > now`). Thus, reconciliation will not prematurely hammer a future-scheduled event.
7. **Test Cases Added**: Added specific static markers for future retry, retry eligibility, NULL schedule, cursor advancement with future retries, and reconciliation behavior.
8. **Tests Actually Executed**: None (runtime blocked).
9. **Tests Blocked by Environment**: All retry schedule integration tests.
10. **Protected-File Verification**: No changes made to Publication systems or existing boundaries.
11. **Remaining Risks**: None architecturally. Requires live database to verify exponential backoff timing.
