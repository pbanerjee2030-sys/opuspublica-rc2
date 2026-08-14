# RC2 Post-Remediation Runtime Integration Correction Report

**Branch:** `feature/rc2-post-remediation`
**Base:** `116e7c6bca9ad13f32a7f2257e01d18867f2610b`
**Date:** 14 August 2026

---

## 1. Audit Finding

`onSuccessfulPublication()` and `onLifecycleEvent()` had no production runtime callers — only invoked by tests.

## 2. Actual Runtime Call Chain (traced)

### Publication path:
```
HTTP POST /api/admin/articles/publish
→ withAuth({ roles: ['admin', 'editor'] })
→ validate article exists
→ update articles.status = 'published', published_at = now()
→ generate PDF (or use author PDF)
→ update published_pdf_url
→ logAuditEvent('article_published')
→ onSuccessfulPublication(articleId, governancePrisma)  ← NEW CALLER
  → check gate_audit for valid ALLOW
  → if ALLOW: queueCrossrefDeposit()
  → triggerPreservation() (BagIt package)
→ return success
```

### Lifecycle path:
```
HTTP POST /api/admin/articles/[articleId]/lifecycle
→ withAuth({ roles: ['admin', 'editor'] })
→ validate eventType (CORRECTION/RETRACTION/EXPRESSION_OF_CONCERN/WITHDRAWAL)
→ verify article exists
→ INSERT into article_lifecycle_events (append-only)
→ onLifecycleEvent(articleId, eventType, prisma)  ← CALLS INTEGRATION
  → check for prior confirmed Crossref deposit
  → if exists: queue redeposit
→ logAuditEvent('article_lifecycle_event')
→ return success
```

## 3. Files Changed (3)

| File | Change |
|---|---|
| `app/api/admin/articles/publish/route.ts` | Added import + post-publication call to `onSuccessfulPublication()` |
| `app/api/admin/articles/[articleId]/lifecycle/route.ts` | NEW — lifecycle event API route calling `onLifecycleEvent()` |
| `implementation/rc2-post-remediation-runtime-integration-correction-report.md` | This report |

## 4. Transaction / Failure Semantics

- Publication is committed FIRST (articles.status = 'published')
- Then `onSuccessfulPublication()` runs as a post-commit side effect
- Crossref queue + preservation are durable job records
- If side effects fail: publication is NOT rolled back (non-blocking)
- Workers retry asynchronously
- Failure is durably recorded via console.error + durable job failure status

## 5. Negative Paths

- `onSuccessfulPublication()` only queues Crossref if valid ALLOW exists in gate_audit
- DENY/BLOCKED/expired/tampered → no Crossref queue, no preservation
- Lifecycle API requires admin/editor auth — unauthorized → 401/403

## 6. Test Results

| Suite | Passed | Failed | Skipped | Blocked | Total |
|---|---|---|---|---|---|
| WP-GOV-01D | 29 | 0 | 0 | 0 | 29 |
| Remediation (unit) | 31 | 0 | 0 | 0 | 31 |
| Integration (unit+e2e) | 20 | 0 | 0 | 10 | 30 |
| **Total** | **80** | **0** | **0** | **10** | **90** |

tsc: 0 errors. OPCE: 53 pass, 11 pre-existing, 0 skip.

## 7. Frozen Boundary Check

No certified Installment 1-3 files modified.

## 8. Production Readiness

| Status | Count |
|---|---|
| GREEN (operational + integrated + tested) | 22 |
| AMBER (functional, ops prep) | 10 |
| RED (production blocker) | 0 |
| BLUE (external dependency) | 5 |
