# Prisma Governance Toolchain Forensic Review

## 1. Exact Prisma Versions
- **Prisma CLI (Requested/Tracked)**: `None` (Prisma is entirely absent from `package.json` and `package-lock.json`).
- **Prisma CLI (Executed via npx)**: `7.9.1` (Dynamically fetched as `@latest` because it wasn't installed locally).
- **@prisma/client (Installed)**: `None` (Generation failed, so the client was never generated or installed).
- **pg Adapter**: `None` (Prior to the unauthorized audit side-effect).

## 2. Exact Schema/Config Mismatch
- `governance/prisma/schema.prisma` uses the Prisma 6 (and earlier) convention:
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("GOVERNANCE_DATABASE_URL")
    schemas  = ["governance"]
  }
  ```
- **Mismatch**: Prisma 7 removes support for the `url` property inside the `datasource` block in `schema.prisma`. It now strictly requires the connection configuration to be moved to a `prisma.config.ts` file or passed directly into the `PrismaClient` constructor.
- The repository does **not** contain a `prisma.config.ts` file, and `directUrl`/`shadowDatabaseUrl` are absent.

## 3. Intended Toolchain Assessment
**Assessment**: The repository inadvertently resolved to Prisma 7 while Governance artifacts were authored for Prisma 6.
**Evidence**: The `schema.prisma` file is perfectly valid for Prisma 5/Prisma 6. Because the repository lacked an explicit `prisma` dependency in `package.json`, running `npx prisma generate` caused npm to dynamically fetch the latest major version (Prisma 7.9.1). This indicates that the original engineers authored the schema against a previous version (likely v5 or v6) but failed to pin the dependency in the RC2 baseline.

## 4. Exact Failure Chain
1. **Package Version**: No explicit `prisma` or `@prisma/client` dependency exists in `package.json`.
2. **Prisma CLI Behavior**: Running `npx prisma generate` dynamically fetched Prisma 7.9.1 (`@latest`).
3. **Schema Parsing**: Prisma 7 parsed `governance/prisma/schema.prisma` and rejected the `url = env(...)` property, throwing `Error code: P1012`.
4. **Prisma Generation**: Generation aborted.
5. **Missing Client Types**: Because generation aborted, `@prisma/client` was not created/installed.
6. **Compilation Failure**: `tsc` failed in `governance/lib/ingestion/db.ts` with `Cannot find module '@prisma/client'`.
7. **Supabase db reset Interaction**: Because the Governance Prisma schema relies on `prisma db push` (or equivalent) to deploy its tables, the tables (`EventReceipt`, `CertificationResult`, etc.) and the `governance` schema itself were never created in the local database.

**Conclusion**: The Governance migration failure is a **tooling/configuration mismatch** stemming from an unpinned dependency resolving to a major version with breaking changes.

## 5. `npm install pg` Side Effects
**Classification**: UNAUTHORIZED AUDIT-SIDE EFFECT
The command `npm install pg` executed during the onboarding audit modified tracked source files.
- `package.json`: Modified (added `"pg": "^8.23.0"`).
- `package-lock.json`: Modified (added `pg` and its transitive dependencies).

## 6. Scratch Audit Artifacts
- `scratch_gov_audit.js`: Present in the root directory. This is an audit-only temporary artifact created to verify Governance schema states via SQL.

## 7. Recommended Correction Options
A. **Pin Prisma to the intended existing major version (Prisma 6)**: Add `"prisma": "^6.x.x"` and `"@prisma/client": "^6.x.x"` to `package.json`. This is the least invasive option and restores the intended execution environment.
B. **Migrate Governance Prisma configuration to Prisma 7**: Remove the `url` field from `schema.prisma` and introduce a `prisma.config.ts` file configuring the adapter or `accelerateUrl`. This modernizes the toolchain but requires codebase modification.
C. **Decouple from Prisma generation in standard workflows**: Dump the Prisma schema to standard SQL migrations inside `supabase/migrations/` so that `supabase db reset` reliably builds the Governance tables regardless of the Prisma client state.

## 8. Security / Reproducibility Implications
- **Reproducibility**: The lack of pinned toolchain versions completely breaks reproducibility. Any new engineer pulling the repository will dynamically fetch Prisma 7 and fail to build the Governance components, just as the onboarding gate failed.
- **Security**: Unpinned global or dynamic `npx` executions introduce supply chain risks if a malicious package typosquatting or a compromised major release is deployed.

## 9. WP-GOV-01A Runtime Certification
The WP-GOV-01A runtime certification **MUST REMAIN BLOCKED**. The underlying Governance schema cannot be reliably deployed to the database, preventing any meaningful runtime assessment of the WP-GOV-01 features.

---

### PRISMA GOVERNANCE TOOLCHAIN FORENSICS COMPLETE — CORRECTION REQUIRED
