# Installment 1 Final Portability Correction Report

**Repository**: `pbanerjee2030-sys/opuspublica-rc2`  
**Branch**: `feature/installment-1-remove-audit-artifacts`  
**Auditor**: Antigravity (Engineering Implementation Agent)

## 1. Description of Defect
The previous independent audit (`d5d12be9212a5bc1a6cd07e1f23fc43093411e6f`) identified a valid portability defect. While the environment precedence logic was accepted, the engineering agent incorrectly committed `psql.cmd` and `psql.js`. These are machine-specific (Windows) wrappers that hardcoded `.env.local`, Docker container names, and binary paths, rendering the test harness unportable across different audit machines (Linux/macOS) or CI pipelines.

## 2. Authorized Correction Implemented
Created branch `feature/installment-1-remove-audit-artifacts` based off `d5d12be9212a5bc1a6cd07e1f23fc43093411e6f`.

### Removed Artifacts:
- `[DELETE] psql.cmd`
- `[DELETE] psql.js`

### Modified File:
- `[MODIFY] test_submission_boundary.mjs`

### Final Connection-Resolution Mechanism
To ensure absolute portability without external wrappers, the `psqlExec` function inside `test_submission_boundary.mjs` was modified to feature a robust, fallback-based resolution mechanism:
1. **Native `psql` Probe**: `spawnSync('psql', ['--version'])` is executed first to detect if `psql` is available in the `$PATH` (e.g., standard Linux/macOS environments, or fully configured Windows machines).
2. **Container Discovery (Fallback)**: If `psql` is missing (like on the current audit machine), it dynamically searches for the running Supabase database container using `docker ps --filter name=supabase_db_ --format '{{.Names}}'`.
3. **URL Port Rewriting**: For Docker fallback execution, if the connection URL points to `127.0.0.1` or `localhost`, the forwarded port (`54322`) is safely rewritten to `5432` to connect accurately to the postgres instance _inside_ the container, without needing external port bindings.
4. **Sub-shell Invocation via array arguments**: `execArgs` securely constructs command line arrays directly feeding into `spawnSync`, negating the need for `.cmd` intermediaries.

## 3. Fresh-Checkout Verification
The environment ran under a fresh branch checkout simulating an audit clean environment, successfully starting and resetting the Supabase instance using `npx supabase db reset`. The test harness correctly detected no native `psql`, fell back to the discovered `supabase_db_opuspublica-rc2-local` container, rewrote the DB port to `5432`, and executed successfully.

## 4. Certification Results

- **WP-GOV-01C-EXT Boundary Test**: 14/14 PASS
- **WP-GOV Regression (tests/governance)**: 61/61 PASS
- **TypeScript Typecheck (`npx tsc --noEmit`)**: PASS
- **Prisma Schema Generate**: PASS
- **Next.js Production Build (`npm run build`)**: PASS (16.3.0)

## 5. Next.js Version Discrepancy Note
The build ran using Next.js 16.3.0 as shipped in `package.json`. No `package.json` lock-in changes were attempted as per the "Do NOT modify Next.js" constraints.

## 6. Handoff
All portability defects have been remediated, and no artifacts remain in the root directory. Branch `feature/installment-1-remove-audit-artifacts` is ready to be committed, pushed, and handed off for the final independent audit.
