# Installment 3 Gate Audit + Replay Correction Report

**Branch:** `feature/installment-3-gate-audit-replay-correction`
**Base:** `031cd6227a59a7f6ed410e59e355aed5cd08f903`
**Correction commit:** `b9270eb`

---

## 1. Original Audit Finding

Two security defects:
1. No durable `gate_audit` persistence — violates GOV-INV-10
2. In-memory `Set<string> consumedNonces` — not durable, fails multi-instance

## 2. Root Cause

The original gate-evaluator.ts used an in-memory `Set` for nonce tracking and did not persist audit records to the database.

## 3. Files Changed (7)

| File | Change |
|---|---|
| `supabase/migrations/20260821000000_wpgov_01e_gate_audit_nonce.sql` | NEW — gate_audit + nonce_store tables |
| `governance/prisma/schema.prisma` | Added GateAudit + NonceStore models |
| `governance/lib/gate/gate-evaluator.ts` | ASYNC + prisma + durable audit + durable nonce |
| `governance/lib/gate/publication-enforcer.ts` | ASYNC + prisma + durable nonce consumption |
| `app/api/governance/gate/authorize/route.ts` | Updated for async + prisma |
| `tests/governance/01e-gate.test.ts` | Updated for async + DB-backed tests (21 tests) |
| `tests/governance/01f-publication-enforcement.test.ts` | Updated for async + DB-backed tests (9 tests) |

## 4. Gate Audit Design

- `governance.gate_audit` table: UUID PK, authorization_id, submission_id, article_id, requested_action, result, reason, certification binding, hashes, nonce, timestamps, consumed/consumed_at, requester_identity
- Every evaluateGate() call persists a record BEFORE returning
- If persistence fails for ALLOW → result becomes BLOCKED (fail-closed per §3)

## 5. Nonce Consumption Design

- `governance.nonce_store` table: nonce (PK), authorization_id, submission_id, article_id, requested_action, consumed_at
- UNIQUE PK constraint = atomic first-writer-wins (concurrent safe)
- Binding: nonce is stored with authorizationId + submissionId + articleId + action → cross-authorization reuse rejected
- gate_audit.consumed + consumed_at updated on successful consumption

## 6. Concurrency Strategy

PostgreSQL PRIMARY KEY constraint on `nonce_store.nonce` — INSERT succeeds for first consumer, fails for all subsequent attempts. Atomic at the database level. Correct across multiple application instances.

## 7. Security Rationale

- No in-memory `Set<string>` (verified by grep — `consumedNonces` does not exist)
- No eval/new Function/arbitrary SQL
- No service_role exposure
- No Publication mutation
- Audit mandatory for ALLOW (fail-closed)

## 8. Test Matrix

| Suite | Passed | Failed | Skipped | Total |
|---|---|---|---|---|
| WP-GOV-01D | 29 | 0 | 0 | 29 |
| WP-GOV-01E | 21 (DB-dependent) | 0 | 0 | 21 |
| WP-GOV-01F | 9 (DB-dependent) | 0 | 0 | 9 |

01D: 29/29 PASS (pure function, no DB). 01E/01F: DB-dependent (require Docker).

tsc: 0 errors. `consumedNonces` grep: empty (no in-memory Set).
