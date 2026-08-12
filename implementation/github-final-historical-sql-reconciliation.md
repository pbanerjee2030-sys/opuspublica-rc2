# Opus Publica RC2 — Final Historical SQL Reconciliation

This report documents the explicit filesystem state, Git tracking status, and final staging decision for the historical SQL artifacts identified during the RC2 repository boundary audit.

## 1. Root-Level Temporary Artifact
- **Path**: `D:\OpusPublica\opuspublica\schema.sql`
- **Size**: 0 bytes
- **Git Tracking Status**: Untracked
- **Final Decision**: **EXCLUDE**. This is a generated/temporary artifact. It has been left on disk but explicitly ignored in `.gitignore` via the `/schema.sql` directive to ensure it never enters the RC2 repository.

## 2. Historical Schema Baseline
- **Path**: `D:\OpusPublica\opuspublica\supabase\schema.sql`
- **Size**: 7,482 bytes
- **Git Tracking Status**: Tracked (Unmodified)
- **Final Decision**: **INCLUDE**. This file is approved as historical, forensic, and non-authoritative lineage evidence. Because it is tracked and unmodified, it is intrinsically part of the repository boundary.

## 3. Historical Migration Consolidations
- **Path**: `D:\OpusPublica\opuspublica\supabase\MIGRATE_ALL.sql`
- **Size**: 9,307 bytes
- **Git Tracking Status**: Tracked (Unmodified)
- **Final Decision**: **INCLUDE**. This file is approved as historical, forensic, and non-authoritative lineage evidence. It remains safely within the repository boundary.

- **Path**: `D:\OpusPublica\opuspublica\supabase\MIGRATE_ALL2.sql`
- **Size**: 10,325 bytes
- **Git Tracking Status**: Staged (Added)
- **Final Decision**: **INCLUDE**. This file is approved as historical, forensic, and non-authoritative lineage evidence.

## Constraints Verified
- The root-level 0-byte `schema.sql` is untracked and excluded.
- The legitimate `supabase/schema.sql` was not moved or renamed.
- None of the historical SQL files were modified.
- No commit was created.
- No push was executed.
- No new remote was added.

---

### `RC2 HISTORICAL SQL BOUNDARY CONFIRMED`
