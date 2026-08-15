# Submission Preflight Completeness Engine

**Status**: Implemented and Verified
**Location**: `lib/submission/preflight.ts`
**Configuration**: `lib/submission/requirements.ts`
**Test Suite**: `tests/submission/preflight.test.ts`

## 1. Architectural Summary

The Submission Preflight Completeness Engine introduces an application-level guard to prevent incomplete submissions from entering the governed lifecycle (editorial review, certification, and Release Gate).

By validating the structured submission form payload against journal-specific and article-type-specific requirements, the engine guarantees that administrative data like author emails, ORCIDs, funding declarations, COI, and licenses are complete *before* any downstream processing occurs.

## 2. Requirement Modeling

Requirements are statically defined per Journal and Article Type, categorized into two buckets:

### A. FORM_REQUIRED
These fields **MUST** be present in the structured submission form.
- `authors` (min 1)
- `author_email` (every author must have an email)
- `orcid` (where required by the journal/article type)
- `affiliations` (where required)
- `corresponding_author` (at least one)
- `corresponding_author_email`
- `funding_declaration`
- `conflict_of_interest_declaration`
- `license`

### B. MANUSCRIPT_REQUIRED
These fields **MUST** be present within the parsed manuscript document.
- `manuscript_file`
- `abstract`
- `references` (where required)
- `tables_figures` (where required)

## 3. Precedence Rules

A core principle of the Opus Publica architecture is that **the structured submission form acts as the canonical source of truth for administrative metadata**.

Therefore, the engine enforces the following precedence rule:
- If a `FORM_REQUIRED` field is present in the structured form but missing from the manuscript, it is **VALID**.
- If a `FORM_REQUIRED` field is present in the manuscript but missing from the structured form, it is **INVALID**. The manuscript is not the canonical source for administrative database compliance.

## 4. Single-Pass Validation

The preflight engine evaluates all requirements simultaneously. If any fields are missing, it returns `complete: false` along with an array of all `missingRequiredFields`. This ensures authors receive one consolidated checklist of deficiencies rather than experiencing piecemeal validation rejections.

## 5. Workflow Integration

The `validateSubmissionCompleteness` engine exposes a pure function interface. It does **not** bypass or modify any existing certified RC2 governance semantics. Instead, it serves as the upstream gatekeeper ensuring only fully complete payloads are allowed to trigger state transitions or be presented for Governance Review.

## 6. Test Coverage

A comprehensive suite of 13 integration tests (`A-M`) has been executed successfully via Vitest, verifying:
- **Completeness Evaluation**: Accurate detection of single and multiple missing fields.
- **Precedence Logic**: Correct handling of manuscript vs. form metadata discrepancies.
- **Differentiated Policies**: Validation of specific requirements for 'Report / Working Paper' vs. generic 'Journal Article'.
- **Regression Prevention**: Accurate flagging of the exact deficiencies previously observed in the `Global Perspectives 2026-02` submission.
