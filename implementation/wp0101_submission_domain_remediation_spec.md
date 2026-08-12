# WP-01-01 SUBMISSION DOMAIN REMEDIATION SPECIFICATION

## A. Executive Finding
WP-01-01 historically conflated the Submission and Article domains. The implementation currently writes directly to the canonical Article domain and inappropriately utilizes legacy `articles.status` as submission state. This structural deviation blocks downstream services that require a discrete Submission Service boundary.

## B. Remediation Objective
WP-01-02 establishes an independent, canonical Submission Domain. It decouples submissions from articles, defines SUB-01 as the sole owner of submission state, and enforces strict RPC boundaries for downstream service interaction.

## C. Canonical Submission Domain
The Submission Domain is the authoritative boundary for manuscript intake and editorial review. It manages submission metadata and governs the lifecycle state of the submission until a terminal decision is reached, strictly separating these concerns from Article publication workflows.

## D. Submission Entity
The `public.submissions` entity contains the authoritative 22-field Submission Domain contract:

1. `submission_id` 
   * Identity: UUID (Primary Key)
   * Producer: Author/System
   * Mutability: Immutable
   * Verification: DB Constraint
   * Migration Treatment: Generated or Reconstructed
2. `submission_article_id`
   * Identity: UUID (Foreign Key)
   * Producer: SUB-01
   * Mutability: Immutable
   * Verification: DB Constraint
   * Migration Treatment: Mapped from existing Article
3. `submission_state`
   * Identity: Enum
   * Producer: SUB-01 (State Machine)
   * Mutability: Controlled by SUB-01
   * Verification: State Machine transition logic
   * Migration Treatment: Reconstructed or UNKNOWN
4. `submission_submitted_at`
   * Identity: Timestamp
   * Producer: SUB-01
   * Mutability: Immutable
   * Verification: Application logic
   * Migration Treatment: Reconstructed
5. `submission_submitted_by_user_id`
   * Identity: UUID
   * Producer: Author
   * Mutability: Immutable
   * Verification: Auth Context
   * Migration Treatment: Reconstructed
6. `submission_journal_id`
   * Identity: UUID
   * Producer: Author
   * Mutability: Immutable
   * Verification: Foreign Key Constraint
   * Migration Treatment: Reconstructed
7. `submission_section_id`
   * Identity: UUID
   * Producer: Author
   * Mutability: Immutable
   * Verification: Foreign Key Constraint
   * Migration Treatment: Reconstructed
8. `submission_title`
   * Identity: Text
   * Producer: Author
   * Mutability: Immutable (for submission version)
   * Verification: Application logic
   * Migration Treatment: Reconstructed
9. `submission_abstract`
   * Identity: Text
   * Producer: Author
   * Mutability: Immutable
   * Verification: Application logic
   * Migration Treatment: Reconstructed
10. `submission_content`
    * Identity: Text (Extracted HTML)
    * Producer: System (Mammoth extraction)
    * Mutability: Immutable
    * Verification: Application logic
    * Migration Treatment: Reconstructed
11. `submission_files`
    * Identity: JSONB (Storage Paths)
    * Producer: System (Storage claim check)
    * Mutability: Immutable
    * Verification: Storage confirmation
    * Migration Treatment: Reconstructed
12. `submission_author_ids`
    * Identity: JSONB (Array of UUIDs)
    * Producer: Author
    * Mutability: Immutable
    * Verification: Profile resolution
    * Migration Treatment: Reconstructed
13. `submission_external_co_authors`
    * Identity: JSONB (Name, ORCID, ROR)
    * Producer: Author
    * Mutability: Immutable
    * Verification: Format validation
    * Migration Treatment: Reconstructed
14. `submission_funder_name`
    * Identity: Text
    * Producer: Author
    * Mutability: Immutable
    * Verification: Format validation
    * Migration Treatment: Reconstructed
15. `submission_funder_award_number`
    * Identity: Text
    * Producer: Author
    * Mutability: Immutable
    * Verification: Format validation
    * Migration Treatment: Reconstructed
16. `submission_funder_id`
    * Identity: Text
    * Producer: Author
    * Mutability: Immutable
    * Verification: Format validation
    * Migration Treatment: Reconstructed
17. `submission_keywords`
    * Identity: JSONB (Array of Strings)
    * Producer: Author
    * Mutability: Immutable
    * Verification: Format validation
    * Migration Treatment: Reconstructed
18. `submission_conflict_of_interest_statement`
    * Identity: Text
    * Producer: Author
    * Mutability: Immutable
    * Verification: Format validation
    * Migration Treatment: Reconstructed
19. `submission_data_availability_statement`
    * Identity: Text
    * Producer: Author
    * Mutability: Immutable
    * Verification: Format validation
    * Migration Treatment: Reconstructed
20. `submission_ethics_approval_statement`
    * Identity: Text
    * Producer: Author
    * Mutability: Immutable
    * Verification: Format validation
    * Migration Treatment: Reconstructed
21. `submission_cover_letter`
    * Identity: Text
    * Producer: Author
    * Mutability: Immutable
    * Verification: Format validation
    * Migration Treatment: Reconstructed
22. `submission_metadata`
    * Identity: JSONB
    * Producer: System
    * Mutability: Mutable (System internal)
    * Verification: JSON Schema
    * Migration Treatment: Carries non-reconstructable legacy fields

## E. Submission State Machine
`submissions.submission_state` is canonical, owned by SUB-01, mutable only through the authorized state machine, and direct database writes are forbidden. Downstream services may trigger a valid transition through the authorized SUB-01 boundary, but do not become the STATE OWNER. 

*   **Transition 1**
    *   Source: Drafted
    *   Destination: Submitted
    *   State Owner: SUB-01
    *   Transition Trigger: Author
    *   Authorized Actor/Service: User/Client
    *   Event: `ArticleSubmitted`
    *   Idempotency: Hash of intent
    *   Conflict Behavior: Reject if Submitted
*   **Transition 2**
    *   Source: Submitted
    *   Destination: InReview
    *   State Owner: SUB-01
    *   Transition Trigger: Editorial workflow
    *   Authorized Actor/Service: Editorial Service
    *   Event: `EditorialCheckCompleted`
    *   Idempotency: Request ID
    *   Conflict Behavior: Reject if not Submitted
*   **Transition 3**
    *   Source: InReview
    *   Destination: RevisionRequested
    *   State Owner: SUB-01
    *   Transition Trigger: WP-03 Decision
    *   Authorized Actor/Service: WP-03
    *   Event: `RevisionRequested`
    *   Idempotency: Decision Request ID
    *   Conflict Behavior: Reject if not InReview
*   **Transition 4**
    *   Source: InReview
    *   Destination: Accepted
    *   State Owner: SUB-01
    *   Transition Trigger: WP-03 Decision
    *   Authorized Actor/Service: WP-03
    *   Event: `DecisionRecorded`
    *   Idempotency: Decision Request ID
    *   Conflict Behavior: Reject if not InReview
*   **Transition 5**
    *   Source: InReview or Submitted
    *   Destination: Rejected
    *   State Owner: SUB-01
    *   Transition Trigger: WP-03 Decision (including desk rejects)
    *   Authorized Actor/Service: WP-03
    *   Event: `DecisionRecorded`
    *   Idempotency: Decision Request ID
    *   Conflict Behavior: Reject if terminal
*   **Transition 6**
    *   Source: Drafted, Submitted, InReview, or RevisionRequested
    *   Destination: Withdrawn
    *   State Owner: SUB-01
    *   Transition Trigger: Author
    *   Authorized Actor/Service: User/Client
    *   Event: `SubmissionWithdrawn`
    *   Idempotency: Hash of intent
    *   Conflict Behavior: Reject if terminal
*   **Transition 7**
    *   Source: Accepted, Rejected, or Withdrawn
    *   Destination: Archived
    *   State Owner: SUB-01
    *   Transition Trigger: System rule
    *   Authorized Actor/Service: Worker
    *   Event: `SubmissionArchived`
    *   Idempotency: Job ID
    *   Conflict Behavior: Skip if Archived

## F. Article / Submission Relationship
`submission_id` is independent from `article_id`. Legacy `articles.status` is NOT canonical Submission state. Article state is a separate domain state.

## G. Submission Event Chain
ArticleSubmitted
→ EditorialCheckStarted
→ EditorialCheckCompleted
→ ReviewerAssigned
→ ReviewerAccepted / ReviewerDeclined
→ ReviewSubmitted
→ DecisionRecorded / RevisionRequested
→ RevisionSubmitted where applicable

## H. Idempotency and Identity
Event identity is distinct from `submission_id`. Idempotency identity is distinct from event identity. No direct mapping of physical database UUIDs to logical idempotency keys is permitted.

## I. Migration Strategy
Historical records are classified as:
* DETERMINISTICALLY RECONSTRUCTABLE
* PARTIALLY RECONSTRUCTABLE
* UNKNOWN / NON-RECONSTRUCTABLE

Historical facts MUST NOT be fabricated. Historical Article IDs and auditability are preserved.

## J. Compatibility Strategy
Legacy references to `articles.status` are strictly deprecated. The read models will be supported during transition, but writes must hit `public.submissions`.

## K. WP-01 Certification Impact
WP-01-02 establishes the Submission Domain Remediation. Historical WP-01-01 and WP-02-01 certification records remain preserved and are not rewritten.

## L. WP-02 Impact
WP-02 requires a corrective package because of its `article_id` dependency. This will be identified separately. This work package does not implement WP-02 correction.

## M. WP-03 Dependency
WP-03 remains BLOCKED until WP-01-02 is implemented, runtime verification succeeds, Submission Chain certification succeeds, and WP-01-02 is formally certified. WP-03 must consume the canonical Submission boundary using `submission_id`.

## N. WP-04 Dependency
WP-04 remains downstream of the required certification gates.

## O. Testing Requirements
Tests must verify the exact sequence of the event chain and test boundary isolation between Article and Submission domains.

## P. Runtime Certification Requirements
The future implementation must require actual runtime evidence for schema, state-machine constraints, authorization, RLS, ArticleSubmitted, EditorialCheckStarted, EditorialCheckCompleted, Review dependency, Decision dependency, idempotency, concurrency, migration, rollback, and complete Submission Chain ordering. Static build success is not sufficient.

## Q. Rollback Strategy
Database down-migrations dropping `public.submissions` without corrupting `public.articles`.

## R. Exact Future Implementation Scope
Creation of `public.submissions` and data migration boundaries.

## S. Document Sequencing
Specification → Review → Engineering Authorization.

## T. Governance Sequence
Controlled implementation strictly following the authorized specification.

## U. Engineering Authorization Gate
Authorization required prior to implementation.
