# WP-GOV-01-PREP Security Correction Report

## 1. Exact defect identified
The initial WP-GOV-01-PREP migration suffered from two significant security defects:
1. **Implicit PUBLIC inheritance**: `governance_ingest_role` inherits PostgreSQL's default `PUBLIC` execution privileges, meaning a blanket `REVOKE ALL ON ALL FUNCTIONS` would successfully strip explicitly targeted grants but fail to prevent the role from executing existing sensitive Publication RPCs that lacked `REVOKE EXECUTE FROM PUBLIC`. 
2. **Ineffective future-object protection**: `ALTER DEFAULT PRIVILEGES` intended to prevent `governance_ingest_role` from executing future objects was ineffective against future functions granted to `PUBLIC`, and might not have applied globally without specifying `FOR ROLE`.
3. **Broad search_path**: The resolver's `search_path = public, pg_temp` was unnecessarily broad given all tables inside were explicitly schema-qualified.

## 2. Exact SQL correction made
1. The ineffective `ALTER DEFAULT PRIVILEGES` commands were removed to avoid introducing a potentially breaking future-function policy for Publication.
2. Explicit `REVOKE EXECUTE ON FUNCTION <signature> FROM PUBLIC;` commands were introduced for all identified sensitive Publication RPCs.
3. Explicit `GRANT EXECUTE ON FUNCTION <signature> TO service_role;` commands were added to restore functionality to the legitimate Publication callers.
4. The resolver's `search_path` was changed to `''` (empty string).

## 3. Exact Publication functions affected
- `public.process_article_submission`
- `public.submit_article_transition`
- `public.process_single_audit_event`
- `public.process_review_submission` (Re-asserted for security boundary closure)
- `public.record_decision` (Re-asserted for security boundary closure)

## 4. Exact signatures used
- `public.process_article_submission(uuid)`
- `public.submit_article_transition(uuid, uuid, text, text, jsonb)`
- `public.process_single_audit_event(uuid)`
- `public.process_review_submission(uuid)`
- `public.record_decision(uuid, uuid, text, text, text, integer, timestamp with time zone, uuid[], text)`

## 5. Why legitimate Publication callers remain functional
All analyzed functions are executed asynchronously by background queue workers or explicitly via API routes calling `supabaseAdmin.rpc`. By granting `EXECUTE` directly to the `service_role`, the server application retains full functionality. Existing functions that require end-user execution (if any) were not revoked.

## 6. Default privilege analysis
Because default privilege modification is dependent on knowing the exact role orchestrating future deployments (e.g., `postgres` vs `supabase_admin`) and can blindly break `PUBLIC` execution for legitimately safe Publication functions, the blanket `ALTER DEFAULT PRIVILEGES` was removed. 
**Dependency noted**: Future sensitive Publication functions must explicitly execute `REVOKE EXECUTE FROM PUBLIC` in their own migrations.

## 7. Resolver SECURITY DEFINER analysis
- **search_path**: Changed to `SET search_path = ''`. The function safely executes with an empty path because all objects (`public.reviewer_assignments`, `public.submissions`) are explicitly schema-qualified. This eliminates all risk of `pg_temp` shadowing.
- **Data boundaries**: The output safely returns exactly the 4 required fields (`assignment_id`, `submission_id`, `article_id`, `journal_id`) and performs no arbitrary queries or dynamic SQL.

## 8. Final governance_ingest_role privilege model
- **Allowed**: `EXECUTE` ONLY on `public.governance_evidence_resolver(uuid)`.
- **Forbidden**: `SELECT/INSERT/UPDATE/DELETE` on all Publication tables. Cannot execute any sensitive Publication RPC because they are explicitly revoked from `PUBLIC`. 

## 9. Protected-file verification
No historical migrations or application logic files (`lib/audit.ts`, `app/api/...`) were modified. The correction was contained entirely within `supabase/migrations/20260815000000_wpgov_01_prep_resolver.sql`.

## 10. Static verification results
- `git diff` confirms that only `20260815000000_wpgov_01_prep_resolver.sql` is modified.
- All sensitive RPCs have explicitly revoked `PUBLIC`.
- The resolver is `SECURITY DEFINER` with an empty `search_path`.
- No direct table grants exist for `governance_ingest_role`.

## 11. Runtime limitation
The local Docker/Supabase runtime is unavailable (`docker: command not found`). Runtime verification of empirical permissions cannot be performed.

---

### `WP-GOV-01-PREP SECURITY CORRECTION STATICALLY VERIFIED — RUNTIME CERTIFICATION BLOCKED`
