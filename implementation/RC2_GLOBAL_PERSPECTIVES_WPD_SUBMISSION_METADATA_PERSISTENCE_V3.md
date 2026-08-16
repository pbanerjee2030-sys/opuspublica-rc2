# RC2 GLOBAL PERSPECTIVES: WPD Submission Metadata Persistence V3

## Overview
This document formalizes the implementation of **V3 Clean Recovery** for the metadata persistence logic in the submission path, addressing the failures and security violations discovered during the RC2 Root Cause Audit.

## Changes Implemented

1. **RPC Signature Refactor** (`submit_article_transition`)
   - Consolidated `submit_article_transition` to accept a single, comprehensive `p_payload jsonb` argument rather than 10+ flat parameters.
   - Restructured the internal parsing to accurately map JSON fields (such as `authors`, `keywords`, and funding fields) directly to the corresponding relational tables (`public.articles`, `public.article_authors_structured`, `public.author_affiliations`).
   - Improved error boundaries and idempotency handling based on `idempotency_key` and `intent_hash`.

2. **Security and Access Control**
   - **Resolved Privilege Escalation**: Completely removed the test contamination (i.e., `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role`) from `seed.sql`.
   - **RPC Execution Grants**: Explicitly granted `EXECUTE` privileges on `submit_article_transition` to `authenticated` and `service_role` in the V3 migration, properly exposing the RPC without compromising table-level RLS.

3. **Frontend Integration** (`app/actions/submitArticle.ts`)
   - Updated the Next.js Server Action to construct a rich, unified JSON payload containing `authors`, `keywords`, funding metadata, and statements.
   - Switched from calling flat parameters to passing the structured JSON object to the updated RPC.

4. **Integration Testing** (`tests/submission/wpd_v3_e2e.test.ts`)
   - Created a true end-to-end integration test bypassing Supabase admin RLS restrictions for database assertions by using `Prisma.$queryRaw`.
   - The test validates the real application path by executing `submitArticle` (the Next.js action) and parsing the results.
   - Successfully verified persistence across `public.articles`, `public.submissions`, `public.article_authors_structured`, `public.author_affiliations`, and `public.outbox`.
   - Verified that idempotency is correctly handled by the RPC on repeated executions.

## Verification
- **All Integration tests passing**: `npx vitest run tests/submission/wpd_v3_e2e.test.ts` executes successfully.
- **Security Check**: `seed.sql` is purged of non-production test hacks, and migrations cleanly reset and provision the local development environment using standard Supabase RLS policies.
