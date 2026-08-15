# Opus Publica — Independent Audit & Runtime Integration
## Submission Preflight Completeness Engine

**Date:** 2026-08-15  
**Component:** `lib/submission/preflight.ts` & `app/actions/submitArticle.ts`  
**Base:** `c4d5bc6ad2ad38609a7d12a7e4b1966027e9c5ab`  
**Status:** **AUDIT PASSED & INTEGRATION COMPLETE**

---

## 1. Context

The Submission Preflight Completeness Engine was designed to ensure that journal submissions fulfill all required administrative metadata fields (from the structured form) and manuscript elements *before* they are accepted into the system. This addresses a critical workflow defect exposed during the Global Perspectives publication preparation, where incomplete administrative metadata was not caught until governed review.

This audit report documents the runtime integration of this engine into the authoritative submission pathway, ensuring that the engine correctly acts as a blocking gate without violating established governance, certification, or Crossref serialization semantics.

---

## 2. Integration Architecture

The engine has been integrated directly into the `submitArticle.ts` Next.js server action.

1.  **Payload Augmentation:** The `SubmitArticlePayload` was augmented to accept newly tracked administrative fields: `articleType`, `license`, and within the `coAuthors` array: `email`, `affiliations`, `orcid`, and `isCorresponding`.
2.  **Runtime Interception:** The engine is invoked immediately *after* basic payload validation and manuscript normalization, but strictly *before* the transition boundary (the `submit_article_transition` RPC call).
3.  **Journal Precedence:** The engine fetches the actual journal name dynamically via the `journalId` to ensure the correct compliance matrix from the requirements registry (`lib/submission/requirements.ts`) is applied.
4.  **Enforcement Gate:** If the preflight validation returns `complete: false`, the submission immediately aborts, discarding temporary storage artifacts and returning a consolidated list of missing requirements to the author.

---

## 3. Regression Testing

A runtime regression test suite was constructed at `tests/submission/runtime-integration.test.ts`.

### Scenario A: Complete Form (Pass)
Simulates a valid `Report / Working Paper` submission to Global Perspectives with all required administrative fields (Author Email, Corresponding Author Email, Affiliations, ORCID, Funding Declaration, Conflict of Interest, License). The engine correctly allowed the RPC transition to execute.

### Scenario B: Missing Administrative Fields (Blocked)
Simulated the exact deficiencies observed in the Global Perspectives article (ba0d39cf-0113-4779-aadb-17f35cc0303f), omitting crucial metadata from the structured form. The engine correctly blocked the submission and identified all missing fields (e.g., `author_email`, `funding_declaration`, `license`). The `submit_article_transition` RPC was **not** invoked.

### Scenario C: Consolidated Correction List (Blocked)
Verified that when a submission is deficient in multiple categories across both the structured form and the manuscript, the engine aggregates the violations into a single, comprehensive array of `missingRequiredFields` for front-end rendering, improving the author experience.

---

## 4. Governance Verification Matrix

Following the integration, the full suite of systemic governance validations was executed to guarantee that the preflight engine did not bypass or break any immutable workflow invariants.

- **Typescript Compilation:** `npx tsc --noEmit` — **PASS**
- **Unit & Integration Test Suite:** `vitest run` — **PASS** (16/16 Preflight Tests Passed)
- **Application Build:** `npm run build` — **PASS**
- **Boundary Semantics:** `node test_submission_boundary.mjs` — **PASS** (14/14 Governance Invariants Maintained)

### Key Confirmations:
- The preflight engine operates solely at the application layer as a workflow gate.
- It does **not** override Database-level RPC permissions.
- It does **not** alter the deterministic Intent Hash.
- It does **not** bypass the Release Gate or Publication Enforcer.

---

## 5. Conclusion

The Submission Preflight Completeness Engine has been successfully integrated into the runtime execution path. It robustly enforces journal- and article-type-specific administrative requirements immediately upon submission, preventing deficient articles from entering governed review states. All governance semantics remain strictly enforced. 

**The issue identified during the Global Perspectives review has been programmatically mitigated.**
