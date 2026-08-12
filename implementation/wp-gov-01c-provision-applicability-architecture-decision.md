# WP-GOV-01C Provision Applicability Architecture Decision

## 1. Authoritative Evidence
- `governance/prisma/schema.prisma`
- `implementation/wp-gov-01-engineering-specification.md`
- `implementation/wp-gov-01c-architecture-authorization-review.md`
- `governance/workers/synthesis-engine.ts`

## 2. Existing Provision Semantics
The `Provision` model is defined in `schema.prisma` with the following fields: `id`, `class`, `statement`, `sourceChapter`, `severity`, `owner`, `predicate`, `verificationMethod`, `version`, `status`, `group`, `traceability`, `createdAt`, `updatedAt`.
It acts as the Machine-Readable Constitution (MRC) storing the rules and invariants for the Opus Publica system. Currently, the `synthesis-engine.ts` script fetches all provisions where `status: 'active'` and binds them to the submission node.

## 3. Applicability Mechanisms Found
An exhaustive review of the `Provision` fields for an applicability mechanism reveals:
- **`class`**: Represents provision type (e.g., invariant, rule). Not authorized for journal scoping.
- **`group`**: Represents logical grouping (e.g., "Identity"). Not authorized for journal scoping.
- **`predicate`**: Stores first-order logic notation. While technically capable of holding context-evaluation logic (like `context.journalId == '...'`), the authoritative documents do not authorize or define parsing this field to determine journal applicability.
- **`owner`**: Represents team name. Not authorized for journal scoping.
- **`sourceChapter`, `traceability`, `version`, `status`**: General metadata. Not authorized for journal scoping.
- **Code-level Interpretation**: The current codebase (`synthesis-engine.ts`) indiscriminately applies all active provisions to all submissions, providing no filtering mechanism.

**Finding**: There is no authoritative mechanism defined in the schema or the code to classify a provision as applicable or non-applicable to a specific submission or journal.

## 4. Scenario Determination
**SCENARIO D:** Provision applicability is NOT DEFINED and requires a new architectural decision.

*Rationale from Specification Forensics:*
The `wp-gov-01-engineering-specification.md` explicitly mentions conditional applicability:
- Line 464: "When a `SUBMISSION` node is created (from `ArticleSubmitted`), `REQUIRES` edges are generated to all provisions **applicable to the target journal**."
- Line 191: "At least N `ReviewSubmitted` events (N defined by **journal-level constitutional provisions**)..."

These statements prove provisions are intended to be journal-specific (conditional). However, the specification completely omits how this relationship is modeled in the Governance database (e.g., missing a `journalId` field on `Provision` or a `ProvisionJournalScope` junction table). Therefore, the mechanism is not defined.

## 5. Impact on Current WP-GOV-01C Implementation
- **Legality of `REQUIRES` Edges**: `REQUIRES` edges cannot be legally generated at this time. Generating them for all provisions violates the specification's explicit requirement to link only provisions "applicable to the target journal".
- **Omission of Provisions**: `REQUIRES` edges (and the associated `PROVISION` nodes) should be omitted entirely from the synthesis graph until applicability is resolved to prevent corrupting the traceability graph topology.
- **Consistency of Global Graph**: A global provision graph (applying all provisions to all submissions) is explicitly inconsistent with the specification.
- **Semantic Correctness**: The current WP-GOV-01C synthesis output is semantically incorrect because it creates false dependencies (requiring submissions to satisfy provisions that do not apply to their journal).

## 6. Exact Unresolved Architectural Question
How is the relational binding between a `governance.Provision` and a `journalId` or `venueId` structured in the Governance schema, and how should the Synthesis Engine query this relationship?

## 7. Recommended Governance Decision
RC2 Engineering Governance must authorize a schema amendment to establish provision applicability. Options include:
1. Adding an explicit `journalId` (or `venueId`) string column to the `Provision` model (if provisions map 1:1 to venues).
2. Introducing a `ProvisionScope` junction table mapping provisions to multiple venues (N:M).
3. Defining a formal syntax within the `predicate` field to evaluate applicability dynamically during synthesis.

Until a decision is rendered, WP-GOV-01C cannot complete its graph construction.
