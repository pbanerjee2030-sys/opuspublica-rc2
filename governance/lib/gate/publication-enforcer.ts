// governance/lib/gate/publication-enforcer.ts
//
// WP-GOV-01F — Publication Gate Integration
//
// Authority: wp-gov-01-engineering-spec.md §8 (Release Authorization)
//            Installment 3 Directive §PHASE C
//
// Publication enforcement:
// - Verifies valid governance authorization before protected actions
// - Denies invalid/non-certifying outcomes
// - Rejects expired/replayed authorization
// - Fails closed when Governance is unavailable
// - Does NOT give Governance permission to mutate Publication state

import {
  type GateResponse,
  type ProtectedAction,
} from './types';
import { isAuthorizationValid, consumeNonce } from './gate-evaluator';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLICATION ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface EnforcementResult {
  allowed: boolean;
  reason: string;
  authorizationId: string;
}

/**
 * Enforces governance authorization before a protected Publication action.
 *
 * Per GOV-INV-02: Governance never mutates Publication state.
 * This function is called BY Publication code (not by Governance code).
 * Publication passes the authorization it received from the gate API;
 * this function verifies it is valid and unexpired.
 *
 * Per GOV-INV-11: Protected release actions fail closed when Governance unavailable.
 */
export function enforceGateAuthorization(
  authorization: GateResponse,
  expectedSubmissionId: string,
  expectedArticleId: string,
  expectedAction: ProtectedAction
): EnforcementResult {
  // 1. Verify the authorization is for the correct submission/article/action
  if (authorization.submissionId !== expectedSubmissionId) {
    return {
      allowed: false,
      reason: `Submission ID mismatch: ${authorization.submissionId} ≠ ${expectedSubmissionId}`,
      authorizationId: authorization.authorizationId,
    };
  }

  if (authorization.articleId !== expectedArticleId) {
    return {
      allowed: false,
      reason: `Article ID mismatch: ${authorization.articleId} ≠ ${expectedArticleId}`,
      authorizationId: authorization.authorizationId,
    };
  }

  if (authorization.requestedAction !== expectedAction) {
    return {
      allowed: false,
      reason: `Action mismatch: ${authorization.requestedAction} ≠ ${expectedAction}`,
      authorizationId: authorization.authorizationId,
    };
  }

  // 2. Verify the authorization result is ALLOW
  if (authorization.result !== 'ALLOW') {
    return {
      allowed: false,
      reason: `Gate result is ${authorization.result}, not ALLOW`,
      authorizationId: authorization.authorizationId,
    };
  }

  // 3. Verify the authorization has not expired
  if (!isAuthorizationValid(authorization)) {
    return {
      allowed: false,
      reason: `Authorization expired (expires at ${authorization.expiresAt})`,
      authorizationId: authorization.authorizationId,
    };
  }

  // 4. Verify and consume the nonce (single-use for PUBLISH and ARCHIVE)
  if (expectedAction === 'PUBLISH' || expectedAction === 'ARCHIVE') {
    if (!consumeNonce(authorization.nonce)) {
      return {
        allowed: false,
        reason: `Nonce already consumed — replay rejected`,
        authorizationId: authorization.authorizationId,
      };
    }
  }

  // 5. All checks passed — action is authorized
  return {
    allowed: true,
    reason: 'Authorized',
    authorizationId: authorization.authorizationId,
  };
}
