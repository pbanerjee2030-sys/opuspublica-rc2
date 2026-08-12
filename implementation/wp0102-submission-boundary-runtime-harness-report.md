# WP-01-02 SUBMISSION BOUNDARY RUNTIME HARNESS REPORT

## 1. EXACT ORIGINAL AUTH FAILURE
The original test failed with `RPC Error: Unauthorized`.

## 2. REASON `auth.uid()` WAS NULL
The test client was instantiated solely using an API key (Anon or Service Role) without an established user session. Consequently, the API calls lacked a valid JWT containing a `sub` (subject/user ID) claim, causing `auth.uid()` to evaluate to `NULL` during the RPC execution.

## 3. TEST-USER SETUP METHOD
Two disposable test users (`wp0102.runtime.editor@example.local` and `wp0102.runtime.author@example.local`) were created via `supabaseAdmin.auth.admin.createUser` utilizing the local Service Role key. 

## 4. ROLE ASSIGNED
The roles `editor` and `author` were assigned to the users respectively by injecting `{ role }` into the `user_metadata` field during creation, which triggers the database to correctly populate `public.profiles.role`.

## 5. AUTHENTICATION METHOD
Test clients were instantiated using the Anon key and subsequently authenticated via `client.auth.signInWithPassword` using the newly created users' credentials.

## 6. DISTINCTION BETWEEN SETUP AND RPC INVOCATION
The `supabaseAdmin` client (Service Role) was strictly used to create users, clean up users, and perform the final data validation assertions against the database. The actual `submit_article_transition` RPC was executed EXCLUSIVELY by the authenticated `editorClient` and `authorClient`, fully respecting the RLS/RPC execution boundaries.

## 7. EXACT TEST RESULTS
The test successfully connected but failed the runtime DB assertions due to an underlying application/database permissions defect.
* **Passed:** 2 (Negative authorization test, Conflicting request failed deterministically)
* **Failed:** 6 (All positive submission creation workflows failed)
**Failure Reason:** `RPC Error (Editor): permission denied for function submit_article_transition`. The authenticated Editor user lacks PostgreSQL `EXECUTE` permission on the RPC itself.

## 8. NEGATIVE AUTHORIZATION TEST RESULTS
The negative test successfully evaluated the `author` user. The user was denied execution, yielding: `permission denied for function submit_article_transition`.

## 9. CLEANUP RESULT
Both test users were successfully deleted in the `finally` block using `supabaseAdmin.auth.admin.deleteUser`.

## 10. FILES CHANGED
* `test_submission_boundary.mjs`

## 11. SOURCE VERIFICATION
Git diff and status confirm that ONLY `test_submission_boundary.mjs` was modified. No migrations, application code, RPC definitions, or Governance configurations were touched.

## FINAL CLASSIFICATION
**WP-01 RUNTIME TEST FAILED — APPLICATION OR DATABASE DEFECT**
