# Supabase Migration-Drift Forensic Review: get_user_role

## 1. Exact Root Cause
The `20260704000001_create_books.sql` migration explicitly invokes `get_user_role(auth.uid())` to authorize `admin` and `editor` users within its Row Level Security (RLS) policies. However, the `get_user_role` function is never defined in any preceding formal migration, nor is it defined in any checked-in bootstrap script (`MIGRATE_ALL.sql`, `schema.sql`). It was created directly in the remote database out-of-band.

## 2. Exact Migration Dependency
In `supabase/migrations/20260704000001_create_books.sql`, the function is used in two RLS policies on `public.books`:
```sql
-- Admins and editors full access on books (using get_user_role definer helper)
CREATE POLICY "Allow admins and editors ALL on books" ON public.books
    FOR ALL TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('admin'::user_role, 'editor'::user_role)
    )
    WITH CHECK (
        get_user_role(auth.uid()) IN ('admin'::user_role, 'editor'::user_role)
    );
```
- **Invocation**: `get_user_role(auth.uid())`
- **Expected Return Type**: `user_role` (enum)
- **Semantics**: Returns the user's role from their profile.
- **Used in**: RLS policy (USING and WITH CHECK).

## 3. Exact Historical Function Definition
A read-only query to the remote database revealed the exact missing definition:
```sql
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = user_id;
$function$
```

## 4. Remote Existence/State
The function `public.get_user_role(uuid)` exists remotely in the production database exactly as defined above.

## 5. Migration-History Status
The remote migration list tracks `20260704000001_create_books.sql` as applied. However, there is no migration recorded or present in the repository that ever creates `get_user_role`.

## 6. Four-State Analysis
**Scenario A** applies: The function exists remotely and was applied through undocumented out-of-band execution. The formal migration defining it is completely missing from the repository.

## 7. Additional Drift Discovered
A forensic review of the migration chain around the same timeline revealed another missing historical dependency:
- The table `public.editorial_board_members` is altered in `20260723000000_add_indexing_status_and_rename_peer_review.sql` (to add a `country` column). However, this table is NEVER created in any numbered migration. It is defined only in the ad-hoc `MIGRATE_ALL.sql` script, meaning any local `db reset` will inevitably fail again at `20260723000000` even if `get_user_role` is fixed.

## 8. Strategy A-D Comparison

### Strategy A: Modify the historical `20260704000001_create_books.sql`
- **Local Reset**: Would succeed.
- **Remote Safety**: FAILS. Modifying an applied migration breaks Supabase's cryptographic checksums, throwing the remote environment out of sync and blocking deployments.
- **Migration Immutability**: FAILS.
- **Production Compatibility**: FAILS.

### Strategy B: Create a chronologically injected idempotent formalization migration
- **Local Reset**: Would succeed (provided all prior drifts are also fixed).
- **Remote Safety**: The CLI warns of history divergence and blocks standard pushes, requiring `--include-all` overrides.
- **Migration Immutability**: PASS (existing files are untouched).
- **Production Compatibility**: Risky due to CLI divergence warnings, but preserves the integrity of existing files.

### Strategy C: Use migration-history repair
- **Local Reset**: FAILS. The local chain fundamentally requires the code to exist before `20260704000001`. `repair` only updates the remote tracking table.
- **Remote Safety**: Risky, directly alters production state tracking.
- **Migration Immutability**: PASS (local files untouched).
- **Production Compatibility**: Requires manual remote synchronization.

### Strategy D: Create a controlled baseline correction
- **Local Reset**: If a new schema baseline is adopted or a squashed migration is used, local reset succeeds. If a forward migration is used, local reset FAILS because historical migrations still crash chronologically.
- **Remote Safety**: Safest for future state, but complex to transition.
- **Migration Immutability**: Requires altering the fundamental approach to `db reset` (e.g. relying on a unified `schema.sql` rather than replaying broken history).

## 9. Recommended Correction Category
**Strategy B (Chronological Injection) combined with Remote History Reconciliation.** 
To restore local reproducibility, the missing definitions *must* be injected chronologically before the migrations that depend on them. Because this inevitably triggers the CLI's history divergence safeguard (`--include-all`), a coordinated plan must be established to apply these injections locally, verify them, and intentionally override the remote tracking once without destroying existing data. 
(Alternatively, adopting a consolidated `schema.sql` baseline to skip replaying broken historical migrations locally).

## 10. Exact Chronology Required
To safely remediate the local chain:
1. `get_user_role(uuid)` must be created **before** `20260704000001_create_books.sql`.
2. `public.editorial_board_members` must be created **before** `20260723000000_add_indexing_status_and_rename_peer_review.sql`.

## 11. Protected-File Verification
Confirmed. No modifications were made to any migration, application code, Governance code, or remote database state. This operation remained strictly read-only.
