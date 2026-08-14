# RC2 Post-Remediation Governance Decisions

This document records the formal governance determinations for the post-RC2 pre-production remediation phase. These architecture decisions address gaps identified in the Release Readiness assessment while strictly preserving the frozen semantic contracts of WP-GOV-01A through WP-GOV-01F.

No application code, test, schema, migration, dependency, or runtime behavior is changed by this record.

## 1. Article Lifecycle / Ethics States
**Decision:** Append-only ethics/publication events.
**Rationale:** Altering the certified `articles.status` enum on the Publication Plane violates the frozen RC2 boundary (GOV-INV-02) and creates unhandled states in the Release Gate Enforcer. A separate append-only event stream for retractions, corrections, and expressions of concern maintains the event-sourcing paradigm (GOV-INV-07) and preserves the original `published` state transition.

## 2. Historical Publication Dates
**Decision:** Governed historical publication dates.
**Rationale:** The `publication_dates` schema must be retained to isolate historical metadata from the immutable digital system timestamps. A governance provision will enforce that the digital `online_publication` date maps to the authoritative system timestamps, preventing backdating from falsifying the digital provenance record, while allowing `print_publication` dates to reflect historical reality.

## 3. Worker Architecture
**Decision:** WorkerManager production execution.
**Rationale:** The `WorkerManager` provides a robust, native Node.js process supervisor with exponential backoff and idempotency protection. Existing governance workers (Synthesis, Gate, Outbox) will be refactored to extend `GovernanceWorker` and run under this manager daemon in production environments.

## 4. Preservation
**Decision:** Local dark archive at launch with external preservation integration as a post-launch objective.
**Rationale:** External networks like CLOCKSS and Portico require executed organizational agreements before technical integration can begin. To unblock the RC2 launch while ensuring data safety, Opus Publica will implement a local "dark archive" (automated BagIt exports to immutable cloud storage) for immediate preservation.

## 5. Crossref Deposit
**Decision:** Crossref deposit after successful Release Gate authorization.
**Rationale:** DOI deposits must only occur after the Governance Release Gate (WP-GOV-01E) confirms certification and authorizes the `PUBLISH` action. A dedicated background worker will poll for authorized articles and handle the XML generation and API submission, ensuring only fully governed works enter the Crossref registry.

## 6. Scholarly Interoperability
**Decision:** Repository interoperability without claiming OpenAIRE compliance absent validation.
**Rationale:** The platform will launch with the existing OAI-PMH Dublin Core endpoint to support basic harvesting. No claims of OpenAIRE POSI compliance will be made until explicit schema mapping and validation testing are completed post-launch.
