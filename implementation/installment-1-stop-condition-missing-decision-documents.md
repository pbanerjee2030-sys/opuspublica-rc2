# Installment 1 — Stop Condition Report: Missing Authoritative Decision Documents

**Document type:** Stop Condition Report (§13)
**Authority:** OPUS PUBLICA RC2 INSTALLMENT 1 ENGINEERING DIRECTIVE §13
**Date:** 13 August 2026
**Branch:** `feature/installment-1-rc2-stabilization` (created from `main` at `dd50588`)
**Stop condition:** §13 — "A missing file requires invented semantics."

---

## 1. Blocker

Four documents listed in §11.1 ("Provide now — required Installment 1 sources") as authoritative sources for Installment 1 do NOT exist in the GitHub repository on any branch, PR head, or ref.

---

## 2. Evidence

Exhaustive search performed across:
- `origin/heads/main`
- `origin/heads/wp-gov-01a-certification`
- `origin/heads/wp-gov-01b-certification`
- `origin/heads/wp-gov-01c-certification`
- `origin/heads/wp-gov-01c-ext-certification`
- `origin/pull/1/head`
- `origin/pull/2/head`
- `origin/pull/3/head`
- All 83 files in `implementation/` on `main` (listed and checked)

### Missing documents

| # | Document (per §11.1) | Search result | Authority role (per §2) |
|---|---|---|---|
| 1 | `rc2-evidence-snapshot-hash-semantics-decision.md` | NOT FOUND on any branch/PR/ref | Decision record — defines the exact evidenceSnapshotHash semantics (priority 3 in §2) |
| 2 | `wp-gov-01c-ext-hash-correction-independent-review.md` | NOT FOUND on any branch/PR/ref | Independent review — defines the approved correction scope (priority 3-4 in §2) |
| 3 | `rc2-post-dependabot-baseline-defect-review.md` | NOT FOUND on any branch/PR/ref | Defect review — defines post-dependabot baseline state (priority 5 in §2) |
| 4 | `rc2-baseline-correction-implementation-report.md` | NOT FOUND on any branch/PR/ref | Implementation report — defines baseline correction (priority 5 in §2) |

### What DOES exist (closest matches)

The following documents exist and are related but are NOT the ones referenced:
- `implementation/wp-gov-01c-ext-certification-record.md` — exists; contains the Frozen Contract but NOT the hash-semantics decision
- `implementation/wp-gov-01c-ext-implementation-report.md` — exists; describes the implementation but NOT the independent review
- `implementation/wp-gov-01c-ext-independent-adversarial-certification-review.md` — exists; this is a DIFFERENT document (adversarial review, not "hash-correction independent review")
- `implementation/wp-gov-01c-ext-regression-reconciliation.md` — exists; regression reconciliation, not the decision document

---

## 3. Impacted Boundary

**Track B — 01C-EXT hash correction (§3.2).**

The directive §3.2 says:
> - Remove infrastructure EvidenceProjection IDs from the evidenceSnapshotHash digest material.
> - Use the already-certified canonicalization implementation from the existing Governance ingestion layer.
> - Do not recreate a standalone crypto abstraction when the certified canonicalization utility can be used directly.

This describes the correction at a high level. However, the directive §2 (Authority & Decision Hierarchy) places "Certification records / decision records" at priority 3 and "Current approved correction directives" at priority 4 — ABOVE "Implementation reports" (priority 5). The two missing decision documents (`rc2-evidence-snapshot-hash-semantics-decision.md` and `wp-gov-01c-ext-hash-correction-independent-review.md`) are the priority-3/4 authorities that define the EXACT approved semantics.

Without these documents, engineering cannot verify that the correction it applies matches the APPROVED semantics — it can only infer the semantics from the directive's prose and from the existing code. This is the §13 stop condition: "A missing file requires invented semantics."

The previous Phase 1 work applied the correction based on the directive's prose (which says "infrastructure IDs excluded from digest, IDs may remain sorting tie-breakers"). The independent audit (§Phase 1 Independent Governance Audit) confirmed the correction was correctly applied per the directive's prose. But the audit ALSO noted these two decision documents were missing and flagged it as a gap.

---

## 4. Decision Required from RC2 Engineering Governance

The governance authority must rule on ONE of the following:

### Option A — Provide the missing documents
If the four documents exist on the certifying engineer's local machine or in a private archive, provide them (commit to the repository or share their content). Engineering will then verify the applied correction matches the approved semantics and proceed.

### Option B — Confirm the directive's prose IS the sole authority
If the four documents were never created (i.e., the directive §3.2 and §4's F-01 ruling ARE the complete authority for the hash correction), governance must confirm this explicitly. Engineering will then proceed with the correction as applied in the previous Phase 1 work, treating the directive's prose as the priority-4 authority.

### Option C — Authorize engineering to proceed without the documents
If the documents are lost and governance accepts the previous Phase 1 correction as the de facto approved semantics, governance must explicitly authorize this. Engineering will proceed, noting in the handover that the decision documents were absent and the directive's prose was the sole authority.

---

## 5. Engineering Position

Engineering is STOPPED per §13. The feature branch `feature/installment-1-rc2-stabilization` has been created from `main` at `dd50588` per §10. No implementation work has begun. The worktree is clean.

The previous Phase 1 work (from the earlier engineering sandbox) is available as reference. It applied the hash correction per the directive's prose and passed the independent audit with "CORRECTION REQUIRED" status (2 code corrections: delete `crypto.ts`, convert `jest.*` to `vi.*`). If governance rules Option B or C, engineering can proceed immediately by:
1. Applying the 2 corrections from the audit
2. Running the test matrix in Docker (if available)
3. Producing the handover

If governance rules Option A, engineering will first verify the applied correction against the provided documents before proceeding.

---

## 6. No Improvisation

Per §13: "When a stop condition occurs, do not improvise. Record the precise blocker, the evidence, the impacted boundary and the decision required from RC2 Engineering Governance."

This document IS that record. Engineering will not proceed until governance rules on Options A/B/C.

**Branch:** `feature/installment-1-rc2-stabilization`
**Base commit:** `dd50588e63c91c9286a8de53f3dea25102032d78`
**Worktree status:** CLEAN (no changes)
**Engineering status:** STOPPED — awaiting governance decision

STOP.
