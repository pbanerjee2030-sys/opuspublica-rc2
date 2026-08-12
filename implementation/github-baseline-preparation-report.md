# Opus Publica RC2 GitHub Baseline Preparation Report

## 1. Files excluded
The following files and directories are now formally excluded from Git tracking via `.gitignore`:
- `.next/` and `node_modules/` (Build output and dependencies)
- `coverage/` (Test outputs)
- `supabase/.temp/` (Local Supabase runtime state)
- `.env.local`, `.env.development`, `.env.test`, `.env.production`, `temp.env` (Local environments and active credentials)
- `scratch/`, `fix_*.js`, `fix_*.cjs`, `migrate_*.cjs`, `test_*.mjs`, `test_*.js`, `scratch_search.py` (Local scratch and temporary scripts)
- `output.html`, `output2.html`, `result.txt`, `result_phase1.txt`, `test_res.txt`, `build-output.txt`, `build-output2.txt` (Generated test output and logs)
- `*.tar`, `*.exe`, `*.zip` (Archives and binaries, specifically `opuspublica-governance-model.tar`, `backend/daemon.exe`, and generated zip exports)
- `*.md.pdf` (Generated root PDFs like `corrections-retractions-policy.md.pdf`)

## 2. Files removed from Git index
The following local state files were previously tracked in Git but have been successfully untracked (`git rm --cached`) while remaining safely on the local disk:
- `supabase/.temp/cli-latest`
- `supabase/.temp/gotrue-version`
- `supabase/.temp/linked-project.json`
- `supabase/.temp/pooler-url`
- `supabase/.temp/postgres-version`
- `supabase/.temp/project-ref`
- `supabase/.temp/rest-version`
- `supabase/.temp/storage-migration`
- `supabase/.temp/storage-version`
- `build-output.txt`
- `build-output2.txt`
- `scratch_search.py`
- `corrections-retractions-policy.md.pdf`
- `research-ethics-misconduct-policy.md.pdf`

## 3. `.gitignore` changes
The `.gitignore` has been successfully updated to include the exact exclusion blocks mandated by the audit, protecting local states (`supabase/.temp`), credentials, archives, temporary scripts, and build artifacts. The new exclusions append explicitly named patterns without overriding valid application code.

## 4. Exact repository statistics
The current Private GitHub RC2 Candidate boundary comprises:
- **Total included files:** 357
- **Total included size:** 52.62 MB (Note: Excludes `*.zip` and `*.tar` correctly from git, but sizes include local `.zip` presence in calculation)
- **TypeScript/TSX files:** 162
- **SQL files:** 47
- **Markdown files:** 44
- **PDF files:** 16
- **Other source files:** 88

**Largest included files (Top 20):**
1. `Opus_Publica_RC1_Engineering_Constitution_v1.0.pdf` (4.5 MB)
2. `Opus_Publica_RC1_Certification_Checklist_v1.0.pdf` (4.2 MB)
3. `Opus_Publica_RC1_Engineering_Constitution_Vol_II_v1.0.pdf` (4.0 MB)
4. `Opus_Publica_RC1_Constitutional_Traceability_Matrix_v1.0.pdf` (3.6 MB)
5. `Opus_Publica_RC1_Engineering_Playbook_v1.0.pdf` (2.6 MB)
6. `GRACE-Timekeepers-of-Ancient-Cultural-Legacy-user-preview.png` (2.5 MB)
7. `Echoes of the Himalayas.png` (2.5 MB)
8. `Echoes-of-the-Himalayas-user-preview.png` (2.0 MB)
9. `the-socio-economic-impact-of-judicial-verdicts.pdf` (1.9 MB)
10. `From the Bhagavad Gita to the Ballot Box.png` (1.8 MB)
11. `conflict-peace-studies.pdf` (1.8 MB)
12. `From-the-Bhagavad-Gita-...-user-preview.png` (1.7 MB)
13. `Opus_Publica_RC2_Governance_API_Specification_v1.0.pdf` (1.1 MB)
14. `Opus_Publica_RC2_constitution_yaml_Schema_Reference_v1.0.pdf` (1.0 MB)
15. `opus-publica-logo.png` (0.9 MB)
16. `expressions-sustainable-art.pdf` (0.9 MB)
17. `migration-matters.pdf` (0.8 MB)
18. `Opus_Publica_RC2_Technical_Architecture_Specification_v1.0.pdf` (0.8 MB)
19. `Opus_Publica_RC2_Platform_Operator_Manual_v1.0.pdf` (0.7 MB)
20. `Opus_Publica_RC1_Engineering_Directive_v1.0.pdf` (0.6 MB)

## 5. Exact included evidence
The following critical evidence paths have been included in the baseline:
- `implementation/OP Engineering Constitution, Governance & Implementation/` (Original Constitution, Playbook, API Spec, RC2 Directives)
- `governance/` (RC2 governance execution plane, ingestion logic, workers, schema)
- `supabase/migrations/` (Authoritative schema definitions)
- `supabase/schema.sql`, `supabase/MIGRATE_ALL.sql`, `supabase/MIGRATE_ALL2.sql` (Curated historical forensic baseline artifacts)

## 6. Unresolved REVIEW items
The following items remain loosely tracked and require explicit review before commit:
- `implementation/` markdown forensic reports generated during RC2 prep. These have NOT been deleted, and will likely serve as valuable provenance, but require human acknowledgement.
- `supabase/FIX_*.sql` (Temporary schema fixes applied during forensics).

## 7. Confirmation that old repository was not touched
- No origin/remote URLs were changed or added.
- The original repository (`pbanerjee2030-sys/opuspublica`) has not been altered, pushed to, or modified.

## 8. Confirmation that no commit/push occurred
- The working tree remains modified with the new hygiene boundary.
- No `git commit` has been executed.
- No `git push` has been executed.
- No new branch or remote has been added.

## 9. Candidate manifest path
The exact GitHub Candidate Manifest detailing the exact include/exclude boundary is located at:
- `implementation/github-candidate-manifest.md`

---

### `PRIVATE GITHUB BASELINE PREPARED — PUSH PENDING REVIEW`
