# WP-GOV-01-PREP Implementation Report

## 1. Objective
Establish the minimal, secure, Publication-owned evidence-resolution boundary required for the Governance Control Plane to resolve `assignment_id → submission_id → article_id → journal_id` for `ReviewSubmitted` evidence. The resolver is the ONLY permitted cross-domain information-release mechanism for this relationship, ensuring Governance never receives general `SELECT` privileges on Publication tables.

## 2. Repository Evidence Inspected
- `supabase/migrations/20260628000000_add_version_control_and_reviewers.sql`: Verified `reviewer_assignments(id, article_id)`.
- `supabase/migrations/20260811_wp0102_submission_domain_remediation.sql`: Verified `submissions(submission_id, submission_article_id, submission_journal_id)`.
- Existing `GRANT/REVOKE` patterns across WP-02 and WP-03 migrations.

## 3. Exact Files Created
- `supabase/migrations/20260815000000_wpgov_01_prep_resolver.sql`

## 4. Exact Files Modified
- None.

## 5. Exact Database Objects Created
- Role: `governance_ingest_role` (if not exists)
- Function: `public.governance_evidence_resolver(uuid)`

## 6. Resolver Definition
```sql
CREATE OR REPLACE FUNCTION public.governance_evidence_resolver(p_assignment_id uuid)
RETURNS TABLE (
    assignment_id uuid,
    submission_id uuid,
    article_id uuid,
    journal_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        ra.id AS assignment_id,
        s.submission_id AS submission_id,
        ra.article_id AS article_id,
        s.submission_journal_id AS journal_id
    FROM public.reviewer_assignments ra
    JOIN public.submissions s ON s.submission_article_id = ra.article_id
    WHERE ra.id = p_assignment_id
    ORDER BY s.submission_submitted_at DESC
    LIMIT 1;
$$;
```

## 7. Security Model
- **Ownership:** Publication-owned (`postgres` by default).
- **Execution context:** `SECURITY DEFINER` bound to `search_path = public, pg_temp`.
- **Exposed data:** Exactly 4 UUIDs. No manuscript, profile, reviewer, or review comment data is exposed.
- **Role restrictions:** `governance_ingest_role` is granted only explicit `EXECUTE` on this function. Default privileges explicitly revoke all future table and function access. All existing `public` functions are explicitly revoked.

## 8. Grant/Revoke Evidence
```sql
-- Strip all function execution from governance_ingest_role
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM governance_ingest_role;

-- Restrict resolver execution
REVOKE ALL ON FUNCTION public.governance_evidence_resolver(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.governance_evidence_resolver(uuid) TO governance_ingest_role;

-- Ensure default privileges don't grant future access
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM governance_ingest_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM governance_ingest_role;
```

## 9. Runtime Tests
`BLOCKED` - The local Docker/Supabase runtime is unavailable (`docker: command not found`). Runtime verification could not be performed. 

## 10. Static Tests
`PASS` - The migration SQL is strictly defined and follows all bounded context rules. The SQL syntax and privilege assignments align exactly with the engineering specification. No direct Publication `SELECT` is granted to the governance role.

## 11. Adversarial Tests
`BLOCKED` - Environment unavailable for live adversarial probing. Statically, search_path manipulation is mitigated by `SET search_path = public, pg_temp`, and direct table access is mitigated by lack of `SELECT` grants and explicit default privilege revocations.

## 12. Protected Predecessor Verification
`PASS` - No predecessor migrations, application code, or business logic were modified.

## 13. Failure/Rollback Procedure
```sql
DROP FUNCTION IF EXISTS public.governance_evidence_resolver(uuid);
```
No cascading dependencies exist since Governance schemas are not yet created.

## 14. Remaining Limitations
Runtime verification is required before progressing to integration testing. The schema correctly defines the isolation layer, but an active database instance must be probed to confirm `governance_ingest_role` permissions behave exactly as specified.

## 15. Certification Decision
`WP-GOV-01-PREP STATICALLY VERIFIED — RUNTIME CERTIFICATION BLOCKED`
