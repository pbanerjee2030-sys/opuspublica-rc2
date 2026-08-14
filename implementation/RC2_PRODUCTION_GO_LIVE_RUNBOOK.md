# RC2 Production Go-Live Runbook

This runbook defines the authoritative operational procedure for deploying Opus Publica RC2 to the live production environment.

> [!WARNING]
> **PROHIBITED ACTION**: The use of `supabase db reset` or any destructive drop/recreate database commands is **STRICTLY PROHIBITED** in the production environment.

## 1. Pre-Deployment Backup
Before initiating any deployment or database migration:
1. Verify the Supabase Point-in-Time Recovery (PITR) status is active.
2. Trigger a manual logical backup (`pg_dump`) of the `public` and `governance` schemas.
3. Verify the backup file integrity and store it in the secure off-site backup vault.

## 2. Environment Verification
Ensure the production environment contains all mandatory credentials.
- Execute a dry-run configuration check.
- Confirm separation from the development/staging database URL.
- Validate the presence of external service keys (Crossref, ORCID) required for go-live.

## 3. Incremental Migration
Apply database schema changes strictly incrementally:
```bash
# Push incremental migrations to the remote database
npx supabase db push
```
Verify the migration output confirms success without destructive operations.

## 4. Deployment
1. Build the production Next.js artifact:
   ```bash
   npm ci
   npx prisma generate --schema=governance/prisma/schema.prisma
   npm run build
   ```
2. Start the web application using the process supervisor:
   ```bash
   pm2 start ecosystem.config.js --only opuspublica-web
   ```

## 5. Worker Startup
Start the resilient asynchronous worker process for lifecycle and deposit tasks:
```bash
pm2 start ecosystem.config.js --only opuspublica-worker
```
Verify the PM2 logs (`logs/worker-out.log`) indicate the `WorkerManager` successfully initialized.

## 6. Smoke Tests
Execute live, non-destructive smoke tests:
1. Visit the homepage and verify HTTP 200 OK.
2. Authenticate using a test account (or verify ORCID OAuth redirect works).
3. Access the `/api/oai?verb=Identify` route to verify the XML output.

## 7. Crossref Verification
- Publish a designated test/editorial article in a test journal (or verify the queue behavior).
- Check the `WorkerManager` logs to ensure the `CrossrefDepositWorker` picks up the job.
- Verify the DOI resolves via `https://doi.org/...` after successful deposit.

## 8. Preservation Verification
- Verify that the dark archive package (.zip/BagIt) is successfully generated in the configured secure storage bucket upon publication.
- Ensure the checksum manifest is logged.

## 9. Monitoring
- **Web/API**: Monitor Next.js application HTTP 5xx error rates and latency using the APM provider.
- **Database**: Monitor Supabase PostgreSQL CPU, memory, and connection limits.
- **Worker Process**: Monitor PM2 process restarts and memory usage (`max_memory_restart: "500M"`).
- **Queues**: Alert if Crossref deposit jobs remain in a `PENDING` or `FAILED` state for more than 4 hours.
- **Security**: Alert on excessive authorization failures (HTTP 401/403) to the `/api/admin/*` and `/api/governance/*` routes.

## 10. Rollback
If the deployment fails or causes service degradation:
1. **Application Rollback**: Revert to the previous deployment build/commit using PM2 or the hosting platform.
2. **Worker Rollback**: Stop the worker (`pm2 stop opuspublica-worker`), revert the codebase, and restart.
3. **Database Rollback**:
   - The migration system is forward-only. If a schema change caused the issue, deploy a **fix-forward** migration.
   - For catastrophic data loss, engage the Incident Response team to restore the pre-deployment backup or PITR snapshot.

## 11. Incident Response
- **Severity 1 (Downtime/Data Loss)**: Page the On-Call Engineer. Escalate to the Infrastructure Lead. Initiate the Incident Response protocol.
- **Severity 2 (Crossref/Worker Failure)**: Create a high-priority ticket. Workers will automatically retry via exponential backoff; monitor closely.
