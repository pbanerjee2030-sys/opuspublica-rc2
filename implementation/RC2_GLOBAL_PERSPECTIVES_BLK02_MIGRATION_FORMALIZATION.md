# RC2 — GLOBAL PERSPECTIVES BLK-02 MIGRATION FORMALIZATION

**Date:** 2026-08-15
**Goal:** Formalize the `published_at` nullable schema migration.

## REPORT

* The production schema change (`ALTER COLUMN published_at DROP NOT NULL`) was already applied previously to unblock article administration.
* This PR strictly formalizes the exact applied migration (`20260815052919_drop_published_at_not_null.sql`) in the repository history, satisfying the tracked governance requirements.
* No additional production schema mutation was performed during this operation.
* No article publication, Release Gate initialization, or DOI deposit activity occurred.

## VERIFICATION

* All tests (`npx vitest run`), type checks (`npx tsc --noEmit`), and boundary regressions (`test_submission_boundary.mjs`) passed without failure.
* The Next.js production build (`npm run build`) succeeded.
* The target article `ba0d39cf-0113-4779-aadb-17f35cc0303f` remains in `pending_review` status with `published_at = NULL` and `doi_deposit_status = not_submitted`.
