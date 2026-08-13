# RC2 Baseline Correction Implementation Report

## Part I — Crypto Recovery
- **Canonical Content Search:** I conducted a comprehensive search of all local and remote branches (`git log --all`), as well as the Git reflog, for `crypto.ts` and the `canonicalJson` function signature. 
- **Determination:** `C. file must be reconstructed.` The `governance/lib/synthesis/crypto.ts` file was never committed to the repository in any branch. It existed only as an uncommitted local artifact during the WP-GOV-01C-EXT evaluation phase and was lost during the squash/merge.
- **Action Taken:** Because the directive explicitly states "DO NOT reconstruct it from memory or from graph.ts. If an exact canonical source exists: restore that exact content", and no canonical source exists, **this recovery is BLOCKED**.

## Part II — Test Toolchain
- **Minimum Required Toolchain:** Based on the presence of `jest.fn()` in `governance/workers/__tests__/ingestion-adapter.test.ts`, the repository structurally relies on Jest.
- **Required Packages:** To run these tests reproducibly via `npm ci`, the baseline `package.json` would require:
  - `jest`
  - `ts-jest`
  - `@types/jest`
- **Required Configuration:** A `jest.config.js` or `jest.config.ts` file is required to configure the TypeScript environment (`preset: 'ts-jest'`) and map the `@/` path alias to `<rootDir>/`.
- **Action Taken:** Blocked due to Part I failure.

## Part III — OPCE generate-pdf
- **Module Status:** The file `lib/generate-pdf.ts` is **not missing**. It is present in the repository, introduced originally in commit `404d1065` and updated in `e8d87d8`.
- **Determination:** The module is an existing source artifact. The "missing module" error in the test output is entirely an alias resolution failure (`@/lib/generate-pdf`) caused by the absence of the test toolchain configuration (Part II).
- **Action Taken:** No separate restoration is required. The test will function correctly once the path alias is resolved by a proper test toolchain configuration.

## Part IV — Next Version Reconciliation
- **Reconciliation:**
  - `package.json` pre-Dependabot: `16.2.9`
  - `package.json` in PR #2 commit (`dd50588`): `16.3.0`
  - `package-lock.json` before PR #2: `16.2.9`
  - `package-lock.json` after PR #2: `16.3.0`
  - Installed `node_modules/next`: `16.3.0`
- **Classification:** `A. package.json explicitly changed to 16.3.0`. Although the Dependabot PR description advertised `16.2.11`, the automated diff explicitly bumped the package.json version to `16.3.0`.
- **RC2 Policy:** Because RC2 is under strict certification, the intended policy must be an **exact pinned version** to guarantee deterministic builds. Floating resolution should not be used silently.

## Part V & VI — Correction Boundary and Test Gate
- **Status:** **SKIPPED / BLOCKED**
- Without the ability to legitimately restore `governance/lib/synthesis/crypto.ts`, the application and test suites cannot compile. The test gate (which strictly requires `npm run build` and `npx tsc`) is structurally blocked from passing.

## Conclusion
The baseline correction cannot be implemented under the current strict directives because an exact canonical source for the cryptographic hash chaining module (`crypto.ts`) does not exist in the repository's history, and manual reconstruction is prohibited.

`ENGINEERING_EVIDENCE_INDEX.md` was not updated because runtime verification could not be completed.
