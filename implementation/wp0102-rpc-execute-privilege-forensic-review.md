# WP-01-02 RPC EXECUTE PRIVILEGE FORENSIC REVIEW

## 1. EXACT RPC SIGNATURE
```sql
CREATE OR REPLACE FUNCTION public.submit_article_transition(
    p_submission_id uuid,
    p_article_id uuid,
    p_idempotency_key text,
    p_intent_hash text,
    p_payload jsonb
) RETURNS jsonb
```
* **SECURITY DEFINER**: Yes
* **`auth.uid()` Check**: Yes. The first operation is `v_user_id := auth.uid(); IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;`
* **Role/Authorization Logic**: The function itself does **NOT** check if the user is an `editor` or `author`. It only enforces that a valid user is authenticated.
* **RLS Interactions**: Being `SECURITY DEFINER`, it bypasses RLS constraints inside the function body and forces inserts directly.
* **Expected Authenticated User**: Yes. The function explicitly requires an authenticated user token because of `auth.uid()`.

## 2. CURRENT GRANT / REVOKE STATE
* **WP-01-02**: Did not explicitly specify grants, so it defaulted to `EXECUTE ON FUNCTION ... TO PUBLIC`.
* **WP-GOV-01** (`20260815000000_wpgov_01_prep_resolver.sql`): Explicitly contains:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.submit_article_transition(uuid, uuid, text, text, jsonb) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.submit_article_transition(uuid, uuid, text, text, jsonb) TO service_role;
  ```
* As a result, `anon` and `authenticated` roles do **not** have EXECUTE permission.

## 3. INTENDED CALLER MODEL
The application logic in `app/actions/submitArticle.ts` shows the RPC is called by the Server Action after doing HTML extraction and file uploads.
Currently, `submitArticle.ts` attempts to call it using **Model B** (`supabaseAdmin.rpc`). However, this is fundamentally incompatible with the RPC's internal `auth.uid()` requirement. Because the RPC doesn't accept a `p_user_id` parameter, the **only** functionally sound way to call it is **Model C** (Server-side code using the authenticated user's client) or **Model A** (Frontend client). 

## 4. EXACT EXECUTE PRIVILEGE MODEL
Since the RPC is `SECURITY DEFINER` and internalizes its own identity checks (`auth.uid()`), it is safe and correct to grant:
```sql
GRANT EXECUTE ON FUNCTION public.submit_article_transition(...) TO authenticated;
```
Granting to `PUBLIC` is unnecessarily broad since anonymous users will always fail the `auth.uid()` check anyway. 

## 5. NEGATIVE TEST CORRECTNESS
In `test_submission_boundary.mjs`, the negative test for an `author` role was expecting a denial. However, `submitArticle.ts` explicitly allows `roles: []` (any authenticated user) and the RPC itself does not restrict by role. 
Therefore, an `author` is **intended to be able to submit articles**. The correct authorization test should be:
* **Editor**: EXECUTE allowed, function authorization passes.
* **Author**: EXECUTE allowed, function authorization passes.
* **Anonymous**: EXECUTE denied (or `auth.uid()` fails if EXECUTE was granted to PUBLIC).

## 6. SECURITY CONSEQUENCES
* `GRANT EXECUTE TO authenticated` is safe because the function is `SECURITY DEFINER` and correctly pins the inserted records to the caller's `auth.uid()`.
* `GRANT EXECUTE TO PUBLIC` would be technically mitigated by the `auth.uid()` check, but violates least privilege.
* The function restricts its actions locally to `v_user_id`, meaning an authenticated user cannot forge submissions for other users.
* The `service_role` does not require explicit execution unless a background worker is designed to forge `auth.uid()`.

## 7. COMPARE WITH OTHER RPCS
Other RPCs in the repository (e.g., `process_review_submission`, `process_article_submission`, `record_decision`) were similarly revoked from `PUBLIC` and granted to `service_role` in `wpgov_01_prep_resolver.sql`. This indicates a sweeping "lockdown" by the Governance layer that broke the Publication layer's authenticated RPC invocations.

## 8. REMOTE STATE
Since WP-01-02 hasn't been pushed remotely, `submit_article_transition` does not exist in the remote database (and therefore has no remote EXECUTE privileges).

## 9. EXACT SQL CHANGE THAT WOULD BE REQUIRED
To fix the privilege defect, a migration (or modification to WP-01-02 or WP-GOV) must explicitly execute:
```sql
GRANT EXECUTE ON FUNCTION public.submit_article_transition(
    p_submission_id uuid, p_article_id uuid, p_idempotency_key text, p_intent_hash text, p_payload jsonb
) TO authenticated;
```

## FINAL CLASSIFICATION
### WP-01-02 RPC PRIVILEGE DIAGNOSIS COMPLETE — CORRECTION REQUIRED
