# RC2 Final Go-Live Operations Readiness

This document finalizes the operational preparation phase for the Opus Publica RC2 production deployment. It consolidates the executable process definitions, operational procedures, and external prerequisites required for authorization.

## 1. Worker Deployment Configuration
The `governance/worker-entrypoint.ts` has been integrated into the production environment via a PM2 process supervisor configuration.
- **File**: `ecosystem.config.js`
- **Execution Mode**: `fork` mode (single instance) to prevent queue duplication.
- **Lifecycle**: Configured with exponential backoff for restarts, max memory limits (`500M`), and graceful shutdown timeouts (`10000ms`).
- **Startup Command**: `pm2 start ecosystem.config.js --only opuspublica-worker`

## 2. Go-Live Runbook
The formal operational deployment procedure has been documented.
- **File**: `implementation/RC2_PRODUCTION_GO_LIVE_RUNBOOK.md`
- **Contents**: Step-by-step procedures covering pre-deployment backups, environment verification, incremental migrations, deployment, smoke tests, and rollback strategies.
- **Constraint**: `supabase db reset` is explicitly prohibited in the production environment.

## 3. Backup and Restore
- **Backup Schedule**: Daily logical backups (`pg_dump`) + continuous Point-in-Time Recovery (PITR) provided by Supabase.
- **Retention**: 7 days PITR, 30 days logical backups stored securely off-site.
- **Restore Procedure**:
  1. For granular data loss: Extract specific tables from the logical backup and insert.
  2. For catastrophic loss: Trigger a PITR restore via the Supabase Dashboard to a safe timestamp.
- **Restore Verification**: Restores must be executed in a dedicated staging/recovery environment first to verify data integrity without overwriting live production data.
- **Responsibility**: Lead Infrastructure Engineer.

## 4. Monitoring
Minimum monitoring requirements for the production environment:
- **Web/API**: HTTP 5xx error rate > 1%, P99 Latency > 1000ms.
- **Database**: Connection pool exhaustion, CPU > 80%.
- **Worker Process**: Process crashes (PM2 restarts), memory usage exceeding 500MB.
- **Crossref Queue**: Tasks in `FAILED` state, or `PENDING` > 4 hours.
- **Preservation Jobs**: Dark archive generation failures.
- **Authorization**: Spike in HTTP 401/403 responses on `/api/admin/*`.

## 5. Rollback
- **Application Rollback**: Revert Next.js deployment to the previous known-good commit.
- **Worker Rollback**: Stop the worker, checkout the previous commit, and restart the process supervisor.
- **Migration Strategy**: The migration system is forward-only. Rollbacks requiring schema changes must be deployed as new "fix-forward" migrations.
- **Incident Escalation**: Required if data corruption is detected, triggering the incident response protocol.

## 6. Environment Checklist
The production environment requires the following environment variables (values omitted). No secrets are committed to the repository.

**Mandatory (Application/Database)**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Secret)
- `GOVERNANCE_DATABASE_URL` (Secret)

**External Services (Required for full operations)**
- `RESEND_API_KEY` (Secret)
- `CROSSREF_USERNAME` (Secret)
- `CROSSREF_PASSWORD` (Secret)
- `ORCID_CLIENT_ID`
- `ORCID_CLIENT_SECRET` (Secret)

## 7. External Prerequisites
Before actual publishing and DOI registration can occur in production, the following prerequisites must be fulfilled:
- **Crossref**: Active membership, assigned DOI prefix, production credentials, registered depositor identity, and publicly available article landing pages.
- **ORCID**: Production Public API credentials, configured redirect URIs, and compliance with the ORCID display guidelines.
- **DOAJ**: Submission of journals for indexing (requires accumulating live publication history first).
- **Preservation**: Executed organizational agreement with CLOCKSS or Portico.

## 8. Privacy and Legal Checklist
The operational privacy policies and data governance rules have been drafted.
- **File**: `implementation/RC2_PRIVACY_AND_DATA_GOVERNANCE_CHECKLIST.md`
- **Key Action**: Explicit identification of items requiring formal legal counsel approval (e.g., ORCID PII retention, right to be forgotten conflicts with scholarly records, and cross-border data transfer).
