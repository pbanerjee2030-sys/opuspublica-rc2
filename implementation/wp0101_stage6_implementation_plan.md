# WP-01-02 Stage 6 Implementation Plan

## Files to Create
- `supabase/migrations/20260811_wp0102_submission_domain_remediation.sql`
  - Creates the canonical `submission_state` ENUM.
  - Creates the `public.submissions` table with the authoritative 22-field contract.
  - Defines the SUB-01 transition boundary (RPCs for state transitions).
  - Contains historical migration logic from `public.articles`.
  - Establishes RLS for `public.submissions`.
- `implementation/wp0101_stage6_implementation_report.md` (To be created upon completion).

## Files to Modify
- `app/actions/submitArticle.ts`
  - Refactored to call the new SUB-01 transition boundary (RPC) instead of directly inserting into the outbox.
  - Generates independent `submissionId`, `articleId`, `eventId`, and `idempotencyKey`.
- `supabase/MIGRATE_ALL.sql` (and potentially `MIGRATE_ALL2.sql`)
  - Ensure the new migration is sourced correctly.

## Files Explicitly Protected from Modification
- `lib/audit.ts`
- `app/api/notifications/route.ts`
- `app/api/doi/mint/route.ts`
- Downstream WP-02 and WP-03 processors unless a compatibility fix is strictly required and authorized.

## Migration Strategy
- Create a new migration file following repository conventions.
- Define `public.submissions` schema, constraints, and foreign keys.
- Define RLS policies that align with existing profiles/roles.

## Data Migration Strategy
- Backfill `public.submissions` from `public.articles` for existing records.
- Classify historical records based on `articles.status`:
  - Records with `status` matching legacy submission semantics (e.g., `pending_review`, `under_review`, `rejected`) will be classified as RECONSTRUCTABLE or PARTIALLY_RECONSTRUCTABLE and backfilled into `submissions`.
  - Maintain historical `article_id`.
  - Ensure no historical facts (like reviewer decisions) are fabricated; default to `UNKNOWN` or safest terminal state if data is missing.

## State-Machine Implementation
- Establish a PostgreSQL `SECURITY DEFINER` RPC (e.g., `transition_submission_state`) to act as the authoritative SUB-01 boundary.
- The RPC will enforce the state transitions:
  - Drafted → Submitted / Withdrawn
  - Submitted → InReview / Rejected / Withdrawn
  - InReview → RevisionRequested / Accepted / Rejected / Withdrawn
  - RevisionRequested → Submitted / Withdrawn
  - Accepted/Rejected/Withdrawn → Archived
- The RPC will reject invalid transitions and unauthorized actors.

## Event Strategy
- The transition RPC will atomically insert domain events into `public.outbox`.
- For submission creation, it will emit `ArticleSubmitted`.
- Event identity (`outbox.id`) will be generated independently (`gen_random_uuid()`).
- Event payload will include both `submission_id` and `article_id`.

## Idempotency Strategy
- A separate `idempotency_keys` table or a dedicated idempotency column on submissions/events will be established.
- Idempotency identity will be driven by the intent fingerprint, independent of `submission_id`, `article_id`, or `event_id`.
- The transition RPC will enforce idempotency by returning the existing canonical state on exact match, or raising a conflict error on mismatch.

## Security Strategy
- `SECURITY DEFINER` RPCs will explicitly set `search_path = public`.
- Client-provided actor identity will be ignored; the RPC will verify `auth.uid()` against the requested transition.
- RLS on `public.submissions` will restrict access to authors, assigned reviewers (via WP-02 read models), and editors.

## Testing Strategy
- Create automated verification scripts (`test_submission_boundary.mjs` or similar) to execute against a live database.
- Tests will cover: Submission creation, independent identity generation, idempotency success/conflict, state transitions (valid/invalid), RLS enforcement, and ArticleSubmitted emission.
- Output results to a verifiable text file.

## Rollback Strategy
- Provide a `DOWN` migration script or documented rollback commands that `DROP TABLE public.submissions`, `DROP TYPE submission_state`, and restore any modified application logic to the baseline.

## Downstream Interfaces
- WP-02 interface: The new Submission schema provides `submission_id` and `submission_article_id` for WP-02 refactoring (to be implemented later).
- WP-03 interface: WP-03 must call the SUB-01 transition RPC instead of directly updating `articles.status`. WP-03 remains blocked pending WP-01-02 certification.
