# WP-GOV-01B Certification Record

**WORK PACKAGE:** WP-GOV-01B — Governance Ingestion Adapter & Outbox Reader
**STATUS:** CERTIFIED / FROZEN

## Certification Basis

This certification is granted based on the following verified evidence:
- implementation evidence;
- F-03 correction evidence;
- independent adversarial audit;
- clean Supabase db reset;
- 45/45 integration tests;
- 14/14 WP-01-02 regression;
- privilege/security regression;
- cursor safety;
- idempotency;
- reconciliation behavior;
- retry/quarantine behavior.

## F-03 FINAL STATUS

**F-03:** `nextRetryAt` not respected by the main polling loop
**Status:** FIXED / CERTIFIED

The correction has been independently audited and verified under a live database environment to ensure:
- future retry does not execute prematurely;
- future retry blocks cursor advancement;
- later events are not processed ahead of the blocked event;
- due retry executes;
- NULL retry schedule retains normal behavior;
- retry/quarantine behavior remains intact.

## TEST-HARNESS PRIVILEGE NOTE

During integration testing, `GRANT governance_ingest_role TO postgres` was required as a LOCAL TEST HARNESS privilege setup only. This is because the test runner connects via the local `postgres` role, which did not inherit the ingest role.

This was explicitly reversed by `REVOKE governance_ingest_role FROM postgres` during test teardown.

This temporary testing configuration must NOT be represented as part of the production authorization model. Production inheritance remains exclusively:
`governance_worker -> governance_ingest_role`

## CODE INTEGRITY

The implementation has been forensically verified to ensure:
- no debug instrumentation remains;
- no unnecessary production source changes remain;
- F-03 implementation is frozen;
- no Governance schema/migration changes were introduced by F-03;
- WP-GOV-01A remains untouched and frozen;
- Publication code remains untouched.
