# Opus Publica RC2 — GitHub Repository Readiness Audit

## A. Executive decision

`GITHUB PUSH BLOCKED — SENSITIVE MATERIAL DETECTED`

## B. Repository statistics

* **Total files**: 34,289
* **Total directories**: 3,386
* **Total size**: 1149.46 MB
* **Tracked files**: 198
* **Untracked files**: 230
* **Ignored files**: 35,422
* **Modified files**: Multiple staged and unstaged modifications detected (30+ files modified, 2 renamed, 18 deleted).

**Top-level directory sizes**:
- `.next`: 438.76 MB
- `node_modules`: 600.64 MB
- `implementation`: 32.17 MB
- `public`: 18.48 MB
- `backend`: 8.44 MB
- `data`: 1.96 MB
- `app`: 0.69 MB
- `lib`: 0.40 MB
- `supabase`: 0.15 MB
- `components`: 0.10 MB
- `governance`: 0.06 MB

## C. Complete top-level inventory

The repository currently contains:
- **Source Code**: `app/`, `backend/`, `components/`, `lib/`, `governance/`
- **Generated / Caches**: `.next/`, `node_modules/`, `coverage`
- **Database / Infrastructure**: `supabase/`
- **Documentation / Evidence**: `implementation/`
- **Static Assets**: `public/`
- **Scratch / Temp**: `scratch/`, `opuspublica-governance-model.tar`, `temp.env`, `result.txt`, etc.

## D. Sensitive material findings

* `temp.env` (Untracked) - Appears to contain test harness environment variables, including potential `SUPABASE_SERVICE_ROLE_KEY`. **CRITICAL — MUST NOT ENTER GITHUB**
* `.env.local` (Untracked) - Appears to contain local development environment variables and Supabase keys. **SENSITIVE — REVIEW REQUIRED**

## E. Git-history exposure findings

* **Historical sensitive material found**. A search of the Git history revealed historical tracking of `.env.example` and other configuration files (e.g., commit `ad5ab28 Mission 9: ORCID identity linking .env.example`). Further forensic review is required to ensure no actual secrets were historically committed before being ignored.

## F. Engineering PDF inventory

`implementation/OP Engineering Constitution, Governance & Implementation/` contains:
* `Opus_Publica_RC1_Certification_Checklist_v1.0.pdf` (4.2 MB)
* `Opus_Publica_RC1_Constitutional_Traceability_Matrix_v1.0.pdf` (3.6 MB)
* `Opus_Publica_RC1_Engineering_Constitution_v1.0.pdf` (4.5 MB)
* `Opus_Publica_RC1_Engineering_Constitution_Vol_II_v1.0.pdf` (4.0 MB)
* `Opus_Publica_RC1_Engineering_Directive_v1.0.pdf` (0.6 MB)
* `Opus_Publica_RC1_Engineering_Playbook_v1.0.pdf` (2.6 MB)
* `Opus_Publica_RC2_constitution_yaml_Schema_Reference_v1.0.pdf` (1.0 MB)
* `Opus_Publica_RC2_Evolution_Roadmap_v1.0.pdf` (0.5 MB)
* `Opus_Publica_RC2_Governance_API_Specification_v1.0.pdf` (1.1 MB)
* `Opus_Publica_RC2_Platform_Operator_Manual_v1.0.pdf` (0.7 MB)
* `Opus_Publica_RC2_Policy_as_Code_Dev_Guide_v1.0.pdf` (0.4 MB)
* `Opus_Publica_RC2_Technical_Architecture_Specification_v1.0.pdf` (0.8 MB)

**Recommendation**: These appear to be proprietary architectural and governance directives. They should be reviewed before sharing with an external engineering team, as they may contain internal operational information.

## G. Generated/local artifacts

The following generated/local artifacts exist and should NOT be source-controlled:
- `.next/` (Build output and caches)
- `node_modules/` (Dependencies)
- `backend/daemon.exe` (Compiled binary)
- `opuspublica-governance-model.tar` (Large archive artifact)
- `scratch/` (Temporary scripts and outputs)
- Various `.js` and `.cjs` temporary fix scripts (`fix_actions.js`, `migrate_rest.cjs`, etc.)
- Output logs (`output.html`, `test_res.txt`)

## H. Supabase security assessment

`supabase/` contains:
- **Migrations**: `supabase/migrations/` (Authoritative source)
- **Local State**: `supabase/.temp/` (Local runtime artifacts, including `start-secrets/` which contains `docker.env`. Should be excluded).
- **Bootstrap/Fix files**: `FIX_first_admin.sql`, `MIGRATE_ALL.sql`, `schema.sql` (Obsolete/bootstrap-only or forensic evidence. Review before sharing).

## I. Governance assessment

`governance/` contains:
- `lib/ingestion/` (Evidence logic and resolvers)
- `prisma/schema.prisma` and migrations (Schema)
- `workers/ingestion-adapter.ts` (Ingestion worker)

**Recommendation**: The Governance plane establishes the cryptographic verification model. Depending on the exact separation of duties with the external team, this may need to be included for full-stack integration, or excluded if they are only responsible for the Publication plane.

## J. Include / Exclude / Review matrix

| Top-level path | Include | Exclude | Review | Reason |
| -------------- | ------: | ------: | -----: | ------ |
| `app/` | Yes | No | No | Core application source. |
| `backend/` | Yes | No | Yes | Core backend source, but exclude binaries (`daemon.exe`). |
| `components/` | Yes | No | No | Core UI components. |
| `lib/` | Yes | No | No | Core libraries. |
| `governance/` | Yes | No | Yes | Required for full-stack context, but review proprietary models. |
| `supabase/migrations/` | Yes | No | No | Authoritative database migrations. |
| `supabase/.temp/` | No | Yes | No | Local runtime secrets and artifacts. |
| `supabase/FIX_*.sql` | No | No | Yes | Forensic/bootstrap scripts. |
| `implementation/` | No | No | Yes | Contains internal proprietary architectural/governance directives and PDFs. |
| `public/` | Yes | No | No | Static assets. |
| `.next/` | No | Yes | No | Machine-generated build artifact. |
| `node_modules/` | No | Yes | No | Package manager dependencies. |
| `.env*`, `temp.env` | No | Yes | No | Local environments and secrets. |
| `*.tar`, `*.exe` | No | Yes | No | Large binary artifacts. |
| Root temporary scripts (`fix_*.js`, `test_*.mjs`) | No | No | Yes | Scratch scripts not part of core app. |

## K. Pre-push blockers

The following MUST be resolved before the first push:
- [ ] Remove/gitignore `temp.env` and `.env.local` to prevent secret leakage.
- [ ] Clean up untracked large binaries (e.g., `opuspublica-governance-model.tar`, `backend/daemon.exe`).
- [ ] Clean up untracked temporary scripts and root-level logs (`test_*.mjs`, `fix_*.js`, `output.html`).
- [ ] Verify `supabase/.temp/` is correctly excluded by `.gitignore` (it is not currently listed in the standard `.gitignore`).
- [ ] Perform a deeper Git history scrub to ensure no `.env` files with actual values were ever committed.
- [ ] Decide on the inclusion of the `implementation/` proprietary PDFs.

## L. Recommended repository boundary

```text
GITHUB CANDIDATE
├── INCLUDE
│   ├── app/
│   ├── backend/ (source only)
│   ├── components/
│   ├── governance/
│   ├── lib/
│   ├── public/
│   ├── supabase/migrations/
│   ├── package.json, tsconfig.json, next.config.ts, etc.
│   └── README.md
├── EXCLUDE
│   ├── .next/
│   ├── node_modules/
│   ├── .env*, temp.env
│   ├── supabase/.temp/
│   ├── *.tar, *.exe, *.zip
│   ├── scratch/
│   └── temporary root scripts (.mjs, .cjs, .txt, .html)
└── REVIEW BEFORE PUSH
    ├── implementation/ (PDFs and forensic reports)
    └── supabase/FIX_*.sql, MIGRATE_ALL.sql
```

## M. Whether the repository should be PRIVATE

**PRIVATE GITHUB REPOSITORY**: Yes. The repository contains extensive proprietary architectural directives, governance models, forensic reports, and potentially sensitive development configurations.

**PUBLIC GITHUB REPOSITORY**: Absolutely NOT suitable. 

## N. GitHub preparation sequence

1. Update `.gitignore` to comprehensively cover `.temp`, `.env*`, `temp.env`, `*.tar`, `*.exe`, and `scratch/`.
2. Move or delete temporary root-level diagnostic scripts.
3. Perform a Git history scrub (e.g., using BFG Repo-Cleaner) to ensure no historical credentials or `.env` files are tracked.
4. Review and potentially move `implementation/` out of the repository if it is deemed strictly internal-only.
5. Stage the clean boundary and commit.
6. Push to a freshly created **private** GitHub repository.
