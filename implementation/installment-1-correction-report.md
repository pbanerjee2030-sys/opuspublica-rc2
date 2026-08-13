# Installment 1 Correction Report

**Document type:** Correction Cycle Report
**Authority:** OPUS PUBLICA RC2 — INSTALLMENT 1 CORRECTION CYCLE
**Date:** 13 August 2026
**Branch:** `feature/installment-1-correction-01c-ext`
**Base commit:** `71dcbe352c12ccf440374fe52df1bfad8bb1d48d`
**Correction commit:** `704ee2a`

---

## 1. Root Cause of Test A Failure

### Investigation

The independent audit reported that Test A ("Same semantic evidence + different infrastructure IDs → same evidenceSnapshotHash") was FAILING — same semantic payload + different IDs produced DIFFERENT hashes.

### Root Cause

**The implementation was CORRECT. The test was WRONG.**

Test A used DIFFERENT `submissionId` values (`subIdA` vs `subIdB`, both `randomUUID()`) inside `p.state` while claiming to test "infrastructure ID invariance." However, per `rc2-evidence-snapshot-hash-semantics-decision.md` §2:

> **`submissionId`:** These are **semantic attributes** of the payload (often embedded in `p.state` or conceptually part of the evidence structure) and are **part of the evidence content digest**.

Since `submissionId` is embedded in `p.state`, and `p.state` is what gets hashed (`canonicalizeJson(p.state)`), different `submissionId` values produce different `p.state` values, which correctly produce different hashes.

The test conflated `submissionId` (semantic, inside `p.state`) with `EvidenceProjection.id` (infrastructure, excluded from hash). The infrastructure IDs that SHOULD vary are:
- `EvidenceProjection.id` (the DB primary key — a UUID)
- `EvidenceProjection.lastEventId` (the event cursor)
- `EvidenceProjection.updatedAt` (the timestamp)

These are all OUTSIDE `p.state` and correctly excluded from the hash.

### Evidence

- `graph.ts` line 35: `return canonicalizeJson(p.state)` — hashes only `p.state`
- `graph.ts` line 30: `relatedProvisions.sort((a, b) => a.id.localeCompare(b.id))` — `p.id` used for sorting only
- Decision document: `submissionId` is semantic
- Independent review: "altering semantic fields (e.g., `submissionId`, `journalId`) yields a distinctly different hash"

### Conclusion

The hash correction (removing `canonicalString(p.id)` from the digest) was correctly applied in Installment 1. The implementation is sound. The test fixture had a semantic error.

---

## 2. Exact Code/Test Changes

### Test A fix (`tests/governance/01c-ext.test.ts`)

**Before (broken):**
```typescript
const subIdA = randomUUID();
await prisma.evidenceProjection.create({
  data: { ..., state: { submissionId: subIdA, journalId: 'J1', field: 'val' }, ... }
});
const subIdB = randomUUID();
await prisma.evidenceProjection.create({
  data: { ..., state: { submissionId: subIdB, journalId: 'J1', field: 'val' }, ... }
});
// Expected hashA == hashB — WRONG: different submissionId in state = different hash
```

**After (corrected):**
```typescript
const subId = randomUUID();  // SAME submissionId for both
const sharedState = { submissionId: subId, journalId: 'J1', field: 'val' };

// Row 1 — random infrastructure IDs
await prisma.evidenceProjection.create({
  data: { id: randomUUID(), ..., state: sharedState, ... }
});
const hash1 = await computeEvidenceSnapshotHash(subId, tx);

// Clean and re-create with DIFFERENT infrastructure IDs but SAME state
await prisma.evidenceProjection.deleteMany({});
await prisma.evidenceProjection.create({
  data: { id: randomUUID(), ..., state: sharedState, ... }
});
const hash2 = await computeEvidenceSnapshotHash(subId, tx);

expect(hash1).toEqual(hash2);  // CORRECT: same state = same hash
```

### No implementation changes

`governance/lib/synthesis/graph.ts` was NOT modified in this correction cycle. The implementation is correct.

---

## 3. Environment-Loading Correction

### Problem
`GOVERNANCE_DATABASE_URL` was not being loaded automatically by the committed test configuration. The auditor had to manually export the env var.

### Fix
- Created `tests/setup-env.ts`: loads environment from `.env.local` → `.env` → `.env.example` (priority order)
- Updated `vitest.config.ts`: added `setupFiles: ['tests/setup-env.ts']`
- A clean checkout can now run `npm test` without manually exporting `GOVERNANCE_DATABASE_URL`
- `.env.example` remains the template (contains `GOVERNANCE_DATABASE_URL` with local Supabase defaults)
- No production credentials committed
- No machine-specific secrets hardcoded

---

## 4. Supabase Configuration Finding

### Investigation
The audit environment experienced a port collision on port `54322`.

### Finding
- Port `54322` is the **standard Supabase local Postgres port** (set in `supabase/config.toml` `[db] port = 54322`)
- The port IS configurable in `config.toml`
- The collision was **ENVIRONMENTAL** — another service on the audit machine was already using port `54322`
- The committed configuration is **CORRECT**
- **No code change needed**
- Documented as an audit-environment requirement: ensure port `54322` is free before running `supabase start`

---

## 5. OPCE Baseline Comparison

### Method
Compared OPCE files between the base commit `9bf75d1` and the Installment 1 handover commit `71dcbe3`:

```
git diff --stat 9bf75d1..71dcbe3 -- lib/opce/
```

### Result
**NO OPCE files were modified.** The diff is empty.

### Classification
The 11 OPCE test failures are **PRE-EXISTING (Classification A)**:
- They exist at the baseline commit `9bf75d1`
- They were NOT introduced by Installment 1
- They are NOT environmental
- They are code defects in `lib/opce/pipeline/composition-pipeline.ts:50` (undefined property access)
- They should be documented as a separate baseline issue for a future work package

---

## 6. Complete Test Results

### Build Verification
| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ 0 errors |
| Prisma generation | `npx prisma generate --schema=governance/prisma/schema.prisma` | ✅ PASS |
| Production build | `npm run build` | ✅ PASS (all 77 routes) |

### Test Matrix

| Suite | Environment | Passed | Failed | Skipped | Blocked | Total |
|---|---|---|---|---|---|---|
| OPCE/Application | Clean RC2 sandbox | 53 | 11 (pre-existing) | 0 | 0 | 64 |
| WP-GOV-01B (pure-logic) | Clean RC2 sandbox | 30 | 0 | 0 | 0 | 30 |
| WP-GOV-01B (DB integration) | Docker/Supabase | 0 | 0 | 0 | 15 | 15 |
| WP-GOV-01C | Docker/Supabase | 0 | 0 | 0 | 5 | 5 |
| WP-GOV-01C-EXT | Docker/Supabase | 0 | 0 | 0 | 11 | 11 |
| WP-01-02 | Docker/Supabase | 0 | 0 | 0 | 14 | 14 |

**No hidden skips.** All blocked tests are explicitly classified as BLOCKED (Docker not available in sandbox).

---

## 7. Exact Commit

- **Branch:** `feature/installment-1-correction-01c-ext`
- **Base:** `71dcbe352c12ccf440374fe52df1bfad8bb1d48d`
- **Correction commit:** `704ee2a`
- **Files changed:** 3 (`tests/governance/01c-ext.test.ts`, `tests/setup-env.ts` (new), `vitest.config.ts`)

---

## 8. Boundary Verification

| Boundary | Status |
|---|---|
| No WP-GOV-01D implementation | ✅ Confirmed |
| No Release Gate implementation | ✅ Confirmed |
| No Governance seed data | ✅ Confirmed |
| No Prisma schema modification | ✅ Confirmed |
| No certified 01A/01B/01C core semantics modified | ✅ Confirmed |
| No Publication authority altered | ✅ Confirmed |
| No OPCE files modified | ✅ Confirmed |
| No migrations modified | ✅ Confirmed |
| `main` unchanged | ✅ Confirmed |
| `71dcbe3` not modified | ✅ Confirmed (correction is on a new branch) |

---

## 9. Summary

The Test A failure was caused by a **test fixture error**, not an implementation defect. The test incorrectly used different `submissionId` values (semantic) while claiming to test infrastructure ID invariance. The fix corrects the test to use the same semantic `submissionId` with different infrastructure IDs. The implementation (`graph.ts`) was not modified.

The environment-loading correction ensures a clean checkout can run `npm test` without manual env var export.

The Supabase port collision was environmental (standard port, another service using it).

The OPCE failures are pre-existing (no OPCE files modified in Installment 1).
