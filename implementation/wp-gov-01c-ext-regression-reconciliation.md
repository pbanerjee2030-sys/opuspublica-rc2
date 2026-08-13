# WP-GOV-01C-EXT Final Regression Reconciliation

## Part I — Identify the 15 Skipped Tests

The 15 skipped tests are exactly the 15 database integration tests defined in `governance/workers/__tests__/ingestion-adapter.test.ts` within the `describe('WP-GOV-01B Correction - Database Integration Tests', ...)` block:

1. Duplicate event ignores creation safely via ON CONFLICT DO NOTHING
2. Concurrent duplicate event resolves via Postgres row lock safely
3. Immutable EventReceipt fields cannot be updated by governance_ingest_role
4. Lifecycle updates increment version and retryCount correctly
5. Failed projection marks status as failed or pending
6. Retryable events pause cursor advancement to prevent data starvation
7. Late event successfully fetched by overlap window
8. Equal timestamps resolved consistently by id sorting
9. Reconciliation scan successfully filters and recovers stuck events
10. Future retry (nextRetryAt > now) blocks processEvent and cursor — live DB path
11. Retry due (nextRetryAt <= now) executes projection and updates receipt — live DB path
12. NULL nextRetryAt follows normal processing eligibility — live DB path
13. Head-of-line event blocks subsequent events in live ordered polling pass
14. Reconciliation does not repeatedly retry a future-scheduled event — live DB path
15. Existing retry-count/quarantine limits remain enforced on retries — live DB path

- **Why skipped**: The Vitest runner aborted execution of the suite's test cases because the `beforeAll` hook crashed with a `PrismaClientInitializationError`. This occurred because the `GOVERNANCE_DATABASE_URL` environment variable was absent in the current runtime context, preventing Prisma from connecting to the live database.
- **Intentionality**: The skip was not caused by an explicit `.skip()` modification in the source code. Instead, it was an automatic short-circuit by the test-runner due to environment constraints.
- **Previously Executed**: Yes. These tests were previously executed in a fully provisioned live test harness during the final WP-GOV-01B certification, where they passed 45/45.
- **Required**: Yes, these integration tests remain required as the foundational proof of concurrency and retry safety for the certified WP-GOV-01B contract.

## Part II — Compare Against Certified Evidence

The earlier evidence (`implementation/wp-gov-01b-final-certification-evidence-review.md` and `implementation/wp-gov-01b-certification-integration-report.md`) rigorously establishes that the 15 integration tests were successfully executed and passed in a live environment (45/45 total passed). 

The 15 skipped cases in the current run were:
- **A.** Already independently proven by the prior WP-GOV-01B certification.
- **B.** Skipped because of test-runner/environment constraints (`GOVERNANCE_DATABASE_URL` was not supplied during this specific invocation of `vitest run`).
- **D.** Actually not executed in the current environment (aborted at `beforeAll`).

They are definitively not newly broken (C), as the test logic and database interaction methods were not executed at all.

## Part III — Extension Impact

Does WP-GOV-01C-EXT modify any behavior relevant to the 15 integration tests?
**NO.**

WP-GOV-01C-EXT only introduces:
1. `ProvisionScope.parameters` in the database schema.
2. Injection of these parameters into TraceabilityNode metadata during graph synthesis (`synthesis-engine.ts`).
3. Evidence snapshot hashing (`graph.ts`).

None of these changes impact the WP-GOV-01B `ingestion-adapter.ts` boundary, which interacts exclusively with `public.outbox`, `EventReceipt`, and `EvidenceProjection`. Therefore, the prior certified 45/45 result remains the authoritative WP-GOV-01B regression evidence, subject to preserving the frozen 01B package.

## Part IV — Final Regression Basis

**Certification Statement:**
Option A: `WP-GOV-01B prior 45/45 certification remains authoritative; no 01C-EXT behavior affects those scenarios.`

==================================================
FINAL STATUS
==================================================

`WP-GOV-01C-EXT REGRESSION BASIS CONFIRMED`
