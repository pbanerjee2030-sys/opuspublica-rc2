# WP-01/WP-03 Dependency Assessment

## 1. Executive Finding
The current WP-01 implementation fundamentally violates the authoritative Submission Service (SUB-01) architecture. It fails to isolate the Submission domain from the Article domain, writing directly to canonical `articles` and co-opting `articles.status` as submission state. Consequently, the WP-03 Decision Service lacks the constitutionally required upstream Submission Service boundary and is attempting to couple directly to the Article domain.

## 2. Authoritative SUB-01 Requirements
* SUB-01 must create a canonical submission record (`submissions`).
* SUB-01 must own `submissions.submission_state` and manage its transitions.
* SUB-01 must not modify canonical article records.
* The authoritative event `ArticleSubmitted` must represent the durable creation of a submission, with an independent `submission_id` distinct from `article_id`.
* Direct writes to `submission_state` outside of the state machine are forbidden.

## 3. Current WP-01 Evidence
* **`app/actions/submitArticle.ts`**: The `ArticleSubmitted` outbox event aliases `submissionId` directly to `articleId` (`articleId: payload.submissionId, // Use submissionId as articleId to guarantee 1:1 mapping`).
* **`supabase/migrations/20260811_wp0101_submission_outbox.sql`**: The `process_article_submission` RPC processes the `ArticleSubmitted` event by executing a direct `INSERT INTO public.articles`. It sets the `status` to `'pending_review'`.
* **Database Schema**: There is no `submissions` table or entity in the repository.
* **WP-03 Migration (`20260814000000_wp0301_decision_core.sql`)**: The `record_decision` RPC directly references `public.articles(id)` as `decision_submission_id` and mutates `articles.status` (e.g., `UPDATE public.articles SET status = 'accepted'`).

## 4. Requirement Gap Matrix

| Requirement | Repository Evidence | PASS / FAIL | Severity |
|-------------|---------------------|-------------|----------|
| Canonical `submissions` entity exists | No `submissions` table exists. Inserts target `public.articles` directly (`20260811_wp0101_submission_outbox.sql`). | FAIL | CRITICAL |
| `submission_id` is an independent canonical identity | `articleId` is explicitly aliased to `submissionId` in `submitArticle.ts`. | FAIL | CRITICAL |
| `submission_state` independently persisted | Submission state is managed directly via `articles.status`. | FAIL | CRITICAL |
| SUB-01 owns submission-state transitions | State is directly written to the canonical Article domain during RPC processing. | FAIL | CRITICAL |
| `articles.status` is NOT used as submission state | `articles.status` is explicitly used for submission workflow tracking. | FAIL | CRITICAL |
| Does not modify canonical article state during submission | Submission directly creates a canonical `articles` record. | FAIL | CRITICAL |
| `ArticleSubmitted` represents creation of canonical Submission | Event represents creation of an `articles` record. | FAIL | CRITICAL |
| WP-03 has a valid upstream Submission Service boundary | WP-03 directly locks and updates `public.articles`. | FAIL | BLOCKING |

## 5. Certification Impact
A. **Is WP-01-01 actually conformant with the authoritative SUB-01 contract?** No.
B. **Is the historical WP-01-01 certification defensible?** No, the certification failed to detect a fundamental architectural violation.
C. **If not, must WP-01 certification be reopened?** Yes, WP-01 must be decertified and remediated.

## 6. WP-03 Dependency
WP-03 (Decision Service) cannot proceed because its required upstream dependency—the Submission Service boundary—does not exist. Currently, WP-03 is built against the Article domain, which violates the event and state isolation requirements of the authoritative architecture.

## 7. WP-04 Impact
Any downstream services (like WP-04) dependent on the Submission or Decision domains are completely blocked. The foundational state models for submissions and articles must be correctly separated before downstream workflows can be safely implemented.

## 8. Required Governance Action
* Decertify WP-01 and WP-02.
* Halt WP-03 implementation.
* Issue a controlled remediation plan to implement the independent `submissions` table and state machine.
* Refactor `submitArticle.ts` and outbox processing to target the `submissions` domain.
* Refactor WP-03 to depend on `submissions` instead of `articles`.

## 9. Evidence Required for the Next Stage
* A completed architectural remediation plan for separating Submission and Article domains.
* Database migrations defining `submissions` and migrating any existing data (if applicable).
* Updated Submission Service implementations satisfying the SUB-01 contract.
