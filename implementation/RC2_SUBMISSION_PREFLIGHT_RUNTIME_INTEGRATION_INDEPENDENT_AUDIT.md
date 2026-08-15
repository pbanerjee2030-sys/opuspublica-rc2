# Opus Publica — Independent Adversarial Audit
## Submission Preflight Runtime Integration

**Date:** 2026-08-15  
**Component:** `lib/submission/preflight.ts` & `app/actions/submitArticle.ts`  
**Classification:** `SUBMISSION PREFLIGHT RUNTIME INTEGRATION AUDIT PASSED`

---

## 1. Fresh Checkout & Diff Scope
- **Current HEAD:** `044561361d1889c45e8a8c50c672a3c334bb2ab9`
- **Parent HEAD:** `7b54668860d794b0f3c70705bb37295ac095adf7`

The diff scope was precisely constrained to the submission runtime and preflight implementation:
- `app/actions/submitArticle.ts`
- `package.json`
- `package-lock.json`

No unrelated changes were found in the governing boundaries or core configuration files.

---

## 2. Actual Runtime Path
The real submission runtime flow in `app/actions/submitArticle.ts` was traced.
- The `SubmitArticlePayload` was augmented to include `articleType`, `license`, and required `coAuthor` fields.
- `validateSubmissionCompleteness` is invoked synchronously before the `submit_article_transition` RPC is executed.
- If the preflight engine returns `complete: false`, the submission immediately aborts, proving that incomplete submissions cannot reach the database transition RPC.

---

## 3. Consolidated Error Contract
Verified that the engine generates a structured response with all errors. Tests run:
- **Scenario A:** Complete submission is allowed.
- **Scenario B:** Missing `license` returns exactly one error.
- **Scenario C:** Multiple omissions return a consolidated checklist `['author_email', 'orcid', 'affiliations', 'corresponding_author_email', 'funding_declaration', 'conflict_of_interest_declaration', 'license']`.
- **Scenario D/E:** Demonstrated that the Form takes precedence over the Manuscript for administrative data.

---

## 4. Canonical Source / Precedence
Tests confirm that FORM_REQUIRED fields must be satisfied by the structured submission payload.
- Form has data, manuscript does not -> PASS
- Manuscript has data, form does not -> FAIL (Blocked)

---

## 5. Journal + Article Type Policy
Requirements dynamically adjust based on the combination of Journal and Article Type:
- **Global Perspectives / Report / Working Paper:** Allows submission without references.
- **Global Perspectives / Journal Article:** Mandates references and strict ORCID/Affiliation checking. Both paths resolve correctly and independently.

---

## 6. Global Perspectives Regression
The regression test (Test M) modeled the specific deficiencies of Article `ba0d39cf-0113-4779-aadb-17f35cc0303f`. 
The engine successfully identified `author_email`, `corresponding_author_email`, `conflict_of_interest_declaration`, `funding_declaration`, and `license` in a single pass, proactively blocking the transition.

---

## 7. Governance Boundary & Security
- The preflight engine serves *only* as a pre-RPC completeness gate.
- It cannot authorize the Release Gate, Bypass Publication Enforcer, or mint DOIs.
- **Cleanup Semantics:** If preflight fails, `supabaseAdmin.storage.from('publications').remove([storagePath])` is immediately executed to ensure no orphaned temporary files are left behind.
- **Security:** No credential handling is exposed, and there is no direct client-side trust logic.

---

## 8. Test Matrix Execution
- `npx tsc --noEmit`: 0 Errors
- `npx vitest run`: Passed 217 / 217 tests across 11 files (13 preflight + 3 runtime-integration).
- `npm run build`: Compiled successfully in 14.8s.
- `node test_submission_boundary.mjs`: 14 passed, 0 failed.

All Certified RC2 Boundaries (WP-GOV-01A to 01F, Release Gate, Publication Enforcer, Evidence Hashing) remain untampered and operational.

---

**FINAL VERDICT:** `SUBMISSION PREFLIGHT RUNTIME INTEGRATION AUDIT PASSED`
