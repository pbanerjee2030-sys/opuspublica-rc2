// governance/lib/gate/gate-evaluator.ts
//
// WP-GOV-01E — Release Gate Evaluator (NONCE-BINDING CORRECTED)
//
// Correction: consumeNonce() now verifies caller-supplied context against
// the authoritative persisted gate_audit record BEFORE consuming the nonce.
// The caller can no longer alter submissionId/articleId/requestedAction
// and still consume the nonce.

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

  // Persist gate_audit record
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
    if (result === 'ALLOW') {
      response.result = 'BLOCKED';
      response.reason = `Audit persistence failed — fail-closed (GOV-INV-11): ${auditError instanceof Error ? auditError.message : 'unknown'}`;
    }
  }

  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// DURABLE NONCE CONSUMPTION (NONCE-BINDING CORRECTED)
// ─────────────────────────────────────────────────────────────────────────────
//
// SECURITY CORRECTION:
// consumeNonce() now verifies caller-supplied context against the
// authoritative persisted gate_audit record BEFORE consuming the nonce.
//
// Flow:
// 1. Look up the gate_audit record by authorizationId
// 2. Verify the record exists
// 3. Verify the stored nonce matches the caller-supplied nonce
// 4. Verify the stored submissionId matches the caller-supplied submissionId
// 5. Verify the stored articleId matches the caller-supplied articleId
// 6. Verify the stored requestedAction matches the caller-supplied requestedAction
// 7. Verify the authorization is not expired
// 8. Verify the authorization result is ALLOW
// 9. Atomically insert into nonce_store (UNIQUE PK = first-writer-wins)
// 10. Update gate_audit consumption state
//
// A mismatch at any verification step MUST return false (rejected).
// The caller CANNOT alter context fields and still consume the nonce.

export async function consumeNonce(
  auth: GateResponse,
  prisma: PrismaClient
): Promise<boolean> {
  const now = new Date();

  // Step 1: Look up the authoritative gate_audit record
  const auditRecord = await prisma.gateAudit.findFirst({
    where: { authorizationId: auth.authorizationId },
  });

  // Step 2: Verify the record exists
  if (!auditRecord) {
    return false; // No authoritative record — reject
  }

  // Step 3: Verify the stored nonce matches the caller-supplied nonce
  if (auditRecord.nonce !== auth.nonce) {
    return false; // Nonce mismatch — reject
  }

  // Step 4: Verify the stored submissionId matches
  if (auditRecord.submissionId !== auth.submissionId) {
    return false; // submissionId tampered — reject
  }

  // Step 5: Verify the stored articleId matches
  if (auditRecord.articleId !== auth.articleId) {
    return false; // articleId tampered — reject
  }

  // Step 6: Verify the stored requestedAction matches
  if (auditRecord.requestedAction !== auth.requestedAction) {
    return false; // requestedAction tampered — reject
  }

  // Step 7: Verify not expired
  if (now > auditRecord.expiresAt) {
    return false; // Expired
  }

  // Step 8: Verify result is ALLOW
  if (auditRecord.result !== 'ALLOW') {
    return false; // Not an authorization
  }

  // Step 9: Atomically insert into nonce_store (UNIQUE PK = first-writer-wins)
  try {
    await prisma.nonceStore.create({
      data: {
        nonce: auditRecord.nonce,           // Use AUTHORITATIVE nonce from audit record
        authorizationId: auditRecord.authorizationId,
        submissionId: auditRecord.submissionId,
        articleId: auditRecord.articleId,
        requestedAction: auditRecord.requestedAction,
      },
    });

    // Step 10: Update gate_audit consumption state
    await prisma.gateAudit.update({
      where: { id: auditRecord.id },
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

// ─────────────────────────────────────────────────────────────────────────────
// CLEAR NONCES (for testing/reset)
// ─────────────────────────────────────────────────────────────────────────────

export async function clearNonces(prisma: PrismaClient): Promise<void> {
  await prisma.nonceStore.deleteMany({});
}
