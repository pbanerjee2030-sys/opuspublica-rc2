# Opus Publica RC2 — Pre-GitHub Credential History and Allowlist Audit

## Part I — Historical Credential Audit

### 1. Historical credential findings
A comprehensive search of the Git history using metadata, content-aware, and pattern-based searches for credential markers (`SUPABASE_SERVICE_ROLE_KEY`, `.env`, `DATABASE_URL`, etc.) yielded exactly one relevant commit:

* **Commit**: `ad5ab28 Mission 9: ORCID identity linking`
* **Path**: `.env.example`
* **Variable Name**: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CROSSREF_PASSWORD`, `ORCID_CLIENT_SECRET`
* **Credential Category**: **A — Safe placeholder/configuration** (All values were clearly labeled placeholders such as `your-service-role-key-here`).
* **Status**: Safe / Placeholder.

### 2. Active production secrets in history
**No active production secrets or development-only secrets ever entered Git history.** 
A complete search of all commits for tracked `.env`, `.env.local`, or `temp.env` files confirmed that only the safe `.env.example` placeholder file was ever tracked by Git. 

### 9. History remediation requirement
**Scenario 1 applies:** No actual credentials ever committed.
→ **No history rewrite required.**

---

## Part II — Exact Private Repository Allowlist

### 4. Exact paths suitable for inclusion (GITHUB_INCLUDE_ALLOWLIST)
* **INCLUDE**:
  * `app/` (Next.js Application Source)
  * `backend/` (Go Backend Source, excluding binaries)
  * `components/` (UI Components)
  * `lib/` (Core Application Libraries)
  * `public/` (Static Assets and Images)
  * `supabase/migrations/` (Authoritative database migrations)
  * `governance/` (RC2 Full-stack verification models)
  * `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.js`, `eslint.config.mjs`
  * `AGENTS.md`, `AUDIT.md`, `CLAUDE.md`, `DEPLOY.md`, `README.md`
  * `.env.example`

### 3. Exact paths requiring exclusion
* **EXCLUDE**:
  * `.next/` (Build caches)
  * `node_modules/` (Dependencies)
  * `.env.local`, `temp.env` (Local environments and active credentials)
  * `supabase/.temp/` (Local Supabase runtime state and project configurations)
  * `backend/daemon.exe` (Machine-specific compiled binary)
  * `opuspublica-governance-model.tar` (Large temporary archive)
  * `scratch/` (Temporary scripts/outputs)
  * Root-level `.js`, `.cjs`, `.mjs`, `.html`, `.txt` outputs (e.g., `fix_actions.js`, `test_pdf.mjs`, `output.html`, `build-output.txt`)
  * Generated PDFs in root (e.g., `corrections-retractions-policy.md.pdf`)
  * `scripts/` (If determined obsolete, though currently deleted in worktree)

### 5. Curated implementation evidence recommendation
`implementation/OP Engineering Constitution, Governance & Implementation/`
* `Opus_Publica_RC1_Certification_Checklist_v1.0.pdf` → **INCLUDE**
* `Opus_Publica_RC1_Constitutional_Traceability_Matrix_v1.0.pdf` → **INCLUDE**
* `Opus_Publica_RC1_Engineering_Constitution_v1.0.pdf` → **INCLUDE**
* `Opus_Publica_RC1_Engineering_Constitution_Vol_II_v1.0.pdf` → **INCLUDE**
* `Opus_Publica_RC1_Engineering_Directive_v1.0.pdf` → **INCLUDE**
* `Opus_Publica_RC1_Engineering_Playbook_v1.0.pdf` → **INCLUDE**
* `Opus_Publica_RC2_constitution_yaml_Schema_Reference_v1.0.pdf` → **INCLUDE**
* `Opus_Publica_RC2_Evolution_Roadmap_v1.0.pdf` → **INCLUDE**
* `Opus_Publica_RC2_Governance_API_Specification_v1.0.pdf` → **INCLUDE**
* `Opus_Publica_RC2_Platform_Operator_Manual_v1.0.pdf` → **INCLUDE**
* `Opus_Publica_RC2_Policy_as_Code_Dev_Guide_v1.0.pdf` → **INCLUDE**
* `Opus_Publica_RC2_Technical_Architecture_Specification_v1.0.pdf` → **INCLUDE**

**Reasoning**: As this repository is explicitly remaining **PRIVATE**, these foundational architectural documents contain necessary context for the engineering team and do not expose user PII or live cloud credentials.

For the wider `implementation/` directory:
* Active forensic reports and remediation evidence → **HISTORICAL EVIDENCE** (Retain for provenance).
* Superseded architecture docs → **SUPERSEDED** (Retain, clearly marked).

### 6. Historical SQL recommendation
* `MIGRATE_ALL.sql` → **INCLUDE** (Historical Evidence, no secrets found).
* `MIGRATE_ALL2.sql` → **INCLUDE** (Historical Evidence, no secrets found).
* `schema.sql` → **INCLUDE** (Historical Evidence, no secrets found).
* `FIX_*.sql` → **REVIEW** (Likely superseded temporary repairs, no secrets found).
* `supabase/.temp/*` → **EXCLUDE** (Local runtime state, currently tracked incorrectly).

### 7. Final GitHub include/exclude/review matrix

| Top-level path | Status | Reason |
| -------------- | ------ | ------ |
| `app/`, `components/`, `lib/`, `backend/` | INCLUDE | Core source logic. |
| `governance/` | INCLUDE | Core verification logic needed for full-stack RC2. |
| `supabase/migrations/` | INCLUDE | Database authority. |
| `implementation/OP Engineering.../` | INCLUDE | Crucial private engineering context. |
| `implementation/` (other) | REVIEW | Some forensic reports are active evidence; others superseded. |
| `supabase/MIGRATE_ALL*.sql`, `schema.sql` | INCLUDE (Curated) | Important forensic lineage artifacts. |
| `supabase/FIX_*.sql` | REVIEW | Potential obsolete patches. |
| `.next/`, `node_modules/` | EXCLUDE | Machine-generated. |
| `.env.local`, `temp.env` | EXCLUDE | Sensitive active credentials. |
| `supabase/.temp/` | EXCLUDE | Local runtime configuration. |
| `scratch/`, `*.tar`, `*.exe`, root scripts | EXCLUDE | Ephemeral artifacts. |

---

## Part III — Generated / Local Exclusions

### 8. Proposed `.gitignore` additions (DO NOT APPLY)
```text
# Local environments
.env.local
.env.development
.env.test
.env.production
temp.env

# Supabase local runtime state
supabase/.temp/

# Large binaries and archives
*.tar
*.exe
*.zip

# Scratch and temporary scripts
scratch/
fix_*.js
fix_*.cjs
migrate_*.cjs
test_*.mjs
test_*.js
scratch_search.py

# Generated outputs
output.html
output2.html
result.txt
result_phase1.txt
test_res.txt
build-output.txt
build-output2.txt
*.md.pdf
```

---

## Part IV — Tracked File Risk

### 11. Currently Tracked Sensitive Files
The following files are **currently tracked in Git** but should be untracked before a private GitHub push:
* `supabase/.temp/cli-latest` (Local runtime state)
* `supabase/.temp/gotrue-version` (Local runtime state)
* `supabase/.temp/linked-project.json` (Local runtime state)
* `supabase/.temp/pooler-url` (Local runtime state)
* `supabase/.temp/postgres-version` (Local runtime state)
* `supabase/.temp/project-ref` (Local runtime state)
* `supabase/.temp/rest-version` (Local runtime state)
* `supabase/.temp/storage-migration` (Local runtime state)
* `supabase/.temp/storage-version` (Local runtime state)
* `build-output.txt` / `build-output2.txt` (Generated log outputs)
* `scratch_search.py` (Temporary script)
* `corrections-retractions-policy.md.pdf`, `research-ethics-misconduct-policy.md.pdf` (Generated root PDFs)

---

## Part V — Worktree Preservation

### 12. Current Git State
* **HEAD**: `984c66e WP-02-01: Review Outbox Refactor`
* **Status**: 
  * Ahead of origin/main by 4 commits.
  * **Staged Renames**: WP-01 and WP-16 migration filename normalizations.
  * **Modified**: Multiple TSX and API routes (e.g., `app/actions/submitArticle.ts`, `app/actions/submitReview.ts`), `AGENTS.md`, `DEPLOY.md`, `package.json`, `package-lock.json`, etc.
  * **Deleted**: `scripts/*` and old favicon/logos.
  * **Untracked**: `governance/`, `implementation/`, `backend/`, and numerous scratch scripts and `.env` files.

These modifications reflect legitimate ongoing RC2 implementation work and should be preserved in the worktree.

---

## Part VI — GitHub Boundary

### 13. Recommended Repository Model
```text
PRIVATE GITHUB REPOSITORY
├── source (app/, backend/, components/, lib/, public/)
├── tests (test harness scripts, if formalized)
├── migrations (supabase/migrations/)
├── governance (governance/)
├── selected engineering evidence (implementation/OP Engineering Constitution.../)
├── selected historical migration evidence (MIGRATE_ALL.sql, schema.sql)
└── configuration templates (.env.example)

EXCLUDED
├── credentials (.env.local, temp.env)
├── local state (supabase/.temp/)
├── generated artifacts (.next/, node_modules/, root PDFs, logs)
├── binaries (*.tar, *.exe)
├── temporary files (scratch/, root .js/.mjs scripts)
└── machine-specific data
```

---

## Part VII — Required Report Conclusions

* **10. Safe for Private GitHub**: Yes. The repository is fundamentally safe to prepare for a Private GitHub environment. There are no history rewrites necessary. The only remaining tasks are strictly worktree operational cleanups (untracking `.temp` files, updating `.gitignore`, moving scratch files).
* **11. Remaining blockers**: 
  - Remove tracked `supabase/.temp/` and other generated artifacts from the Git index without deleting them from disk (`git rm --cached`).
  - Formally update `.gitignore` to protect these files from accidental future commits.

### `PRIVATE GITHUB BOUNDARY READY FOR PREPARATION`
