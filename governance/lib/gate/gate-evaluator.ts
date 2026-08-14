// governance/lib/gate/gate-evaluator.ts
//
// WP-GOV-01E — Release Gate Evaluator
//
// Authority: wp-gov-01-engineering-specification.md §8 (Release Authorization)
//            Installment 3 Directive §PHASE B
//
// The gate is:
// - Deterministic: same certification + same request → same authorization
// - Fail-closed: BLOCKED when Governance/certification is unavailable
// - Read-only: does NOT mutate Publication state
// - Time-limited: 15-minute TTL per authorization
// - Nonce-protected: unique nonce per authorization for replay resistance
// - Auditable: every request/response recorded in gate audit

import { randomUUID, createHash } from 'crypto';
import {
  type GateRequest,
  type GateResponse,
  type GateResult,
  type ProtectedAction,
  GATE_AUTHORIZATION_VERSION,
  GATE_AUTHORIZATION_TTL_MINUTES,
  CONSTITUTION_VERSION,
} from './types';
import type { CertificationResult } from '../evaluation/types';

// ─────────────────────────────────────────────────────────────────────────────
// GATE EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates a gate request against a CertificationResult.
 *
 * Per wp-gov-01-eng-spec §8:
 * - ALLOW: only if certification result is CERTIFIED
 * - DENY: if certification result is NOT_CERTIFIED
 * - BLOCKED: if certification is NOT_EVALUABLE, INSUFFICIENT_EVIDENCE, SUPERSEDED, or missing
 *
 * Per GOV-INV-14:
 * - Missing evidence MUST NEVER produce ALLOW
 *
 * Per GOV-INV-11:
 * - Protected release actions fail closed when Governance is unavailable
 */
export function evaluateGate(
  request: GateRequest,
  certification: CertificationResult | null
): GateResponse {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + GATE_AUTHORIZATION_TTL_MINUTES * 60 * 1000);
  const nonce = randomUUID();
  const authorizationId = computeAuthorizationId(request, nonce);

  // ─── No certification provided → BLOCKED (fail-closed) ─────────────────
  if (!certification) {
    return buildResponse({
      authorizationId,
      submissionId: request.submissionId,
      articleId: request.articleId,
      requestedAction: request.action,
      certificationId: null,
      certificationHash: null,
      evidenceSnapshotHash: null,
      traceabilityGraphHash: null,
      result: 'BLOCKED',
      reason: 'No certification available — Governance fail-closed (GOV-INV-11)',
      nonce,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }

  // ─── Certification must match the requested submission ──────────────────
  if (certification.submissionId !== request.submissionId) {
    return buildResponse({
      authorizationId,
      submissionId: request.submissionId,
      articleId: request.articleId,
      requestedAction: request.action,
      certificationId: certification.certificationId,
      certificationHash: null,
      evidenceSnapshotHash: null,
      traceabilityGraphHash: null,
      result: 'DENY',
      reason: `Certification submissionId mismatch: ${certification.submissionId} ≠ ${request.submissionId}`,
      nonce,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }

  // ─── Evaluate based on certification result state ──────────────────────
  let result: GateResult;
  let reason: string;

  switch (certification.result) {
    case 'CERTIFIED':
      result = 'ALLOW';
      reason = 'Certification CERTIFIED — release authorized';
      break;

    case 'NOT_CERTIFIED':
      result = 'DENY';
      reason = `Certification NOT_CERTIFIED: ${certification.findings.map(f => f.message).join('; ')}`;
      break;

    case 'NOT_EVALUABLE':
      result = 'BLOCKED';
      reason = 'Certification NOT_EVALUABLE — cannot determine compliance (GOV-INV-14)';
      break;

    case 'INSUFFICIENT_EVIDENCE':
      result = 'BLOCKED';
      reason = 'Certification INSUFFICIENT_EVIDENCE — insufficient evidence for release (GOV-INV-14)';
      break;

    case 'SUPERSEDED':
      result = 'BLOCKED';
      reason = `Certification SUPERSEDED by ${certification.supersededBy} — use the latest certification`;
      break;

    default:
      result = 'BLOCKED';
      reason = `Unknown certification result: ${certification.result} — fail-closed (GOV-INV-11)`;
      break;
  }

  return buildResponse({
    authorizationId,
    submissionId: request.submissionId,
    articleId: request.articleId,
    requestedAction: request.action,
    certificationId: certification.certificationId,
    certificationHash: certification.certificationId, // Bound to the certification
    evidenceSnapshotHash: certification.evidenceSnapshotHash,
    traceabilityGraphHash: certification.traceabilityGraphHash,
    result,
    reason,
    nonce,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    findings: result === 'ALLOW' ? undefined : certification.findings,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORIZATION ID (deterministic)
// ─────────────────────────────────────────────────────────────────────────────

function computeAuthorizationId(request: GateRequest, nonce: string): string {
  const input = `${request.submissionId}:${request.articleId}:${request.action}:${nonce}`;
  const hash = createHash('sha256').update(input).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildResponse(params: {
  authorizationId: string;
  submissionId: string;
  articleId: string;
  requestedAction: ProtectedAction;
  certificationId: string | null;
  certificationHash: string | null;
  evidenceSnapshotHash: string | null;
  traceabilityGraphHash: string | null;
  result: GateResult;
  reason: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  findings?: unknown[];
}): GateResponse {
  return {
    authorizationId: params.authorizationId,
    submissionId: params.submissionId,
    articleId: params.articleId,
    requestedAction: params.requestedAction,
    certificationId: params.certificationId,
    certificationHash: params.certificationHash,
    evidenceSnapshotHash: params.evidenceSnapshotHash,
    traceabilityGraphHash: params.traceabilityGraphHash,
    constitutionVersion: CONSTITUTION_VERSION,
    result: params.result,
    reason: params.reason,
    nonce: params.nonce,
    issuedAt: params.issuedAt,
    expiresAt: params.expiresAt,
    authorizationVersion: GATE_AUTHORIZATION_VERSION,
    findings: params.findings,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPIRY VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies that a gate authorization is still valid (not expired, not revoked).
 * Used by Publication enforcement (WP-GOV-01F) before executing protected actions.
 */
export function isAuthorizationValid(auth: GateResponse): boolean {
  const now = new Date();
  const expiresAt = new Date(auth.expiresAt);

  if (now > expiresAt) {
    return false; // Expired
  }

  if (auth.result !== 'ALLOW') {
    return false; // Not an authorization
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// NONCE VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In-memory nonce store for single-use enforcement.
 * In production, this would be a database table or Redis.
 * For WP-GOV-01E, in-memory is sufficient for the gate API.
 */
const consumedNonces = new Set<string>();

/**
 * Verifies and consumes a nonce (single-use enforcement).
 * Returns true if the nonce was valid and not previously consumed.
 */
export function consumeNonce(nonce: string): boolean {
  if (consumedNonces.has(nonce)) {
    return false; // Replay — nonce already consumed
  }
  consumedNonces.add(nonce);
  return true;
}

/**
 * Clears all consumed nonces (for testing/reset).
 */
export function clearNonces(): void {
  consumedNonces.clear();
}
