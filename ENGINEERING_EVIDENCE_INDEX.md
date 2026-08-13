# Engineering Evidence Index

**Repository**: Opus Publica RC2 (`opuspublica-rc2`)  
**Authority**: RC2 ENGINEERING OPERATING CONTROL  
**Governed by**: `implementation/OPUS_PUBLICA_RC2_MASTER_ENGINEERING_DIRECTIVE.md`

This index is the canonical certification register for all RC2 work packages. It is updated at each certification or freeze event. Do not use this index as a substitute for reading individual work package records; the linked documents are the authoritative evidence.

---

## Certification Status Register

### Phase 1 — Publication Foundation

| Work Package | Description | Status | Certification Record | Evidence |
|---|---|---|---|---|
| WP-01-01 | Submission Domain Remediation | CERTIFIED / FROZEN | — | `implementation/wp0101_*.md` |
| WP-01-02 | Authenticated Submission RPC Boundary | CERTIFIED / FROZEN | `implementation/wp0102-authenticated-rpc-runtime-report.md` | `implementation/wp0102-*.md` |
| WP-03-01 | Decision Core (Article State Machine) | CERTIFIED / FROZEN | `implementation/wp0301_implementation_report.md` | `implementation/wp0301_*.md` |

### Phase 2 — Governance Foundation

| Work Package | Description | Status | Certification Record | Evidence |
|---|---|---|---|---|
| WP-GOV-01-PREP | Governance Resolver Boundary & Prisma Toolchain | CERTIFIED / FROZEN | — | `implementation/wp-gov-01-prep-*.md`, `implementation/prisma-toolchain-*.md` |
| **WP-GOV-01A** | **Governance Schema Foundation** | **CERTIFIED / FROZEN** | [`implementation/wp-gov-01a-certification-record.md`](implementation/wp-gov-01a-certification-record.md) | `implementation/wp-gov-01a-*.md`, `implementation/governance-database-*.md` |
| WP-GOV-01B | Governance Ingestion Adapter & Outbox Reader | CERTIFIED / FROZEN | [`implementation/wp-gov-01b-certification-record.md`](implementation/wp-gov-01b-certification-record.md) | `implementation/wp-gov-01b-*.md` |

### Phase 3 — Governance Intelligence

| Work Package | Description | Status | Certification Record | Evidence |
|---|---|---|---|---|
| **WP-GOV-01C** | **Evidence Synthesis Engine** | **CERTIFIED / FROZEN** | [`implementation/wp-gov-01c-certification-record.md`](implementation/wp-gov-01c-certification-record.md) | `implementation/wp-gov-01c-correction-implementation-report.md` |
| **WP-GOV-01C-EXT** | Certified Evaluation Input Extension | **CERTIFIED / FROZEN** | [`implementation/wp-gov-01c-ext-certification-record.md`](implementation/wp-gov-01c-ext-certification-record.md) | [`implementation/wp-gov-01c-ext-implementation-report.md`](implementation/wp-gov-01c-ext-implementation-report.md) |
| **WP-GOV-01D** | Certification Evaluation Engine | **IMPLEMENTED / RUNTIME VERIFIED — CERTIFICATION PENDING** | Architecture Authorized. Predicate semantics resolved. Evaluator implemented. | [`implementation/wp-gov-01d-implementation-report.md`](implementation/wp-gov-01d-implementation-report.md) |

### Phase 4 — Governance Enforcement

| Work Package | Description | Status |
|---|---|---|
| Release Authorization / Gate | Deployment gate implementation | NOT AUTHORIZED / NOT STARTED |

### Phase 5 — End-to-End RC2 Certification

| Work Package | Description | Status |
|---|---|---|
| RC2 Integration Certification | Full adversarial integration audit | NOT STARTED |
| RC2 Final Release Decision | Production authorization | NOT AUTHORIZED |

---

## Migration Certification Register

| Migration File | Work Package | Status |
|---|---|---|
| `supabase/migrations/20260815000000_wpgov_01_prep_resolver.sql` | WP-GOV-01-PREP | CERTIFIED / IMMUTABLE |
| `supabase/migrations/20260815000001_wpgov_01b_outbox_read.sql` | WP-GOV-01-PREP / WP-GOV-01B | CERTIFIED / IMMUTABLE |
| `supabase/migrations/20260815000002_wpgov_01a_governance_schema.sql` | WP-GOV-01A | CERTIFIED / IMMUTABLE |
| `supabase/migrations/20260815000003_wpgov_01c_synthesis_permissions.sql` | WP-GOV-01C | CERTIFIED / IMMUTABLE |
| `supabase/migrations/20260815000004_wpgov_01c_provision_scope.sql` | WP-GOV-01C | CERTIFIED / IMMUTABLE |
| `supabase/migrations/20260816000000_wpgov_01c_ext.sql` | WP-GOV-01C-EXT | CERTIFIED / IMMUTABLE |

> All earlier Publication migrations (`20240810*` through `20260814*`) are CERTIFIED / IMMUTABLE.

---

## Open Findings Register

| ID | Work Package | Finding | Severity | Status |
|---|---|---|---|---|
| F-01 | WP-GOV-01A | `supabase_admin` default privileges not set in `governance` schema | LOW | ACCEPTED — security-neutral |
| F-02 | WP-GOV-01A | Outbox reader exposes `payload` field (in-memory only; never persisted) | INFO | ACCEPTED — by design |
| F-03 | WP-GOV-01B | Main poll loop ignores `nextRetryAt` — rapid retry exhaustion | LOW | FIXED — CERTIFIED |

---

## Frozen Package Boundary Map

The following constitute the certified/frozen deliverables as of 2026-08-12:

```
CERTIFIED / FROZEN:
  supabase/migrations/  (all migrations through 20260815000002)
  governance/prisma/schema.prisma  (model/generation authority, read-only)
  public.submit_article_transition  (Publication RPC)
  public.process_article_submission  (Publication RPC)
  public.governance_evidence_resolver  (approved cross-domain boundary)
  public.governance_outbox_reader  (approved cross-domain boundary)
  governance schema + 26 tables (WP-GOV-01A)
  governance/workers/ingestion-adapter.ts  (WP-GOV-01B)
  governance/workers/__tests__/ingestion-adapter.test.ts  (WP-GOV-01B)
  supabase/migrations/20260815000003_wpgov_01c_synthesis_permissions.sql  (WP-GOV-01C)
  supabase/migrations/20260815000004_wpgov_01c_provision_scope.sql  (WP-GOV-01C)
  governance/lib/synthesis/  (WP-GOV-01C)
  governance/workers/synthesis-engine.ts  (WP-GOV-01C)
  governance/workers/__tests__/synthesis-engine.test.ts  (WP-GOV-01C)
  supabase/migrations/20260816000000_wpgov_01c_ext.sql (WP-GOV-01C-EXT)
  tests/governance/01c-ext.test.ts (WP-GOV-01C-EXT)
  governance/lib/synthesis/graph.ts (WP-GOV-01C-EXT)

PENDING CERTIFICATION:
  governance/lib/synthesis/crypto.ts (WP-GOV-01D / WP-GOV-01C-EXT)
  governance/lib/synthesis/evaluator.ts (WP-GOV-01D)
  tests/governance/evaluator.test.ts (WP-GOV-01D)

NOT STARTED:
  Release Authorization / Gate (Phase 4), and later phases
```

---

## How to Use This Index

1. **Before starting a work package**: Check status here to confirm it is authorized and its predecessors are certified.
2. **After implementing a work package**: Add implementation evidence to this index under the correct phase row.
3. **After independent audit**: Update status to reflect the audit verdict.
4. **After certification**: Update status to CERTIFIED / FROZEN and add the certification record link.
5. **Never mark a work package CERTIFIED / FROZEN without a linked certification record.**

---

**Document Status**: ACTIVE ENGINEERING GOVERNANCE DOCUMENT  
**Authority**: RC2 ENGINEERING OPERATING CONTROL  
**Last Updated**: 2026-08-13 — WP-GOV-01C-EXT Certified. WP-GOV-01D awaiting certification
