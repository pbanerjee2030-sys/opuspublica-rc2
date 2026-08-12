# Opus Publica RC2 Engineering Baseline

## 1. Baseline Identity

- **Repository**: `opuspublica-rc2`
- **Purpose**: Controlled private engineering workspace.
- **Nature**: This baseline is a development and integration baseline, NOT a production release.
- **Date/Status**: August 12, 2026. Private GitHub boundary staged and confirmed.
- **Current Repository Authority Model**: Governed strictly by the Master Engineering Directive and foundational engineering documents.

## 2. Repository Authority

### Authoritative Source
The authoritative source directories for publication and governance logic are:
- `app/`
- `backend/`
- `components/`
- `lib/`
- `public/`
- `governance/`
- Formal tests
- `supabase/migrations/`

### Database Authority
`supabase/migrations/` is the sole authoritative migration chain.

### Historical / Forensic / Non-Authoritative SQL
- `supabase/MIGRATE_ALL.sql`
- `supabase/MIGRATE_ALL2.sql`
- `supabase/schema.sql`

These MUST NOT be treated as migration sources or executed as a substitute for `supabase/migrations/`.

## 3. Engineering Evidence Authority

`implementation/OP Engineering Constitution, Governance & Implementation/` contains foundational engineering and governance evidence.

Distinguish between:
- Constitutional/foundational documents
- Architecture specifications
- Forensic reviews
- Implementation reports
- Runtime certification reports
- Historical/superseded material

PRESENCE IN REPOSITORY ≠ IMPLEMENTATION AUTHORIZATION ≠ PRODUCTION CERTIFICATION.

## 4. Current Certification State

### CERTIFIED / FROZEN
WP-01-02 authenticated submission RPC boundary.

The local runtime evidence established:
- authenticated editor submission;
- authenticated author submission;
- anonymous denial;
- idempotent replay;
- conflict detection;
- event emission;
- Governance RPC isolation.

### IMPLEMENTED / RUNTIME CERTIFICATION PENDING
- WP-GOV-01-PREP
- WP-GOV-01A
- WP-GOV-01B

These are implemented locally but remain pending formal runtime certification.

### NOT YET IMPLEMENTED / NOT AUTHORIZED FOR IMPLEMENTATION
- WP-GOV-01C
- WP-GOV-01D
- Later release authorization / gate implementation unless explicitly authorized elsewhere.

## 5. Protected Boundaries

Publication Plane authority remains with the existing Publication structures. Governance MUST NOT become a duplicate Publication authority.

- Governance does not own Article/Journal/Book authoritative models.
- Controlled cross-domain boundaries only.
- No arbitrary Publication mutation from Governance.
- No direct generalized Publication table access unless expressly authorized.

## 6. Migration Integrity

- Applied historical migrations are immutable.
- Migration drift remediation is represented through the formal chain.
- Migration collision corrections were performed only where the migrations had not been applied remotely.
- The current local chain is intended to be reproducible.

## 7. Known Development Position

This baseline contains:
- Verified production-plane work;
- Governance implementation in progress;
- Active engineering evidence;
- Historical forensic material.

The repository is therefore an engineering baseline, not a finished RC2 release.

---
**Document Status**: ACTIVE ENGINEERING GOVERNANCE DOCUMENT
**Authority**: RC2 ENGINEERING OPERATING CONTROL
