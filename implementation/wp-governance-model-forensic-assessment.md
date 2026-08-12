# Opus Publica RC2: Governance Model Forensic Assessment

## 1. Executive Finding
The externally provided Governance Model is fundamentally a **DATA MODEL AND API SHELL**, not a fully executable governance engine. While it provides an exceptionally comprehensive and robust Prisma schema mapping the entire constitutional corpus, the corresponding business logic (Certification Engine, Traceability Evaluation, Policy-as-Code execution) is heavily mocked or entirely absent. Therefore, integrating it requires preserving the existing Opus Publica transactional workflows intact and incrementally building the actual event-processing engines on top of this governance schema.

## 2. Governance Model Inventory
- **Database:** Prisma schema (`prisma/schema.prisma`) targeting SQLite. Extensive and well-structured, containing 18+ models spanning provisions, SLOs, certification, traceability, and duplicate publication entities.
- **Engine:** Absent. Business logic is limited to basic UI helpers (`src/lib/governance.ts`).
- **APIs:** Standard Next.js Route Handlers (`src/app/api/`) implementing direct Prisma CRUD.
- **Tests:** Bash scripts (`tests/`); no automated unit or integration tests for governance rules.

## 3. Implementation Reality Assessment
| Capability | Classification | Evidence |
| :--- | :--- | :--- |
| Machine-Readable Constitution | **DATA MODEL ONLY** | `Provision` schema exists; no evaluation engine. |
| Architectural Traceability Graph | **DATA MODEL ONLY** | `TraceabilityNode` & `TraceabilityEdge` exist; no pathfinding/evaluation logic. |
| Continuous Certification Engine | **MOCK** | `api/certification/evaluate/route.ts` hardcodes `PASS` unless `forceFail` is explicitly passed. |
| Self-Audit (SAP) | **DATA MODEL ONLY** | `AuditFinding` exists; no anomaly detection workers. |
| Release Gates | **DATA MODEL ONLY** | `Release` and `Signoff` models exist; no API enforcement or gating logic. |
| Policy-as-Code | **PLACEHOLDER** | `RegoPattern` exists; no Rego interpreter or execution environment. |
| Event Ingestion | **NOT FOUND** | No webhook endpoints or outbox pollers exist in the repository. |

## 4. Governance Domain Forensics
The Governance Model currently considers itself authoritative for **both** the constitution (which is correct) and the publication state (which is a critical violation). It contains `Journal`, `Article`, and `Book` models (`prisma/schema.prisma:194-242`) that duplicate the exact fields already present and certified in the Opus Publica PostgreSQL database. 

## 5. Article/Journal/Book Authority Analysis
These models must be:
**E. Replaced by immutable external references.**
*Evidence:* The Prisma schema defines `Article` with fields like `title`, `abstract`, and `pdfUrl`. If integrated as-is, this creates a split-brain scenario directly violating the "no second Article authority" rule. Governance does not need the raw abstract; it only needs to know that an Article UUID exists and has transitioned states. The governance schema should drop these publication tables and instead use `TraceabilityNode` references pointing to the authoritative Supabase IDs.

## 6. Minimum Evidence Contract
The Governance Control Plane only requires:
- `event_id`
- `event_type` (e.g., `ArticleSubmitted`, `DecisionRecorded`)
- `primary_entity_id` (e.g., `submission_id`)
- `actor_id`
- `timestamp`
- Specific state-change metadata (e.g., `decision_type` for thresholds).
It does **not** need PDFs, full text, or author identities.

## 7. Event Integration Analysis
The Governance Model has **zero** event integration capabilities built-in. It does not support webhooks, idempotency, or polling.
**Flow required:**
```text
Publication Plane (Postgres outbox)
        ↓
[NEW] Event Integration Adapter (Poller)
        ↓
Governance Traceability Nodes (Evidence)
        ↓
[NEW] Certification Engine (Async Evaluation)
```

## 8. Certification Engine Analysis
**Status:** MOCK. The evaluation route (`api/certification/evaluate/route.ts`) skips rule processing entirely. The certification flow exists only on paper and requires complete implementation.

## 9. Release Gate Analysis
**Status:** DATA MODEL ONLY. Releases track a `gateState`, but Opus Publica has no way to query it securely, and the Governance Model has no mechanism to block an Opus Publica deployment or publication action. A dedicated Release Gate API must be built.

## 10. Traceability Analysis
**Status:** DATA MODEL ONLY. The generic node/edge graph is well-designed to represent external systems, meaning Opus Publica can be mapped dynamically without importing the database. However, the traversal logic to verify dependencies is missing.

## 11. Security Analysis
**Status:** NOT IMPLEMENTED. The API routes have absolutely no authentication or authorization checks. 
**Integration:** Must be strictly isolated. The Governance DB should not be exposed to the internet. Service-to-service calls must use secure Supabase Service Roles or internal network boundaries.

## 12. Database Strategy
**Option 3: Move Governance models into a separate PostgreSQL schema/bounded context inside the existing Supabase PostgreSQL instance.**
*Reasoning:* Because the Governance Model is predominantly a Prisma schema shell lacking complex infrastructure dependencies, running it as a separate SQLite database introduces unnecessary deployment and filesystem complexity (especially in serverless environments). Pointing Prisma to a protected `governance` schema inside the existing Supabase instance achieves strict logical isolation (satisfying the bounded context) while drastically simplifying operations, backups, and security.

## 13. Failure Model
- **Governance Unavailable:** Publication Plane continues accepting submissions/reviews (asynchronous). Release gates fail-closed.
- **Event Delivery Fails:** Stays pending in `public.outbox`; retried by adapter.
- **Governance Stale:** Generates Audit Finding; does not rollback publication.

## 14. Website Preservation Analysis
Integration can occur 100% through backend/API/event boundaries via the existing `outbox`. No frontend changes are required. Users will experience no visible changes.

## 15. WP-01 Assessment
**WP-01-01 / WP-01-02:** **B. RETAIN AND COMPLETE.**
They establish the exact asynchronous outbox mechanism necessary to feed the governance graph safely.

## 16. WP-02 Assessment
**WP-02-01:** **B. RETAIN AND COMPLETE.**
Same justification. Provides independent review events required by the constitution.

## 17. WP-03 Assessment
**WP-03-01:** **B. RETAIN AND COMPLETE.**
Same justification. Provides immutable decision events for thresholds.

## 18. Minimum Integration Surface
1. **Outbox Adapter:** A worker reading `public.outbox` and inserting `TraceabilityNode` evidence into Governance.
2. **Release Gate API:** A secure endpoint on Governance for the Publication Plane to verify if an action is authorized.
3. **Prisma DB Config:** Updating Prisma to target the Supabase Postgres `governance` schema.

## 19. Components to Reuse
- The entire Prisma schema (excluding publication models).
- The REST API shell (as a foundation).

## 20. Components to Adapt
- The Prisma provider (must change from `sqlite` to `postgresql`).
- `api/certification/evaluate/route.ts` (must be rewritten from mock to actual evaluation).

## 21. Components to Isolate
- The Governance deployment itself must be an isolated internal service, not bundled into the public-facing Next.js application.

## 22. Components Not to Integrate
- `Article`, `Journal`, `Book` models from Prisma.
- The SQLite database file.

## 23. Proposed Integration Boundary
Opus Publica `public` schema -> `outbox` -> Governance Adapter -> Governance `governance` schema.

## 24. Risks
- Attempting to use the mocked Certification Engine as if it were real will lead to false-positive certifications.
- Securing the API routes is a critical path before any production deployment.

## 25. Final Recommendation
Migrate the Prisma governance schema into a separate PostgreSQL schema within the existing Supabase cluster. Remove the duplicative Article/Journal models. Retain and complete WP-01, WP-02, WP-03 as they provide the essential event stream. Finally, build the missing Event Ingestion and Certification Engine logic incrementally.

## 26. Decision Required Before Implementation
Authorize the adaptation of the Governance Prisma schema to PostgreSQL and the removal of the duplicate publication models to establish the safe architectural baseline.
