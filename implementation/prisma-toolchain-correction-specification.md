# Prisma Toolchain Correction Specification

## 1. Intended Prisma Version
`PRISMA VERSION INTENT UNRESOLVED`

## 2. Evidence Supporting the Version
The exact intended major/minor Prisma version cannot be conclusively determined from the repository because:
- **Missing Dependencies**: `prisma` and `@prisma/client` are completely absent from `package.json` and `package-lock.json` history.
- **Schema Format**: The `governance/prisma/schema.prisma` file is authored using `url = env("GOVERNANCE_DATABASE_URL")` within the `datasource` block. This configuration is structurally valid for Prisma 5 and Prisma 6, but fundamentally incompatible with Prisma 7 (which mandates `prisma.config.ts`).
- **No Documented Version**: No engineering PDFs or Markdown specifications (`wp-gov-01a-implementation-report.md`, `wp-gov-01-engineering-specification.md`, etc.) explicitly state a specific Prisma version to use.
- **Client Imports**: Governance code (`governance/lib/ingestion/db.ts`) expects `import { PrismaClient } from '@prisma/client';` directly from `node_modules`. This confirms standard client generation was intended, rather than a custom output path, but doesn't isolate the exact version beyond "pre-Prisma 7".

## 3. Exact Current Dependency State
- **`prisma`**: Missing from `package.json` and `package-lock.json`.
- **`@prisma/client`**: Missing from `package.json` and `package-lock.json`.
- **`dotenv`**: Present in `package.json` (`"dotenv": "^17.4.2"`).
- **`pg`**: Present as an unstaged modification in `package.json` (`"pg": "^8.23.0"`) due to the audit.

## 4. Exact `npm install pg` Side Effects
The onboarding audit command `npm install pg` introduced the following unauthorized changes to tracked files:
- **`package.json`**: Added `"pg": "^8.23.0"` to `dependencies`. (Classification: Onboarding side effect)
- **`package-lock.json`**: Added `pg` and its transitive dependencies (`pg-connection-string`, `pg-pool`, `pg-protocol`, `pg-types`, `pgpass`, `pg-cloudflare`, `pg-int8`, `postgres-array`, `postgres-bytea`, `postgres-date`, `postgres-interval`, `split2`, `xtend`). (Classification: Onboarding side effect)

## 5. Recommended Correction Option
**Option A — Pin Existing Intended Prisma Version (Prisma 6.x)** is recommended.
- **Benefits**: This requires the minimal architectural change and preserves the existing, audited Governance schema (which uses the `url = env(...)` format). Upgrading to Prisma 7 (Option B) would necessitate rewriting the Prisma configuration (`prisma.config.ts`), adapting the generation workflow, and re-certifying the architecture. Pinning to Prisma 6 restores deterministic reproducibility to the RC2 baseline immediately.
- **Risks**: An older Prisma version will remain in use, meaning a future upgrade to Prisma 7 will still be required eventually.

## 6. Files that MAY be Modified
If Option A is implemented, ONLY the following files may be modified:
- `package.json` (to add `prisma` and `@prisma/client`, and revert the `pg` addition)
- `package-lock.json` (to lock the Prisma dependencies and revert the `pg` additions)

## 7. Files that MUST Remain Frozen
The following files MUST NOT be modified:
- `governance/prisma/schema.prisma`
- All application logic
- All Governance code (TypeScript, Rego)
- All migration files (`supabase/migrations/*`, `governance/prisma/migrations/*`)
- All tests
- All engineering documents and PDFs

## 8. Exact Validation Plan
1. Revert the unauthorized `npm install pg` side effects: `git checkout package.json package-lock.json`.
2. Install and pin Prisma 6: `npm install prisma@^6.0.0 @prisma/client@^6.0.0 --save-exact`.
3. Run the generator: `npx prisma generate --schema=governance/prisma/schema.prisma`.
4. Verify that Prisma generation succeeds without `P1012` errors.
5. Verify that TypeScript compilation succeeds: `npx tsc --noEmit` (ensuring `governance/lib/ingestion/db.ts` finds `@prisma/client`).
6. Run `npx supabase db reset` and verify that the Governance artifacts deploy correctly.

## 9. Rollback Plan
If validation fails:
1. Run `git checkout package.json package-lock.json` to discard any package dependency changes.
2. Run `npm ci` to restore `node_modules` strictly to the original RC2 baseline state.
3. Abort the reproducibility gate and prepare an Option B (Prisma 7 migration) specification.

## 10. WP-GOV-01A Certification Status
The WP-GOV-01A runtime certification **remains BLOCKED**. The Governance models cannot be deployed or interacted with until the Prisma toolchain is deterministically pinned and client generation succeeds.
