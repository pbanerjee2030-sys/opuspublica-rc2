# Installment 3 Test Fixture Correction Report

**Branch:** `feature/installment-3-gate-audit-replay-correction`
**Base:** `e5357205081f0d28217a00d8857d75033f1c8a28`
**Date:** 14 August 2026

---

## 1. Root Cause Investigation

The audit finding states that `tests/governance/01e-gate.test.ts` uses `requestedAction: 'PUBLISH'` instead of `action: 'PUBLISH'` and obscures the error with `as unknown as GateRequest`.

### Inspection result

The **current** test file (at commit `e535720`) does NOT contain:
- `requestedAction` — **zero occurrences** (`grep -rn "requestedAction" tests/` returns empty)
- `as unknown as GateRequest` — **zero occurrences** (`grep -rn "as unknown" tests/` returns empty)
- `as GateRequest` — **zero occurrences** (`grep -rn "as GateRequest" tests/` returns empty)

The current `baseRequest` fixture is:
```typescript
const baseRequest: GateRequest = {
  submissionId: 'sub-1',
  articleId: 'art-1',
  action: 'MINT_DOI',  // ← CORRECT: uses 'action', not 'requestedAction'
};
```

This matches the authoritative `GateRequest` type:
```typescript
export interface GateRequest {
  submissionId: string;
  articleId: string;
  action: ProtectedAction;  // ← expects 'action'
}
```

### Conclusion

The fixture issue described in the audit finding was present in the **original** Installment 3 test (commit `031cd62`), but was **already corrected** in the security correction commit `b9270eb` (which rewrote the entire test file for async + DB-backed patterns). The current test at `e535720` uses the correct `action` property and contains no unsafe casts.

## 2. Test Execution Result

```
Tests: 21 total
Passed: 13 (pure-function tests — no DB required)
Failed: 8 (DB-dependent — PrismaClientInitializationError, no Docker)
Skipped: 0
```

The 8 failures are ALL `PrismaClientInitializationError` — they require a running PostgreSQL/Supabase database. They are NOT caused by a fixture mismatch.

## 3. No Changes Required

No changes were made to `tests/governance/01e-gate.test.ts` because the fixture is already correct. No production code was modified.

## 4. Verification

- `npx tsc --noEmit`: 0 errors ✅
- `npx prisma generate`: PASS ✅
- WP-GOV-01D: 29/29 PASS ✅
- 01E pure-logic tests: 13/13 PASS ✅
- 01E DB-dependent tests: 8 BLOCKED (Docker required) ✅
- No `requestedAction` in test file: confirmed ✅
- No `as unknown as GateRequest` in test file: confirmed ✅

## 5. Production Implementation Not Modified

Confirmed: no production files were changed in this correction cycle.
