# Opus Publica RC2 Master Engineering Directive

## PART I — OPERATING MODEL

**ARCHITECTURE / GOVERNANCE**
↓
Approved Work Package
↓
**ENGINEERING TEAM**
↓
Implementation
↓
**ANTIGRAVITY**
Independent Audit
↓
**GPT / Governance Authority**
↓
PASS / CORRECTION / BLOCKED / REJECT
↓
Certification
↓
Next Work Package

The engineering team BUILDS.
Antigravity AUDITS.
GPT / governance authority CERTIFIES and authorizes corrections.

## PART II — ENGINEERING TEAM MANDATE

The engineering team is authorized to implement only approved work packages.

They MUST:
- follow the applicable specification;
- respect file boundaries;
- preserve authoritative migration history;
- preserve security boundaries;
- create tests;
- create implementation evidence;
- perform runtime verification where available;
- report blockers honestly.

They MUST NOT:
- redesign architecture independently;
- invent missing requirements;
- weaken security boundaries to make tests pass;
- alter protected predecessors casually;
- edit applied migrations;
- silently resolve constitutional contradictions;
- mark a work package certified themselves.

## PART III — DOCUMENT SEQUENCING RULE

For every work package:
1. Read the constitutional/foundational documents identified for that package.
2. Read the exact approved specification.
3. Read relevant forensic/adversarial findings.
4. Read relevant implementation history.
5. Do NOT treat every repository document as equally authoritative.
6. Later-stage documents must not be used to expand an earlier work package.
7. Superseded documents remain for provenance but do not override current approved specifications.

Engineering must never independently decide which later-stage documents authorize new architecture.

## PART IV — WORK PACKAGE LIFECYCLE

Every work package follows:

**Gate 1 — Authorization**
A work package is authorized by the governing specification.

**Gate 2 — Implementation**
Engineering team implements it.

**Gate 3 — Evidence**
Engineering produces:
- implementation report;
- tests;
- runtime results;
- migration evidence if relevant;
- security evidence;
- Git status evidence.

**Gate 4 — Independent Audit**
Antigravity performs a read-only forensic/adversarial audit.

**Gate 5 — Certification**
Only after review is the work package:
- VERIFIED;
- CORRECTION REQUIRED;
- BLOCKED;
- REJECTED.

**Gate 6 — Freeze**
A VERIFIED package becomes frozen unless a later authorized change supersedes it.

## PART V — STOP CONDITIONS

Engineering MUST STOP and report instead of improvising when:
- requirements are ambiguous;
- required evidence is contradictory;
- a protected file must be changed;
- a migration dependency is missing;
- a security boundary must be weakened;
- runtime behavior contradicts the specification;
- database state differs materially from the expected contract;
- an external dependency is unavailable;
- a constitutional conflict appears.

The correct action is:
STOP → REPORT → ARCHITECTURE CLARIFICATION → RESUME.

## PART VI — WORK PACKAGE SEQUENCE

Use the current approved sequence.

**Phase 1 — Publication foundation**
Existing WP-01 family and related predecessor work.
WP-01-02 is already certified/frozen where supported by the runtime report.

**Phase 2 — Governance foundation**
WP-GOV-01-PREP
WP-GOV-01A
WP-GOV-01B
Do not begin later Governance work merely because source files already exist.

**Phase 3 — Governance intelligence**
WP-GOV-01C
WP-GOV-01D
These require separate authorization and must not be treated as currently authorized simply because their concepts appear in repository documents.

**Phase 4 — Governance enforcement**
Release authorization / gates and later enforcement work only when explicitly authorized.

**Phase 5 — End-to-end RC2 certification**
Integration, adversarial verification, runtime certification, and final release decision.
Where dependencies allow, engineering may parallelize implementation, but certification dependencies must be respected.

## PART VII — FILE PERMISSION DISCIPLINE

Every work package must define:
**MAY MODIFY**: Exact files/directories.
**READ ONLY**: Relevant supporting documents or protected predecessors.
**MUST NOT MODIFY**: Protected files, migrations, or other work packages.

The team must not expand scope merely because it discovers another file that appears relevant.

## PART VIII — DATABASE / MIGRATION RULES

1. `supabase/migrations/` is authoritative.
2. Historical SQL is not authoritative.
3. Applied remote migrations are immutable.
4. Unapplied local migrations may be corrected when authorized.
5. Migration renames are permitted only when remote history proves the migration is not applied and the rename preserves chronology.
6. Never use historical `MIGRATE_ALL*.sql` as an alternative deployment path.
7. Clean `supabase db reset` is a primary reproducibility check.
8. Remote push requires separate authorization.

## PART IX — SECURITY RULES

No credential may be committed.

Never commit:
- `.env*` local files;
- service-role secrets;
- database passwords;
- private keys;
- local Supabase runtime state;
- machine-local Docker state.

Do not weaken least privilege. Security boundaries are part of the specification, not optional implementation details.

## PART X — TESTING RULES

Tests must distinguish:
- authentication;
- PostgreSQL EXECUTE privilege;
- business authorization;
- RLS;
- data integrity;
- idempotency;
- concurrency;
- event emission;
- failure behavior.

Never claim a test passed when it was skipped. Never use `expect(true)` placeholders as evidence.
Database/runtime tests that could not execute must be explicitly labeled:
`IMPLEMENTED BUT NOT EXECUTED — RUNTIME BLOCKED`

## PART XI — ANTIGRAVITY AUDIT PROTOCOL

Antigravity's normal role is: **INDEPENDENT AUDITOR**

It must not silently repair implementation while auditing.
An audit should examine specification compliance, constitutional compliance, file-boundary compliance, migration correctness, security, privileges, RLS, replay, concurrency, failure recovery, runtime behavior, regression, evidence honesty, and Git integrity.

Audit outcome: PASS, CORRECTION REQUIRED, BLOCKED, or REJECT.

Only after an explicit correction authorization may Antigravity modify implementation for a correction pass.

## PART XII — ENGINEERING HANDOFF REQUIREMENTS

When a work package is complete, the team must provide:
1. implementation report;
2. exact files changed;
3. exact files protected;
4. tests executed;
5. actual results;
6. runtime environment;
7. migration status;
8. rollback procedure;
9. known limitations;
10. Git commit/branch information;
11. unresolved findings.

No work package is complete merely because code compiles.

## PART XIII — GITHUB OPERATING MODEL

This repository is PRIVATE. The existing `opuspublica` repository is NOT the RC2 engineering workspace. The new repository is `opuspublica-rc2`.

Engineering must work through branches and pull requests.
`main` should represent the controlled baseline/certified line.
Direct unreviewed changes to the protected branch are prohibited once branch protection is established.
Do not expose the repository publicly.

## PART XIV — ENGINEERING TEAM FIRST OBJECTIVE

The team should NOT immediately begin broad RC2 implementation.
Their first responsibility after receiving the repository is to:
1. read `RC2_BASELINE.md`;
2. read this Master Engineering Directive;
3. read `REPOSITORY_ENGINEERING_BOUNDARY.md`;
4. consult `ENGINEERING_EVIDENCE_INDEX.md`;
5. confirm repository/tooling reproducibility;
6. confirm local Supabase startup/reset;
7. confirm the existing certified WP-01-02 test path;
8. then proceed with the next authorized work package.

## PART XV — SUCCESS PRINCIPLE

The project is optimized for: QUALITY + TRACEABILITY + SECURITY + SPEED, not SPEED at the expense of certification. Parallel engineering is encouraged where dependencies permit. Architectural improvisation is prohibited.

## PART XVI — NO PRODUCTION AUTHORIZATION

Nothing in this document authorizes:
- production deployment;
- production database migration;
- remote `supabase db push`;
- production credential changes;
- production release;
- DOI minting changes;
- final RC2 release.

Those require separate authorization.

---
**Document Status**: ACTIVE ENGINEERING GOVERNANCE DOCUMENT
**Authority**: RC2 ENGINEERING OPERATING CONTROL
