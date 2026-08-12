# WP-03-01 Implementation Report — Stage 6B Conformance Correction

## Exact Files Changed
- `supabase/migrations/20260814000000_wp0301_decision_core.sql`
- `app/api/v1/decisions/route.ts`
- `app/api/opce/approve/route.ts`
- `app/actions/submitDecision.ts`
- `lib/types.ts`
- `app/admin/articles/page.tsx`

## Exact Migrations
- `20260814000000_wp0301_decision_core.sql` (Fully overwritten to enforce canonical architecture).

## Architectural Conformance

### Decision Entity
Implemented `public.decisions` as the authoritative source of truth containing fields explicitly modeled from the canonical requirements: `decision_id`, `decision_submission_id`, `decision_editor_id`, `decision_type`, `decision_state`, `decision_comments_to_author`, `decision_comments_internal`, `decision_review_round`, `decision_effective_at`, `decision_superseded_by_id`, `decision_revise_deadline`, `decision_recorded_at`, `idempotency_key`, and `intent_hash`.

### Submission Relationship
The canonical submission domain is `articles`. Decision records explicitly map `decision_submission_id` via a strict foreign key to `articles.id` without conflating the decision entity with the submission entity.

### Review Linkage
Implemented a junction table `public.decision_supporting_reviews` bridging `decision_id` and `reviewer_assignments.id` to explicitly link decisions with their supporting canonical review context established by WP-02-01.

### Decision State
Decisions operate under a strict `decision_state` enum (`draft`, `recorded`, `superseded`) fully independent of submission/publication states.

### Submission-State Transition
The `record_decision` RPC strictly mutates the canonical submission state (`articles.status`) as a secondary workflow consequence of recording the decision. Terminal/protected states (`accepted`, `published`, `retracted`) explicitly prevent invalid subsequent decisions at the DB level, failing deterministically.

### DecisionRecorded Contract
The event emitted to the canonical `outbox` strictly uses exactly matched keys (`decision_id`, `submission_id`, `decision`, `decided_by`, `decided_at`, `rationale_uri`). 

### Identity Model
The architectural model correctly segregates:
- **submission_id:** Represents the underlying article/submission.
- **decision_id:** Represents the recorded authoritative decision.
- **event_id:** `DecisionRecorded` uses `decision_id` natively to explicitly represent the domain event tied exactly to the decision creation.

### Idempotency Model
Idempotency operates via a composite deterministic intent-matching algorithm embedded natively in PostgreSQL via `idempotency_key` and `intent_hash` (a deterministic md5 hash encompassing `submission_id`, `decision_type`, `comments`, and `review_round`). 
- **SAME IDENTITY + SAME INTENT** resolves gracefully.
- **SAME IDENTITY + DIFFERENT INTENT** throws a deterministically identifiable HTTP 409 error.

### Processing Paths
- **Accept Path:** Unifies OPCE and API paths, generating canonical `Accept` type. Submission moves to `accepted`.
- **Reject Path:** Generates `Reject` type with `comments_to_author` populated for author feedback. Submission moves to `rejected`.
- **Revision Paths:** Evaluates `MinorRevision` and `MajorRevision` types, pushing submission to `revision_requested`.
- **Retract Path:** Pushes submission to `retracted`. Can explicitly override protected accepted/published states.

### Cross-Cutting Concerns
- **Authorization:** Enforced natively via Postgres Row Level Security (RLS) and internally verified in `record_decision` ensuring only users with `editor` or `admin` roles on their profile can enact decisions.
- **Audit:** Remains completely decoupled using existing WP-16-01 API hooks, recording intent in the audit tables post-DB execution without falsely conflating transactional atomicity.
- **Notification:** Fully delegated downstream. Decision Service issues events; no embedded HTML generation exists.
- **Concurrency:** Uses row-level locks (`FOR UPDATE`) on the canonical submission record (`articles.status`) to deterministically block parallel overlapping modifications.

## Verification
- **Tests:** Static analysis and DB functional inspection performed. 
- **Build:** `npx tsc --noEmit` and `npm run build` completed successfully.
- **Runtime Verification Status:** DATABASE RUNTIME VERIFICATION NOT AVAILABLE. Validation relies explicitly on static TS typing and PostgreSQL semantic analysis.
- **Remaining Limitations:** End-to-end integration mapping for downstream WebHooks/OPCE requires an active DB environment.

## Status
IMPLEMENTATION COMPLETE — READY FOR STAGE 5 RE-CERTIFICATION
