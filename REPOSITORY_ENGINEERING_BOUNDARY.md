# Opus Publica RC2 Engineering Boundary

This document defines the exact operational boundary and separation of duties for the Opus Publica RC2 repository. This boundary distinguishes between authoritative source, historical forensics, and local-only configuration.

## Canonical source
The following directories and domains constitute the authoritative logic and execution path of the application:
- `app/`: Next.js web application and API surface.
- `backend/`: Go backend services and logic.
- `components/`: UI layer.
- `lib/`: Core application libraries.
- `public/`: Static assets.

## Migration authority
The database evolution is strictly linear and declarative:
- `supabase/migrations/` = authoritative migration chain. This directory is the sole source of truth for the database schema.

**Historical / Forensic / Non-Authoritative SQL:**
- `supabase/MIGRATE_ALL.sql`
- `supabase/MIGRATE_ALL2.sql`
- `supabase/schema.sql`

These root SQL files are **historical forensic evidence only**. They must not be executed or treated as the authoritative database definition. They exist purely for lineage traceability and historical context.

## Governance evidence
The cryptographic verifiability and governance implementation remains fully present to allow the engineering team to operate the full RC2 stack.
- `governance/`: Contains the verification logic, schema, and workers necessary for ingestion and proofing.

Original engineering PDFs and architectural evidence are located at:
- `implementation/OP Engineering Constitution, Governance & Implementation/`
These documents define the constitutional rules and system architecture underpinning RC2.

## Local-only files
Certain files are inherently bound to the local developer machine or local runtime environment and must **never** enter Git. These are actively excluded via `.gitignore`:
- `.env.local`, `temp.env`: Sensitive local credentials and environment bindings.
- `supabase/.temp/`: Supabase CLI internal local state.
- `.next/`, `node_modules/`: Machine-generated build outputs and dependencies.
- `scratch/`, `*.exe`, `*.tar`: Ephemeral logs, artifacts, binaries, and temporary scripts.
