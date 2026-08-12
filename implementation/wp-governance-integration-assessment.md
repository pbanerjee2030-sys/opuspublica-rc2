# Opus Publica RC2: Governance Control Plane Integration Assessment

## 1. Executive Finding
The external Opus Publica Governance Model can and should be integrated as a **SEPARATE GOVERNANCE CONTROL PLANE** (Model B/C hybrid). The Publication Plane (existing website, Supabase/Postgres) will remain the authoritative transactional system for submissions, reviews, and decisions. The Governance Control Plane will operate as a consumer of Publication events (via the existing `outbox` infrastructure), verifying state and managing release gates without duplicating the authoritative business data.

## 2. Current Publication Plane Architecture
- **Infrastructure:** Next.js (frontend + API routes) + Supabase (PostgreSQL, Auth, Storage).
- **Transactional State:** Authoritative for Articles, Profiles, Reviews, Decisions.
- **Eventing:** An asynchronous `outbox` pattern (e.g., `ArticleSubmitted`, `ReviewSubmitted`) is already established by WP-01, WP-02, and WP-03 to isolate side-effects.
- **Auditing:** Handled via database triggers and the `outbox` (`20260810_wp1601_audit_reimplementation.sql`).

## 3. Governance Model Architecture
- **Infrastructure:** Prisma / SQLite (developed externally).
- **Capabilities:** Machine-Readable Constitution (MRC), Architectural Traceability Graph (ATG), certification evaluation, release gating, and policy-as-code.
- **Domain:** It manages constitutional invariants, thresholds, and governance evidence, not transactional publication state.

## 4. Domain Ownership Matrix
| Domain | Authoritative Plane | Mechanism |
| :--- | :--- | :--- |
| **Users / Authentication** | Publication (Supabase Auth) | Supabase RLS |
| **Articles / Submissions** | Publication | `public.articles`, `public.submissions` |
| **Reviews / Decisions** | Publication | `public.reviews`, `public.decisions` |
| **File Storage / DOI** | Publication | Supabase Storage / DOI API |
| **Constitution / Rules** | Governance | Prisma Models |
| **Traceability / Gates** | Governance | Prisma Models |
| **Certification Evidence** | Governance (Derived) | Consumes `outbox` events |

## 5. Governance vs Publication Boundary
- **Principle:** Governance verifies; Publication executes.
- **Data Boundary:** Governance holds policies and references to publication identifiers (`submission_id`, `article_id`). It must **not** duplicate the raw submission content, PDF files, or reviewer identities.
- **Interaction:** The Governance Plane consumes outbox events emitted by the Publication Plane to evaluate state transitions against constitutional thresholds (e.g., "Are there 2 passing reviews before this Decision is enacted?").

## 6. Integration Options A/B/C
### MODEL A — Embedded Directly
- **Description:** Governance state directly added to `public` schema in Supabase; rules hardcoded into publication logic.
- **Evaluation:** Unacceptable. Violates boundary rules, conflates constitutional invariants with business logic, and risks destabilizing the certified WP-01/02/03 logic.

### MODEL B — Separate Internal Control-Plane Service (APIs/Events)
- **Description:** Governance runs as a distinct microservice/daemon, subscribing to the Publication Plane's `outbox` (via Supabase Realtime or webhooks).
- **Evaluation:** High architectural integrity. Zero risk to existing website. Clear boundary. Requires operational overhead (running two separate services).

### MODEL C — Embedded Deployment, Separate Bounded Context
- **Description:** Governance code is integrated into the Next.js backend, but uses a strictly separate Prisma SQLite database (or isolated Postgres schema) and communicates exclusively via internal API boundaries and the outbox.
- **Evaluation:** Balances strong boundaries with lower operational overhead (single deployment). However, running SQLite alongside serverless Next.js can introduce state/filesystem issues if not deployed correctly (e.g., requires persistent volume).

## 7. Recommended Architecture
**MODEL B (Separate Control Plane via Events)** is strongly recommended.
*Reasoning:* It provides the strongest guarantees against accidental mutation of publication state. By deploying the Governance Model as a distinct service that listens to the `outbox`, the existing Opus Publica Next.js application remains untouched visually and functionally. The Governance Model consumes events, validates them against the MRC, and exposes an API (or webhooks) that the Publication Plane queries for Release Gates (e.g., checking if a publication is authorized).

## 8. Data Ownership Model
- **Publication DB (Postgres):** Holds transactional truth.
- **Governance DB (SQLite/Postgres):** Holds reference pointers (IDs), integrity results, audit findings, and constitutional logic. The externally developed Article/Journal models must be stripped down to act merely as projection/reference stubs.

## 9. Event/Evidence Flow
1. **Execution:** Author submits an article.
2. **Transaction:** `submit_article_transition` RPC completes (WP-01).
3. **Emission:** `ArticleSubmitted` event is written to `public.outbox`.
4. **Consumption:** Governance Control Plane reads the `outbox` event.
5. **Evaluation:** Governance assesses the event against the Constitution and records an Integrity Result.

## 10. Certification Flow
Certification becomes an asynchronous verification process. The Governance Plane independently processes the traceability graph based on publication events and flags violations. It does not block transactions directly; it produces certification evidence.

## 11. Release Gate Flow
When the Publication Plane attempts a privileged action (e.g., final publication/DOI minting), it must query the Governance Control Plane's Release Gate API. If the Governance Plane returns "Authorized" (all prior thresholds met), the publication proceeds.

## 12. WP-01 Assessment
**WP-01-01 / WP-01-02 (Submission Domain Remediation): RETAIN AND COMPLETE.**
These packages correctly establish the transactional `outbox` (e.g., `20260811_wp0101_submission_outbox.sql`) required to feed the Governance Plane.

## 13. WP-02 Assessment
**WP-02-01 (Review Outbox Refactor): RETAIN AND COMPLETE.**
It provides the exact asynchronous review events that Governance needs to verify reviewer thresholds.

## 14. WP-03 Assessment
**WP-03-01 (Decision Core): RETAIN AND COMPLETE.**
It defines the `public.decisions` table and lifecycle, ensuring decisions are recorded immutably for Governance evaluation.

## 15. Existing Certified Package Protection
All existing APIs, UI routes (`app/`), and baseline migrations remain 100% intact. Governance will operate externally to the Next.js routes, interacting strictly through database events and read-only API calls.

## 16. Website Preservation Strategy
The Governance Plane will have no UI within the main application initially, or will be exposed via a dedicated `/governance` sub-path that relies entirely on the Governance DB. The core author/reviewer workflows remain unchanged.

## 17. Database Strategy
**Migrate Governance to PostgreSQL (Separate Schema).**
While SQLite is used currently by the engineering team, for production stability on RC2, the Prisma implementation should be pointed to a dedicated `governance` schema within the *existing* Supabase Postgres cluster. This removes the operational pain of managing a separate SQLite file in a serverless environment while preserving the logical Bounded Context.

## 18. Security/RBAC Implications
- **Publication Plane:** Continues to use Supabase Auth and RLS.
- **Governance Plane:** Uses a Service Role key to read the `outbox` and verify state, operating securely behind the scenes.

## 19. Failure and Recovery Model
If the Governance Plane goes down, the Publication Plane can continue accepting submissions and reviews (asynchronous operations). Only terminal operations strictly guarded by a Release Gate (e.g., final DOIs) would be blocked (fail-safe).

## 20. Minimum Integration Surface
- **Outbox Consumer:** Governance Plane listening to `public.outbox`.
- **Release Gate API:** Publication Plane querying Governance before final publication.

## 21. What Must NOT Be Changed
- Do not modify `submit_article_transition` or `test_submission_boundary.mjs`.
- Do not merge the Prisma Article/Journal models into the Supabase schema as authoritative tables.
- Do not modify the existing UI routes or frontend components.

## 22. Proposed Future Work Packages
- **WP-GOV-01:** Deploy the Governance Plane and configure Prisma to use the `governance` schema in Supabase.
- **WP-GOV-02:** Build the Outbox Consumer adapter.
- **WP-GOV-03:** Integrate Release Gates into the final Publication RPC.

## 23. Risks
- Potential race conditions if the Governance Plane processes events slower than the Publication Plane executes dependent actions (mitigated by explicit Release Gates).

## 24. Decision Required Before Implementation
- **Approval:** Approve MODEL B (with Postgres Schema adaptation) as the target integration architecture.
- **Authorization:** Authorize the initialization of WP-GOV-01 to merge the external repository codebase into Opus Publica safely.
