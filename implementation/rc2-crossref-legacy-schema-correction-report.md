# RC2 Crossref Legacy Schema Correction Report

**Branch:** `feature/opus-publica-crossref-legacy-schema-corrections`

## Context and Discovery
During the independent adversarial audit of the `feature/opus-publica-crossref-multi-record-types` branch, the newly implemented Report/Working Paper support **successfully passed** the independent audit.

However, the rigorous offline XSD validation pipeline deployed during the audit exposed two **pre-existing defects** in the legacy Crossref XML generators:
1. **Journal Article Validation Failure:** The `<publication_date>` element serialized `year` → `month` → `day`. The Crossref 5.5.0 `date_t` complex type mandates `month` → `day` → `year`.
2. **Book Validation Failure:** The `generateBookCrossrefXml` function serialized `<titles>` before `<contributors>`. The Crossref 5.5.0 `book_metadata` complex type strictly enforces `<contributors>` before `<titles>`.

These defects existed in the codebase prior to the new report/working-paper work and were solely identified because of the newly introduced, high-fidelity Python-based XSD audit scripts.

## Corrections Applied
The corrections applied in this branch are strictly limited to **serialization order** within the legacy XML generators (`lib/crossref.ts`):
- **Journal:** Rearranged the XML string interpolation to output `<month>`, `<day>`, `<year>` inside `<publication_date>`.
- **Book:** Rearranged the XML string interpolation so that `${contributorsXml}` precedes the `<titles>` block.

## Constraints Verified
- **No Certified RC2 Semantics Changed:** The application data, logic flow, and governance semantics remain identical. The changes only affect the final XML string output ordering.
- **No Live Deposit Performed:** As strictly mandated, absolutely no live deposits to Crossref were performed.
- **Strict Scope Kept:** No modifications were made to Release Gate, Publication Gate, certification logic, nonce logic, historical-date governance, lifecycle governance, or any report/working-paper architecture. 

## Validation Results
- The established offline Crossref 5.5.0 XSD validation pipeline was executed on representative outputs for:
  - Journal Article
  - Book
  - Report (Standalone)
  - Report (Series)
- **All four outputs now fully pass actual XSD validation.**
- The full test suite (`npx vitest run`) confirms no regressions against the baseline testing matrix.
