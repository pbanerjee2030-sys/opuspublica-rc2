// governance/lib/gate/publication-enforcer.ts
//
// WP-GOV-01F — Publication Gate Integration (CORRECTED)
//
// Correction: durable nonce consumption via database, not in-memory Set

import {
  type GateResponse,
  type ProtectedAction,
} from './types';
import { isAuthorizationValid, consumeNonce } from './gate-evaluator';
import { PrismaClient } from '@prisma/client';

export interface EnforcementResult {
  allowed: boolean;
  reason: string;
  authorizationId: string;
}

/**
 * Enforces governance authorization before a protected Publication action.
 *
 * Per directive §4:
 * 1. validate authorization
 * 2. verify submission/article/action binding
 * 3. verify expiry
 * 4. atomically consume the durable nonce
 * 5. reject replay
 * 6. preserve audit trail of consumption
 */
export async function enforceGateAuthorization(
  authorization: GateResponse,
  expectedSubmissionId: string,
  expectedArticleId: string,
  expectedAction: ProtectedAction,
  prisma: PrismaClient
): Promise<EnforcementResult> {
  // 1. Verify binding
  if (authorization.submissionId !== expectedSubmissionId) {
    return { allowed: false, reason: `Submission ID mismatch: ${authorization.submissionId} ≠ ${expectedSubmissionId}`, authorizationId: authorization.authorizationId };
  }
  if (authorization.articleId !== expectedArticleId) {
    return { allowed: false, reason: `Article ID mismatch: ${authorization.articleId} ≠ ${expectedArticleId}`, authorizationId: authorization.authorizationId };
  }
  if (authorization.requestedAction !== expectedAction) {
    return { allowed: false, reason: `Action mismatch: ${authorization.requestedAction} ≠ ${expectedAction}`, authorizationId: authorization.authorizationId };
  }

  // 2. Verify result is ALLOW
  if (authorization.result !== 'ALLOW') {
    return { allowed: false, reason: `Gate result is ${authorization.result}, not ALLOW`, authorizationId: authorization.authorizationId };
  }

  // 3. Verify not expired
  if (!isAuthorizationValid(authorization)) {
    return { allowed: false, reason: `Authorization expired (expires at ${authorization.expiresAt})`, authorizationId: authorization.authorizationId };
  }

  // 4. For PUBLISH/ARCHIVE: durable nonce consumption (single-use)
  if (expectedAction === 'PUBLISH' || expectedAction === 'ARCHIVE') {
    const consumed = await consumeNonce(authorization, prisma);
    if (!consumed) {
      return { allowed: false, reason: `Nonce already consumed — replay rejected`, authorizationId: authorization.authorizationId };
    }
  }

  // 5. All checks passed
  return { allowed: true, reason: 'Authorized', authorizationId: authorization.authorizationId };
}
