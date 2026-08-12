# OPUS PUBLICA RC2 — WP-03-01 STAGE 6 CORRECTION SPECIFICATION

## A. Stage 6 Status
**STATUS: EVIDENCE VERIFIED — CORRECTION SPECIFICATION READY**
This document serves as the controlled engineering blueprint to rectify the critical architectural deviations identified during the WP-03-01 certification conformance review. It outlines the specific steps required to restore certified baselines, align the implementation with the authoritative Constitution, and fulfill the Decision Service Core requirements without modifying the existing architecture. 

## B. Confirmed Blockers
1. **Certified Predecessor Modification:** Unauthorized uncommitted changes modifying `lib/audit.ts`, `app/api/notifications/route.ts`, and `app/api/doi/mint/route.ts`.
2. **Database Functions Generating HTML:** `process_decision_submission` RPC improperly generates and queues HTML emails inside PostgreSQL.
3. **articleId as Event ID:** `articleId` conflated with outbox event ID, violating idempotency and uniqueness constraints.
4. **Decision Entity Omitted:** Lack of a `decisions` table/record; direct mutation of `articles.status`.
5. **API Contract Absent:** `POST /api/v1/decisions` missing.
6. **Split Decision Path (HIGH):** Conflicting paths for `Accept` decisions between new Server Actions and legacy `/api/opce/approve`.

## C. Governing Requirements
The corrections must adhere strictly to:
- RC1 Engineering Constitution (Vol I & II)
- WP-03-01 Decision Service Core Specification
- RC2 Technical Architecture Specification
- Foundational Principle: Separation of Concerns (Decision Service vs. Notification Service)
- Foundational Principle: Immutable Audit Trails

## D. Correction 1 — Certified Baseline Restoration
**Governing Requirement:** Preservation of Certified Work Packages (WP-16-01, WP-17-01, WP-20-01).
- **Current Defect:** Uncommitted changes in WP-03-01 workspace modify certified predecessor files to inject outbox/event behavior manually or alter error handling.
- **Required Target Behavior:** Discard all uncommitted changes in these files, reverting them strictly to their `HEAD` state prior to the WP-03-01 intervention.
- **Affected Files:** `lib/audit.ts`, `app/api/notifications/route.ts`, `app/api/doi/mint/route.ts`.
- **Dependencies:** None.
- **Verification Evidence:** `git diff` showing zero changes against `HEAD` for these specific files.
- **Rollback Consideration:** Trivial; utilizing `git restore` on these specific files. No WP-03-01 functionality may legitimately depend on these unauthorized changes; WP-03-01 must implement its own domain events.

## E. Correction 2 — Notification Boundary
**Governing Requirement:** Event-Driven Architecture and Separation of Concerns.
- **Current Defect:** `process_decision_submission` RPC constructs hardcoded HTML and inserts a `NotificationQueued` event directly.
- **Required Target Behavior:** The Decision Service must strictly emit a `DecisionRecorded` event. The Notification Service (or an intermediate event consumer) is solely responsible for consuming `DecisionRecorded`, mapping it to the appropriate template, and dispatching the notification.
- **Affected Files:** `supabase/migrations/20260813_wp0301_decision_outbox.sql` (to be rewritten/dropped), `backend/workers/decisionWorker.ts`.
- **Dependencies:** Notification Service consuming `DecisionRecorded` (if within WP-03-01 scope) or relying on existing pub/sub mechanics.
- **Verification Evidence:** Code inspection showing no HTML in DB functions; integration test verifying `DecisionRecorded` triggers Notification workflow.
- **Rollback Consideration:** Handled via standard DB migration rollback.

## F. Correction 3 — Decision Identity
**Governing Requirement:** Deterministic Event Identity and Idempotency.
- **Current Defect:** `app/actions/submitDecision.ts` explicitly sets the outbox `id` to `payload.articleId`.
- **Required Target Behavior:**
  - `decision_id`: A unique UUID primary key for the new `decisions` table.
  - `event_id`: A uniquely generated UUID for the `outbox` table.
  - `idempotency_key`: Provided by the client (via header) or deterministically generated based on `article_id` + `decision_type` + `editor_id` + `review_round` to ensure exactly-once processing of a specific intent.
  - *Same intent:* Returns existing `decision_id` and idempotent success without creating a new event.
  - *Different intent:* Triggers a new decision sequence if state rules allow, or a deterministic conflict if attempting to contradict a terminal state for the same review round.
- **Affected Files:** `app/api/v1/decisions/route.ts` (to be created).
- **Dependencies:** Database schema updates.
- **Verification Evidence:** Contract test attempting duplicate submissions, proving HTTP 201 on first, HTTP 200/201 idempotent success on exact retry, and HTTP 409 Conflict on conflicting intent.

## G. Correction 4 — Decision Entity
**Governing Requirement:** Independent Decision Domain Model.
- **Current Defect:** No `decisions` table exists.
- **Required Target Behavior:** Create a `decisions` table with the following schema:
  - `id` (UUID, PK)
  - `article_id` (UUID, FK to articles)
  - `editor_id` (UUID, FK to profiles)
  - `decision_type` (ENUM: Accept, MinorRevision, MajorRevision, Reject, Retract)
  - `rationale` (Text)
  - `review_round` (Integer)
  - `created_at` (Timestamptz)
- **Distinction:** The `decision` record captures the editorial choice. The article's publication lifecycle state (`articles.status`) is updated as a *postcondition* of the `DecisionRecorded` event.
- **Affected Files:** New database migration.
- **Dependencies:** Article and Profile tables.

## H. Correction 5 — API Contract
**Governing Requirement:** Canonical REST API endpoints.
- **Current Defect:** Bypassed via Next.js Server Action (`submitDecision.ts`).
- **Required Target Behavior:** Implement `POST /api/v1/decisions`.
  - **Authentication:** Valid session / Bearer token.
  - **Authorization:** Verifies actor holds `editor` or `admin` role AND is authorized for the target article's journal.
  - **Request Body:** `{ "articleId": "uuid", "decisionType": "enum", "rationale": "string" }`
  - **Response:** `201 Created` with decision metadata.
  - **Idempotency Mechanism:** `Idempotency-Key` HTTP header.
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (State violation).
  - **Event Behavior:** Writes `DecisionRecorded` to outbox.
  - **Audit Behavior:** Standard `logAuditEvent` integration.
- **Affected Files:** `app/api/v1/decisions/route.ts`
- **Dependencies:** Decision Entity, OIDC/RBAC logic.

## I. Correction 6 — Unified Decision Path
**Governing Requirement:** Single Authoritative Source of Truth for State Mutation.
- **Current Defect:** Legacy `/api/opce/approve` and new Server Actions form a split-brain architecture.
- **Required Target Behavior:** Deprecate or refactor `/api/opce/approve` to internally utilize the `POST /api/v1/decisions` contract (or the underlying core service logic). The Server Action `submitDecision.ts` must be removed or strictly act as a proxy to the unified API.
- **Affected Files:** `app/api/opce/approve/route.ts`, `app/actions/submitDecision.ts`.
- **Dependencies:** API Contract (Correction 5).

## J. Corrected State Machine
**Decision State vs. Publication State:**
Editorial decision states dictate the manuscript's internal workflow.
- **Transitions:**
  - `InReview` -> (Action: `record_decision(MinorRevision)`) -> `RevisionRequested` (Actor: Editor) -> Event: `DecisionRecorded`, Audit: Yes, Notification: Yes.
  - `InReview` -> (Action: `record_decision(Reject)`) -> `Rejected` (Actor: Editor) -> Event: `DecisionRecorded`, Audit: Yes, Notification: Yes. (Terminal for Editorial).
  - `InReview` -> (Action: `record_decision(Accept)`) -> `Accepted` (Actor: Editor) -> Event: `DecisionRecorded`, Audit: Yes, Notification: Yes. (Transitions to Production/Publication lifecycle).

## K. Certified Infrastructure Reuse
- **Canonical Outbox:** Decisions API uses the standard `outbox` table pattern, emitting `DecisionRecorded`.
- **Canonical Audit Chain:** Decisions API uses the standard `lib/audit.ts` implementation (restored to baseline).
- **Notification Infrastructure:** Reuses existing Notification Service patterns to react to `DecisionRecorded`.
- **RBAC Boundary:** Uses canonical `withAuth` and permissions libraries.
- **Durable Retry:** Defers to the standard outbox worker logic.

## L. Exact Files Expected to Change
- `supabase/migrations/[timestamp]_create_decisions_table.sql` (NEW)
- `app/api/v1/decisions/route.ts` (NEW)
- `backend/workers/decisionWorker.ts` (REFACTOR)
- `app/api/opce/approve/route.ts` (REFACTOR)
- `app/actions/submitDecision.ts` (DELETE or REFACTOR)

## M. Files That MUST NOT Change
- `lib/audit.ts` (Must be RESTORED to HEAD and left untouched)
- `app/api/notifications/route.ts` (Must be RESTORED to HEAD and left untouched)
- `app/api/doi/mint/route.ts` (Must be RESTORED to HEAD and left untouched)

## N. Migration Requirements
- Drop the flawed `20260813_wp0301_decision_outbox.sql` migration.
- Create a new migration introducing the `decisions` table with strict foreign keys and constraints.

## O. Worker Requirements
- `decisionWorker.ts` must safely consume `DecisionSubmitted` (if command pattern is kept) or be removed if the API handles the synchronous DB transaction directly. *Architectural guidance prefers the API handling the atomic DB write (decision + outbox event) and the outbox relaying the event, eliminating the need for a command-based worker.*

## P. API Requirements
- Standardized REST compliance for `/api/v1/decisions`.

## Q. Idempotency Requirements
- Handled at the API layer via header caching or deterministic hashing against a dedicated `idempotency_keys` mechanism.

## R. Authorization Requirements
- Target-based journal authorization verified before any mutation.

## S. Audit Requirements
- Handled via canonical `logAuditEvent` from `lib/audit.ts`.

## T. Notification Requirements
- Notification dispatch is strictly decoupled from the database and handled by an event consumer listening to `DecisionRecorded`.

## U. Concurrency Requirements
- Database-level locking on the `articles` row during the decision transaction to prevent race conditions.

## V. Failure/Recovery Requirements
- Outbox pattern ensures guaranteed delivery of `DecisionRecorded` events even if downstream systems fail.

## W. Verification Requirements
- API Integration Tests, Contract Tests, and State Machine verification tests confirming constraints.

## X. Rollback Requirements
- Database migrations must include `down` scripts. APIs must be versioned if necessary.

## Y. Scope Exclusions
- OPCE internal refactoring.
- WP-04 implementation.

## Z. Stage 6 Exit Criteria
- Approval of this specification by Engineering Leadership.
- All uncommitted changes to certified predecessor files reverted.
- Implementation matching this specification deployed to staging and passing all CI/CD gates.

---
