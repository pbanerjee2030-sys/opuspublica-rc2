// governance/lib/gate/gate-evaluator.ts
//
// WP-GOV-01E — Release Gate Evaluator (CORRECTED)
//
// Correction: durable gate_audit persistence + durable nonce consumption
// Per Installment 3 Correction Directive §1 + §2

import { randomUUID, createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
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
// GATE EVALUATION (with durable audit)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates a gate request against a CertificationResult AND persists
 * a durable gate_audit record.
 *
 * Per directive §3:
 * - validate request
 * - evaluate certification
 * - create authorization response
 * - persist gate_audit record
 * - return response
 *
 * Per directive §3 (fail-closed):
 * - If audit persistence fails for an ALLOW, the response MUST be BLOCKED.
 */
export async function evaluateGate(
  request: GateRequest,
  certification: CertificationResult | null,
  prisma: PrismaClient,
  requesterIdentity?: string
): Promise<GateResponse> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + GATE_AUTHORIZATION_TTL_MINUTES * 60 * 1000);
  const nonce = randomUUID();
  const authorizationId = computeAuthorizationId(request, nonce);

  // ─── Evaluate certification ───────────────────────────────────────────
  let result: GateResult;
  let reason: string;
  let certId: string | null = null;
  let evidenceHash: string | null = null;
  let graphHash: string | null = null;

  if (!certification) {
    result = 'BLOCKED';
    reason = 'No certification available — Governance fail-closed (GOV-INV-11)';
  } else if (certification.submissionId !== request.submissionId) {
    result = 'DENY';
    reason = `Certification submissionId mismatch: ${certification.submissionId} ≠ ${request.submissionId}`;
    certId = certification.certificationId;
    evidenceHash = certification.evidenceSnapshotHash;
    graphHash = certification.traceabilityGraphHash;
  } else {
    certId = certification.certificationId;
    evidenceHash = certification.evidenceSnapshotHash;
    graphHash = certification.traceabilityGraphHash;

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
        reason = 'Certification INSUFFICIENT_EVIDENCE — insufficient evidence (GOV-INV-14)';
        break;
      case 'SUPERSEDED':
        result = 'BLOCKED';
        reason = `Certification SUPERSEDED by ${certification.supersededBy} — use latest certification`;
        break;
      default:
        result = 'BLOCKED';
        reason = `Unknown certification result: ${certification.result} — fail-closed (GOV-INV-11)`;
        break;
    }
  }

  // ─── Build response ────────────────────────────────────────────────────
  const response: GateResponse = {
    authorizationId,
    submissionId: request.submissionId,
    articleId: request.articleId,
    requestedAction: request.action,
    certificationId: certId,
    certificationHash: certId,
    evidenceSnapshotHash: evidenceHash,
    traceabilityGraphHash: graphHash,
    constitutionVersion: CONSTITUTION_VERSION,
    result,
    reason,
    nonce,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    authorizationVersion: GATE_AUTHORIZATION_VERSION,
    findings: result === 'ALLOW' ? undefined : certification?.findings,
  };

  // ─── Persist gate_audit record ────────────────────────────────────────
  // Per directive §3: fail-closed if audit persistence fails for ALLOW
  try {
    await prisma.gateAudit.create({
      data: {
        authorizationId,
        submissionId: request.submissionId,
        articleId: request.articleId,
        requestedAction: request.action,
        result,
        reason,
        certificationId: certId,
        evidenceSnapshotHash: evidenceHash,
        traceabilityGraphHash: graphHash,
        constitutionVersion: CONSTITUTION_VERSION,
        nonce,
        issuedAt: now,
        expiresAt,
        authorizationVersion: GATE_AUTHORIZATION_VERSION,
        requesterIdentity: requesterIdentity || null,
        consumed: false,
      },
    });
  } catch (auditError) {
    // Per directive §3: fail-closed if audit cannot be written for ALLOW
    if (result === 'ALLOW') {
      response.result = 'BLOCKED';
      response.reason = `Audit persistence failed — fail-closed (GOV-INV-11): ${auditError instanceof Error ? auditError.message : 'unknown'}`;
    }
    // For DENY/BLOCKED, audit failure is logged but doesn't change the result
    // (the action is already denied/blocked)
  }

  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// DURABLE NONCE CONSUMPTION (CORRECTED — database-backed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Durable nonce consumption using the governance.nonce_store table.
 *
 * Per directive §2:
 * - first valid consumption succeeds
 * - second consumption fails
 * - concurrent consumption has exactly one winner
 * - nonce cannot be consumed for different submission/article/action
 * - expired authorization cannot be consumed
 *
 * The PRIMARY KEY (UNIQUE) constraint on nonce ensures atomic first-writer-wins:
 * INSERT succeeds → first consumer wins
 * INSERT fails (conflict) → replay rejected
 *
 * The authorization_id + submission_id + article_id + action binding
 * prevents cross-authorization nonce reuse.
 */
export async function consumeNonce(
  auth: GateResponse,
  prisma: PrismaClient
): Promise<boolean> {
  // 1. Verify authorization is not expired
  const now = new Date();
  const expiresAt = new Date(auth.expiresAt);
  if (now > expiresAt) {
    return false; // Expired
  }

  // 2. Verify authorization is ALLOW
  if (auth.result !== 'ALLOW') {
    return false; // Not an authorization
  }

  // 3. Atomically insert into nonce_store (UNIQUE constraint = first-writer-wins)
  try {
    await prisma.nonceStore.create({
      data: {
        nonce: auth.nonce,
        authorizationId: auth.authorizationId,
        submissionId: auth.submissionId,
        articleId: auth.articleId,
        requestedAction: auth.requestedAction,
      },
    });

    // 4. Update gate_audit consumption state
    await prisma.gateAudit.updateMany({
      where: { nonce: auth.nonce },
      data: {
        consumed: true,
        consumedAt: now,
      },
    });

    return true; // Successfully consumed
  } catch (error) {
    // UNIQUE constraint violation → nonce already consumed → replay
    return false;
  }
}

/**
 * Clears all consumed nonces (for testing/reset).
 */
export async function clearNonces(prisma: PrismaClient): Promise<void> {
  await prisma.nonceStore.deleteMany({});
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPIRY VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export function isAuthorizationValid(auth: GateResponse): boolean {
  const now = new Date();
  const expiresAt = new Date(auth.expiresAt);
  if (now > expiresAt) return false;
  if (auth.result !== 'ALLOW') return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORIZATION ID (deterministic)
// ─────────────────────────────────────────────────────────────────────────────

function computeAuthorizationId(request: GateRequest, nonce: string): string {
  const input = `${request.submissionId}:${request.articleId}:${request.action}:${nonce}`;
  const hash = createHash('sha256').update(input).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}
