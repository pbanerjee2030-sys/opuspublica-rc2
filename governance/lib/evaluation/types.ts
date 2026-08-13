// governance/lib/evaluation/types.ts
//
// WP-GOV-01D — Certification Evaluation Engine
// Type definitions for the deterministic evaluation contract.
//
// Authority: Installment 2 Engineering Directive §7 (result states),
//            wp-gov-01-engineering-specification.md §6 (CertificationResult),
//            rc2-evidence-snapshot-hash-semantics-decision.md (hash semantics).
//
// The evaluator consumes ONLY certified 01C/01C-EXT outputs. It MUST NOT
// query raw EvidenceProjection or publication evidence tables.

// ─────────────────────────────────────────────────────────────────────────────
// RESULT STATES (directive §7 — exact 5 states)
// ─────────────────────────────────────────────────────────────────────────────

export type CertificationResultState =
  | 'CERTIFIED'           // All required provisions satisfied by sufficient evidence
  | 'NOT_CERTIFIED'       // One or more required provisions violated by contradictory/invalid evidence
  | 'NOT_EVALUABLE'      // Unsupported predicate or malformed evaluation semantics
  | 'INSUFFICIENT_EVIDENCE' // One or more required provisions lack sufficient evidence
  | 'SUPERSEDED';         // A newer evaluation has superseded this result

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFIED INPUT CONTRACT (from 01C/01C-EXT)
// ─────────────────────────────────────────────────────────────────────────────

/** A node in the certified Traceability Graph. */
export interface TraceabilityGraphNode {
  id: string;       // Node identifier (e.g., submission_id, provision_id, decision_id)
  kind: string;     // 'workflow' | 'requirement' | 'evidence' | etc.
  label: string;    // Human-readable label (e.g., 'SUBMISSION', 'PROVISION')
  metadata: Record<string, unknown> | null; // Structured metadata injected by synthesis
}

/** An edge in the certified Traceability Graph. */
export interface TraceabilityGraphEdge {
  id: string;
  fromId: string;
  toId: string;
  kind: string; // 'REQUIRES' | 'EVIDENCES' | 'DECIDES' | 'SUPERSEDES' | 'SATISFIES' | 'CERTIFIED_BY'
}

/** The complete certified input for evaluation. */
export interface EvaluationInput {
  submissionId: string;
  journalId: string;
  evidenceSnapshotHash: string;      // From 01C-EXT (semantic evidence only)
  traceabilityGraphHash: string;    // From 01C (graph topology)
  nodes: TraceabilityGraphNode[];   // All nodes in the submission's subgraph
  edges: TraceabilityGraphEdge[];   // All edges in the submission's subgraph
  provisions: EvaluatedProvision[]; // Active provisions applicable to this journal
}

/** A provision being evaluated, with its journal-scoped parameters. */
export interface EvaluatedProvision {
  id: string;                  // Provision stable ID (e.g., 'SUB-01')
  version: string;             // SemVer
  severity: string;             // 'SEV-1' | 'SEV-2' | 'SEV-3'
  predicate: string;            // Non-executable reference only
  isGlobal: boolean;
  parameters: unknown | null;   // From ProvisionScope.parameters (contains reviewThreshold if applicable)
}

// ─────────────────────────────────────────────────────────────────────────────
// FINDING (per-provision evaluation result detail)
// ─────────────────────────────────────────────────────────────────────────────

export interface Finding {
  findingId: string;            // Deterministic: provisionId + ':' + findingType
  provisionId: string;
  severity: 'SEV-1' | 'SEV-2' | 'SEV-3' | 'INFO';
  type: 'SATISFIED' | 'VIOLATED' | 'EVIDENCE_INSUFFICIENT' | 'CONTRADICTION' | 'STALE' | 'NOT_EVALUABLE' | 'EVALUATOR_ERROR';
  message: string;
  evidenceRefs: string[];       // Node IDs supporting this finding
}

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATION RESULT (directive §10, specification §6.2)
// ─────────────────────────────────────────────────────────────────────────────

export interface CertificationResult {
  // Identity
  certificationId: string;       // Deterministic UUID (hash of inputs)

  // Submission context
  submissionId: string;
  journalId: string;

  // Certified inputs (frozen at evaluation time)
  evidenceSnapshotHash: string;
  traceabilityGraphHash: string;
  provisionSnapshot: Record<string, string>; // provisionId → version
  evaluatorVersion: string;
  policyVersion: string;

  // Verdict
  result: CertificationResultState;
  findings: Finding[];

  // Provenance
  evaluatedAt: string;           // ISO 8601 — operational metadata, NOT in deterministic hash
  supersededBy: string | null;   // certificationId of the superseding result, if SUPERSEDED
}

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATOR VERSION (SemVer)
// ─────────────────────────────────────────────────────────────────────────────

export const EVALUATOR_VERSION = '1.0.0';
export const POLICY_VERSION = '1.0.0';
export const CONSTITUTION_VERSION = '2.0.0';
