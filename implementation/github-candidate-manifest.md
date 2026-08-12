# Opus Publica RC2 GitHub Candidate Manifest

## INCLUDE

The following top-level directories and explicit files constitute the verified candidate boundary for the Private GitHub RC2 repository:

- `app/` (Application Source)
- `backend/` (Backend Source - excluding binaries)
- `components/` (UI Components)
- `governance/` (Verification Logic and Models)
- `lib/` (Core Libraries)
- `public/` (Static Assets)
- `supabase/migrations/` (Authoritative Migrations)
- `implementation/OP Engineering Constitution, Governance & Implementation/` (Original PDF architectural evidence)
- `supabase/MIGRATE_ALL.sql`, `supabase/MIGRATE_ALL2.sql`, `supabase/schema.sql` (Curated historical evidence)
- Configuration templates and toolchains:
  - `package.json`
  - `package-lock.json`
  - `tsconfig.json`
  - `next.config.ts`
  - `postcss.config.mjs`
  - `tailwind.config.js`
  - `eslint.config.mjs`
  - `.gitignore`
  - `AGENTS.md`, `AUDIT.md`, `CLAUDE.md`, `DEPLOY.md`, `README.md`
  - `REPOSITORY_ENGINEERING_BOUNDARY.md`

## EXCLUDE

The following paths and patterns have been explicitly excluded from Git tracking via `.gitignore` and removed from the Git index:

- `.next/` (Build output)
- `node_modules/` (Dependencies)
- `coverage/` (Test coverage)
- `supabase/.temp/` (Local Supabase runtime state and project bindings)
- `.env.local`, `temp.env` (Local environments and active credentials)
- `scratch/` (Temporary scripts)
- `*.tar`, `*.exe`, `*.zip` (Large binaries and archives, specifically `opuspublica-governance-model.tar`, `backend/daemon.exe`)
- `output.html`, `output2.html`, `result.txt`, `result_phase1.txt`, `test_res.txt`, `build-output.txt`, `build-output2.txt` (Generated test output and logs)
- `fix_*.js`, `fix_*.cjs`, `migrate_*.cjs`, `test_*.mjs`, `test_*.js`, `scratch_search.py` (Temporary root scripts)
- `*.md.pdf` (Generated Markdown-to-PDFs like `corrections-retractions-policy.md.pdf`)

## REVIEW

The following items remain in the worktree but are not explicitly excluded or formally included. They require manual review before finalizing the commit:

- `implementation/` (Files other than the `OP Engineering Constitution` PDFs, such as the markdown forensic reports generated during this audit process. Most should be included as historical provenance, but they are flagged for explicit human review.)
- `supabase/FIX_*.sql` (Temporary schema fixes applied during forensics. Likely to be excluded unless retained for provenance.)
