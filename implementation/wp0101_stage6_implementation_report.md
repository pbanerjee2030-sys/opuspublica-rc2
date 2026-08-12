# WP-01-02 Stage 6 Implementation Report

## Static Forensic Gate Results

| Requirement | Status | Evidence |
| --- | --- | --- |
| Independent submission_id | PASS | Generated in `app/actions/submitArticle.ts` via `crypto.randomUUID()` and explicitly passed as `p_submission_id`. Zero occurrences of `articleId: payload.submissionId` and `id: payload.submissionId`. |
| Independent article_id | PASS | Generated in `app/actions/submitArticle.ts` via `crypto.randomUUID()` and explicitly passed as `p_article_id`. |
| submission_article_id relationship | PASS | `submit_article_transition` correctly maps `p_article_id` to `submission_article_id` natively. |
| Canonical submission_state | PASS | The RPC inserts exactly `'Submitted'` into `submission_state`. Zero instances of `submission_state = articles.status`. |
| 22-field contract | PASS | `public.submissions` contains exactly the 22 canonical fields (plus additional valid infra/audit tracking fields like `intent_hash` and `idempotency_key`). |
| Submission state machine | PASS | Enforces `'Submitted'` natively as the exclusive initial state for submissions. |
| Independent event_id | PASS | Generated safely within `submit_article_transition` via `v_event_id := gen_random_uuid()`. |
| Independent idempotency_key | PASS | Explicitly provided by client application and safely constrained via `idempotency_key text UNIQUE` in DB schema. |
| Independent intent_hash | PASS | Deterministically calculated over payload variables and file hashes securely in node layer, then rigorously verified by RPC. |
| Atomic ArticleSubmitted | PASS | Inserted safely into `public.outbox` inside the same exact plpgsql function boundary as Submission creation. |
| Idempotency | PASS | The RPC explicitly guards against replays, returning existing identities safely if `intent_hash` matches, or throwing if `intent_hash` differs. |
| Concurrency safety | PASS | Database constraint `idempotency_key text UNIQUE` safely throws PostgreSQL unique constraint violations for concurrent duplicates. |
| Authorization | PASS | Next.js server actions are guarded by `withActionAuth` and Postgres RPC enforces `SECURITY DEFINER` and checks `auth.uid()`. |
| RLS | PASS | `public.submissions` contains explicitly bounded RLS policies for authors and admins. |
| Notification separation | PASS | `emailPayload` and hardcoded HTML rendering have been completely removed from the authoritative submission flow and canonical domain event payload. |
| Protected predecessor integrity | PASS | `git diff -- lib/audit.ts app/api/notifications/route.ts app/api/doi/mint/route.ts` remains fully clean (0 modifications). |
| TypeScript | PASS | `npx tsc --noEmit` completes cleanly without errors. |
| Production build | PASS | `npm run build` completed statically and generated the `.next` artifacts without error. |
| Runtime verification | BLOCKED | `test_submission_boundary.mjs` fails due to `Error: supabaseKey is required.` The live Supabase Docker environment is unavailable. |

## Final Status

**READY FOR SUB-01 RUNTIME CERTIFICATION — RUNTIME VERIFICATION OUTSTANDING**
