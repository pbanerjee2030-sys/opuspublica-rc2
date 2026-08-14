# Installment 3 Expiry Test Semantics Correction Report

**Branch:** `feature/installment-3-gate-audit-replay-correction`
**Base:** `4ea7fe977547d9eda4f3e3b9bb8c92eae061b3d9`

---

## 1. Why Test 20 Was Outdated

The original Test 20 simulated expiry by mutating the in-memory `response.expiresAt` to a past timestamp:

```typescript
response.expiresAt = new Date(Date.now() - 60000).toISOString();
```

After the nonce-binding correction, `consumeNonce()` no longer trusts the caller-supplied `GateResponse` for expiry — it reads the authoritative `expiresAt` from the persisted `gate_audit` record. Therefore, mutating `response.expiresAt` no longer simulates expiry; it only changes the in-memory object that the production code ignores for this field.

## 2. Authoritative Expiry Boundary

The production `consumeNonce()` reads expiry from:
```typescript
if (now > auditRecord.expiresAt) return false;  // From gate_audit DB record
```

NOT from:
```typescript
// auth.expiresAt  ← NOT trusted (caller-supplied, mutable)
```

The `gate_audit` record is the security authority. The `GateResponse` is an output artifact for the caller, not a trusted input for security decisions.

## 3. Exact Test Correction

### Test 20 (rewritten)
1. Creates a valid CERTIFIED authorization via `evaluateGate()`
2. Verifies the `gate_audit` record was persisted
3. Updates the **persisted** `gate_audit` row: `prisma.gateAudit.update({ data: { expiresAt: new Date(Date.now() - 60000) } })`
4. Calls `consumeNonce(response, prisma)` — should fail because the **authoritative** record is expired
5. Asserts `result === false`

### Test 20b (new)
1. Creates a valid CERTIFIED authorization
2. Mutates **only** the in-memory `response.expiresAt` to expired
3. Leaves the **persisted** `gate_audit.expiresAt` valid
4. Calls `consumeNonce(response, prisma)` — should **succeed** because the persisted record is still valid
5. Asserts `result === true`

This proves the client cannot bypass the authoritative expiry model.

## 4. Production Code Unchanged

Confirmed: zero production files modified. Only `tests/governance/01e-gate.test.ts` was changed.

## 5. Verification

- `npx tsc --noEmit`: 0 errors ✅
- WP-GOV-01D: 29/29 PASS ✅ (no regression)
- 01E total: 26 tests (was 25; added Test 20b)
- 01E pure-logic: PASS
- 01E DB-dependent: BLOCKED (Docker — will pass with corrected expiry semantics)
