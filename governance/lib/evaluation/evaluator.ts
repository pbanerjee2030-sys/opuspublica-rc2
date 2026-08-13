// governance/lib/evaluation/evaluator.ts
//
// WP-GOV-01D — Certification Evaluation Engine
//
// Authority: Installment 2 Engineering Directive
//            wp-gov-01-engineering-specification.md §6 (Certification Engine)
//            rc2-evidence-snapshot-hash-semantics-decision.md (hash semantics)
//            wp-gov-01c-ext-final-certification-record.md (frozen input contract)
//
// The evaluator is a DETERMINISTIC, pure-function engine that consumes
// ONLY certified 01C/01C-EXT outputs (Traceability Graph nodes/edges,
// evidenceSnapshotHash, traceabilityGraphHash, ProvisionScope parameters).
//
// It MUST NOT:
// - Query raw EvidenceProjection
// - Query publication tables
// - Execute arbitrary predicates
// - Depend on wall-clock time, random UUIDs, or insertion order
// - Re-synthesize evidence
//
// The evaluation is based on the graph structure: counting REVIEW nodes,
// checking DECISION state, verifying SUPMISSION existence, and comparing
// review count against the journal-scoped reviewThreshold.

import { createHash } from 'crypto';
import { canonicalizeJson } from '../ingestion/hash';
import {
  type EvaluationInput,
  type CertificationResult,
  type CertificationResultState,
  type Finding,
  type TraceabilityGraphNode,
  type TraceabilityGraphEdge,
  EVALUATOR_VERSION,
  POLICY_VERSION,
  CONSTITUTION_VERSION,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes a deterministic certification ID from the evaluation inputs.
 * This is NOT a random UUID — it's a SHA-256-derived deterministic identifier.
 * Same inputs → same certificationId. Different inputs → different certificationId.
 *
 * The hash excludes `evaluatedAt` (operational metadata) per directive §6.
 */
export function computeCertificationId(input: EvaluationInput): string {
  const canonicalInput = [
    input.submissionId,
    input.journalId,
    input.evidenceSnapshotHash,
    input.traceabilityGraphHash,
    canonicalizeJson(input.provisions.map(p => ({ id: p.id, version: p.version })).sort((a, b) => a.id.localeCompare(b.id))),
    EVALUATOR_VERSION,
    POLICY_VERSION,
  ].join('');

  const hash = createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
  // Format as UUID v5-style (deterministic, not random)
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GRAPH NAVIGATION HELPERS (pure, no DB access)
// ─────────────────────────────────────────────────────────────────────────────

function findNode(nodes: TraceabilityGraphNode[], id: string): TraceabilityGraphNode | undefined {
  return nodes.find(n => n.id === id);
}

function findNodesByKind(nodes: TraceabilityGraphNode[], kind: string): TraceabilityGraphNode[] {
  return nodes.filter(n => n.kind === kind);
}

function findNodesByLabel(nodes: TraceabilityGraphNode[], label: string): TraceabilityGraphNode[] {
  return nodes.filter(n => n.label === label);
}

function findEdges(edges: TraceabilityGraphEdge[], fromId: string, kind: string): TraceabilityGraphEdge[] {
  return edges.filter(e => e.fromId === fromId && e.kind === kind);
}

function findEdgesTo(edges: TraceabilityGraphEdge[], toId: string, kind: string): TraceabilityGraphEdge[] {
  return edges.filter(e => e.toId === toId && e.kind === kind);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSION NODE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function validateSubmissionNode(
  input: EvaluationInput,
  findings: Finding[]
): TraceabilityGraphNode | null {
  const submissionNode = input.nodes.find(n => n.id === input.submissionId && n.label === 'SUBMISSION');

  if (!submissionNode) {
    findings.push({
      findingId: 'SUBMISSION:MISSING',
      provisionId: 'SUBMISSION',
      severity: 'SEV-1',
      type: 'EVIDENCE_INSUFFICIENT',
      message: 'SUBMISSION node not found in traceability graph',
      evidenceRefs: [],
    });
    return null;
  }

  findings.push({
    findingId: 'SUBMISSION:EXISTS',
    provisionId: 'SUBMISSION',
    severity: 'INFO',
    type: 'SATISFIED',
    message: 'SUBMISSION node exists in traceability graph',
    evidenceRefs: [submissionNode.id],
  });

  return submissionNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW COUNT EVALUATION (SUB-01)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates the review count against the journal-scoped reviewThreshold.
 *
 * Per directive §8-9 (SUB-01):
 * - reviewThreshold MUST come from ProvisionScope.parameters
 * - Never assume N >= 1 as fallback
 * - If N is unavailable or malformed → NOT_EVALUABLE
 *
 * Per wp-gov-01-engineering-specification.md §3.3.3:
 * - At least N ReviewSubmitted events are required
 * - Reviews are identified via EVIDENCES edges to the SUBMISSION node
 */
function evaluateReviewCount(
  input: EvaluationInput,
  submissionNode: TraceabilityGraphNode,
  findings: Finding[]
): 'SATISFIED' | 'VIOLATED' | 'INSUFFICIENT_EVIDENCE' | 'NOT_EVALUABLE' {
  // Count REVIEW evidence nodes connected to the submission via EVIDENCES edges
  const evidencesEdges = findEdges(input.edges, submissionNode.id, 'EVIDENCES');
  // Also check reverse direction — REVIEW → SUBMISSION via EVIDENCES
  const evidencesToSubmission = findEdgesTo(input.edges, submissionNode.id, 'EVIDENCES');

  // The synthesis engine creates edges as: REVIEW → SUBMISSION (EVIDENCES)
  // So we look for edges where toId === submissionId and kind === EVIDENCES
  const reviewEvidenceEdges = [...evidencesEdges, ...evidencesToSubmission];

  // Find the REVIEW nodes (evidence nodes that EVIDENCE the submission)
  const reviewNodeIds = new Set<string>();
  for (const edge of reviewEvidenceEdges) {
    // The REVIEW node is the source of the EVIDENCES edge
    const sourceId = edge.fromId === submissionNode.id ? edge.toId : edge.fromId;
    const sourceNode = findNode(input.nodes, sourceId);
    if (sourceNode && sourceNode.label === 'REVIEW') {
      reviewNodeIds.add(sourceId);
    }
  }

  const reviewCount = reviewNodeIds.size;

  // Find the provision that defines the review threshold
  // Per the specification, SUB-01 provisions are connected via REQUIRES edges
  const requiresEdges = findEdges(input.edges, submissionNode.id, 'REQUIRES');
  // Also check: REQUIRES edges TO the submission (reverse direction from synthesis)
  const requiresToSubmission = findEdgesTo(input.edges, submissionNode.id, 'REQUIRES');

  // Find all provisions connected via REQUIRES
  const provisionIds = new Set<string>();
  for (const edge of [...requiresEdges, ...requiresToSubmission]) {
    const provisionId = edge.fromId === submissionNode.id ? edge.toId : edge.fromId;
    const provisionNode = findNode(input.nodes, provisionId);
    if (provisionNode && provisionNode.label === 'PROVISION') {
      provisionIds.add(provisionId);
    }
  }

  // For each applicable provision, extract reviewThreshold from its metadata
  // The synthesis engine injects: provMetadata = { version, severity, parameters }
  let reviewThreshold: number | null = null;
  let thresholdProvisionId: string | null = null;

  for (const provision of input.provisions) {
    // Check if this provision is connected via REQUIRES
    if (!provisionIds.has(provision.id)) continue;

    // Extract reviewThreshold from parameters
    // The parameters come from ProvisionScope.parameters (injected by 01C-EXT)
    const params = provision.parameters as { reviewThreshold?: unknown } | null;
    if (params && typeof params.reviewThreshold === 'number') {
      reviewThreshold = params.reviewThreshold;
      thresholdProvisionId = provision.id;
      break;
    }
  }

  // If we didn't find threshold via provisions, check node metadata directly
  if (reviewThreshold === null) {
    for (const provisionId of provisionIds) {
      const node = findNode(input.nodes, provisionId);
      if (node && node.metadata) {
        const meta = node.metadata as { parameters?: { reviewThreshold?: unknown } };
        if (meta.parameters && typeof meta.parameters.reviewThreshold === 'number') {
          reviewThreshold = meta.parameters.reviewThreshold;
          thresholdProvisionId = provisionId;
          break;
        }
      }
    }
  }

  // Per directive §8: Never assume N >= 1 as fallback
  if (reviewThreshold === null) {
    findings.push({
      findingId: 'SUB-01:NO_THRESHOLD',
      provisionId: thresholdProvisionId || 'SUB-01',
      severity: 'SEV-1',
      type: 'NOT_EVALUABLE',
      message: 'reviewThreshold not found in ProvisionScope.parameters — cannot evaluate review count',
      evidenceRefs: [],
    });
    return 'NOT_EVALUABLE';
  }

  // Per directive §8: validate structurally
  if (!Number.isInteger(reviewThreshold) || reviewThreshold < 1) {
    findings.push({
      findingId: 'SUB-01:INVALID_THRESHOLD',
      provisionId: thresholdProvisionId || 'SUB-01',
      severity: 'SEV-1',
      type: 'NOT_EVALUABLE',
      message: `reviewThreshold is structurally invalid: ${reviewThreshold} (must be integer >= 1)`,
      evidenceRefs: [],
    });
    return 'NOT_EVALUABLE';
  }

  // Evaluate: review count vs threshold
  if (reviewCount >= reviewThreshold) {
    findings.push({
      findingId: 'SUB-01:SATISFIED',
      provisionId: thresholdProvisionId || 'SUB-01',
      severity: 'INFO',
      type: 'SATISFIED',
      message: `Review count ${reviewCount} >= threshold ${reviewThreshold}`,
      evidenceRefs: Array.from(reviewNodeIds),
    });
    return 'SATISFIED';
  } else {
    findings.push({
      findingId: 'SUB-01:INSUFFICIENT',
      provisionId: thresholdProvisionId || 'SUB-01',
      severity: 'SEV-2',
      type: 'EVIDENCE_INSUFFICIENT',
      message: `Review count ${reviewCount} < threshold ${reviewThreshold}`,
      evidenceRefs: Array.from(reviewNodeIds),
    });
    return 'INSUFFICIENT_EVIDENCE';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DECISION EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates the editorial decision state.
 *
 * Per wp-gov-01-engineering-specification.md §3.3.3:
 * - Exactly one non-superseded DecisionRecorded with decision = 'Accept'
 *
 * Per §5.6:
 * - Contradictions (Accept + Reject reviews) are FINDINGS but don't auto-FAIL
 * - The editorial decision is constitutionally authoritative
 */
function evaluateDecision(
  input: EvaluationInput,
  submissionNode: TraceabilityGraphNode,
  findings: Finding[]
): 'SATISFIED' | 'VIOLATED' | 'INSUFFICIENT_EVIDENCE' {
  // Find DECISION nodes connected to the submission via DECIDES
  const decidesEdges = findEdgesTo(input.edges, submissionNode.id, 'DECIDES');
  const decisionNodeIds = decidesEdges.map(e => e.fromId).filter(id => id !== submissionNode.id);

  if (decisionNodeIds.length === 0) {
    findings.push({
      findingId: 'DECISION:MISSING',
      provisionId: 'DECISION',
      severity: 'SEV-1',
      type: 'EVIDENCE_INSUFFICIENT',
      message: 'No DECISION node found for submission',
      evidenceRefs: [],
    });
    return 'INSUFFICIENT_EVIDENCE';
  }

  // Check for superseded decisions (SUPERSEDES edges)
  const supersededIds = new Set<string>();
  for (const decId of decisionNodeIds) {
    const supersededEdges = findEdges(input.edges, decId, 'SUPERSEDES');
    for (const edge of supersededEdges) {
      supersededIds.add(edge.toId);
    }
  }

  // Active (non-superseded) decisions
  const activeDecisionIds = decisionNodeIds.filter(id => !supersededIds.has(id));

  if (activeDecisionIds.length === 0) {
    findings.push({
      findingId: 'DECISION:ALL_SUPERSEDED',
      provisionId: 'DECISION',
      severity: 'SEV-1',
      type: 'EVIDENCE_INSUFFICIENT',
      message: 'All decisions are superseded — no active decision',
      evidenceRefs: decisionNodeIds,
    });
    return 'INSUFFICIENT_EVIDENCE';
  }

  if (activeDecisionIds.length > 1) {
    findings.push({
      findingId: 'DECISION:MULTIPLE_ACTIVE',
      provisionId: 'DECISION',
      severity: 'SEV-2',
      type: 'CONTRADICTION',
      message: `Multiple active decisions: ${activeDecisionIds.length}`,
      evidenceRefs: activeDecisionIds,
    });
    // Per specification, this is a contradiction but the first active decision is used
  }

  // Evaluate the active decision state
  const activeDecisionNode = findNode(input.nodes, activeDecisionIds[0]);
  if (!activeDecisionNode || !activeDecisionNode.metadata) {
    findings.push({
      findingId: 'DECISION:NO_STATE',
      provisionId: 'DECISION',
      severity: 'SEV-1',
      type: 'EVIDENCE_INSUFFICIENT',
      message: 'Active decision node has no metadata/state',
      evidenceRefs: activeDecisionIds,
    });
    return 'INSUFFICIENT_EVIDENCE';
  }

  const decisionState = activeDecisionNode.metadata as { state?: { decision?: string } };
  const decision = decisionState.state?.decision;

  if (decision === 'Accept') {
    findings.push({
      findingId: 'DECISION:ACCEPTED',
      provisionId: 'DECISION',
      severity: 'INFO',
      type: 'SATISFIED',
      message: 'Active decision is Accept',
      evidenceRefs: activeDecisionIds,
    });
    return 'SATISFIED';
  } else {
    findings.push({
      findingId: 'DECISION:NOT_ACCEPT',
      provisionId: 'DECISION',
      severity: 'SEV-1',
      type: 'VIOLATED',
      message: `Active decision is '${decision}' — not Accept`,
      evidenceRefs: activeDecisionIds,
    });
    return 'VIOLATED';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EVALUATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates a submission against the certified Traceability Graph.
 *
 * This is the entry point for WP-GOV-01D.
 *
 * Per directive §4: consumes ONLY certified 01C/01C-EXT outputs.
 * Per directive §5: MUST NOT query raw EvidenceProjection.
 * Per directive §6: deterministic — same inputs → same substantive result.
 * Per directive §7: supports exactly 5 result states.
 * Per directive §8: predicate execution is NOT allowed.
 *
 * @returns CertificationResult with deterministic identity and verdict.
 */
export function evaluate(input: EvaluationInput): CertificationResult {
  const findings: Finding[] = [];

  // ─── 1. Validate SUBMISSION node ────────────────────────────────────────
  const submissionNode = validateSubmissionNode(input, findings);

  if (!submissionNode) {
    // No submission — cannot evaluate anything
    return buildResult(input, 'INSUFFICIENT_EVIDENCE', findings);
  }

  // ─── 2. Evaluate review count (SUB-01) ────────────────────────────────
  const reviewResult = evaluateReviewCount(input, submissionNode, findings);

  // ─── 3. Evaluate decision state ────────────────────────────────────────
  const decisionResult = evaluateDecision(input, submissionNode, findings);

  // ─── 4. Determine overall verdict ──────────────────────────────────────
  // Per directive §7 and specification §6.1:
  // - CERTIFIED: all required provisions satisfied
  // - NOT_CERTIFIED: one or more provisions violated
  // - NOT_EVALUABLE: unsupported predicate or malformed semantics
  // - INSUFFICIENT_EVIDENCE: one or more provisions lack sufficient evidence
  // - SUPERSEDED: set later when a newer evaluation supersedes this one

  const hasNotEvaluatable = findings.some(f => f.type === 'NOT_EVALUABLE');
  const hasViolated = findings.some(f => f.type === 'VIOLATED');
  const hasInsufficient = findings.some(f => f.type === 'EVIDENCE_INSUFFICIENT');

  let result: CertificationResultState;

  if (hasNotEvaluatable) {
    result = 'NOT_EVALUABLE';
  } else if (hasViolated) {
    result = 'NOT_CERTIFIED';
  } else if (hasInsufficient) {
    result = 'INSUFFICIENT_EVIDENCE';
  } else {
    result = 'CERTIFIED';
  }

  return buildResult(input, result, findings);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildResult(
  input: EvaluationInput,
  result: CertificationResultState,
  findings: Finding[]
): CertificationResult {
  const provisionSnapshot: Record<string, string> = {};
  for (const p of input.provisions) {
    provisionSnapshot[p.id] = p.version;
  }

  const certificationId = computeCertificationId(input);

  return {
    certificationId,
    submissionId: input.submissionId,
    journalId: input.journalId,
    evidenceSnapshotHash: input.evidenceSnapshotHash,
    traceabilityGraphHash: input.traceabilityGraphHash,
    provisionSnapshot,
    evaluatorVersion: EVALUATOR_VERSION,
    policyVersion: POLICY_VERSION,
    result,
    findings: findings.sort((a, b) => a.findingId.localeCompare(b.findingId)),
    evaluatedAt: new Date().toISOString(), // Operational metadata — NOT in deterministic hash
    supersededBy: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPERSESSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marks a CertificationResult as SUPERSEDED by a newer result.
 *
 * Per directive §11/§13:
 * - Historical certification meaning must NOT be silently rewritten
 * - The superseded result retains provenance and reference to the superseding result
 * - Supersession is non-destructive — the old result is marked, not deleted
 *
 * @returns a NEW CertificationResult with result='SUPERSEDED' and supersededBy set.
 *           The original result is NOT mutated.
 */
export function markSuperseded(
  original: CertificationResult,
  supersedingId: string
): CertificationResult {
  return {
    ...original,
    result: 'SUPERSEDED',
    supersededBy: supersedingId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies that two evaluations of the same input produce the same
 * certificationId and the same result state.
 *
 * Per directive §6: For identical certified inputs, the substantive evaluation
 * MUST be deterministic.
 */
export function verifyDeterminism(
  input: EvaluationInput,
  result1: CertificationResult,
  result2: CertificationResult
): boolean {
  return (
    result1.certificationId === result2.certificationId &&
    result1.result === result2.result &&
    result1.evidenceSnapshotHash === result2.evidenceSnapshotHash &&
    result1.traceabilityGraphHash === result2.traceabilityGraphHash
  );
}
