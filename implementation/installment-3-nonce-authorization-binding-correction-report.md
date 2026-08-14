# Installment 3 Nonce Authorization-Binding Correction Report

**Branch:** `feature/installment-3-gate-audit-replay-correction`
**Base:** `b05b1233fea8e40266c9d8113ec86c7f1446de19`
**Correction commit:** (see git log)

---

## 1. Vulnerability

`consumeNonce()` trusted caller-supplied authorization context fields (submissionId, articleId, requestedAction, nonce) from the `GateResponse` object without verifying them against the authoritative persisted `gate_audit` record. A caller could alter these fields and still consume the nonce.

## 2. Exploit Path

1. Attacker obtains a valid `GateResponse` with `result: ALLOW`
2. Attacker modifies `submissionId` to a different submission
3. Attacker calls `consumeNonce(tamperedResponse, prisma)`
4. Old behavior: nonce_store INSERT succeeds (uses caller-supplied IDs) → nonce consumed for the WRONG submission
5. New behavior: `consumeNonce()` looks up `gate_audit` by `authorizationId`, verifies ALL context fields match the authoritative record → mismatch → rejection

## 3. Root Cause

The original `consumeNonce()` used `auth.submissionId`, `auth.articleId`, etc. directly from the caller-supplied `GateResponse` to populate the `nonce_store` INSERT. It did not cross-reference these against the `gate_audit` record that was persisted at authorization time.

## 4. Corrected Authority Flow

```
consumeNonce(auth, prisma):
  1. Look up gate_audit by authorizationId
  2. Verify record exists
  3. Verify auditRecord.nonce === auth.nonce
  4. Verify auditRecord.submissionId === auth.submissionId
  5. Verify auditRecord.articleId === auth.articleId
  6. Verify auditRecord.requestedAction === auth.requestedAction
  7. Verify not expired (auditRecord.expiresAt)
  8. Verify result === 'ALLOW'
  9. Atomically INSERT into nonce_store (UNIQUE PK)
  10. UPDATE gate_audit SET consumed=true, consumedAt=now
```

## 5. Transaction/Concurrency Design

Steps 1-8 are read-only verification against `gate_audit` (immutable once written — no UPDATE changes the authorization context fields). Step 9 is the atomic INSERT with UNIQUE PK constraint on `nonce`. If two concurrent consumers both pass verification, only one INSERT succeeds (PK violation rejects the other). This is correct: exactly one winner.

## 6. Tests

Added 4 new binding tests (19b-19e):
- 19b: altered articleId → `false`
- 19c: altered requestedAction → `false`
- 19d: altered authorizationId → `false`
- 19e: altered nonce → `false`

Existing Test 19 (altered submissionId) now correctly expects `false` and will pass because the gate_audit record's submissionId won't match the tampered value.

Total 01E tests: 25 (was 21).

## 7. Regression

- tsc: 0 errors
- 01D: 29/29 PASS
- 01E pure-logic: 13/13 PASS
- 01E DB-dependent (including new binding tests): BLOCKED (Docker)
- No production files modified except `gate-evaluator.ts` (the corrected consumeNonce)

## 8. Security Rationale

The gate_audit record is the authoritative source of truth for authorization context. It is persisted BEFORE the response is returned and is immutable. By verifying all caller-supplied fields against this record, we prevent any tampering with the authorization context after issuance.
