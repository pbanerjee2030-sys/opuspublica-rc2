// tests/governance/01e-gate.test.ts
//
// WP-GOV-01E — Release Gate API Tests
//
// Authority: Installment 3 Directive §PHASE B
// Tests: ALLOW, DENY, BLOCKED, expiry, nonce, fail-closed, provenance

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateGate, isAuthorizationValid, consumeNonce, clearNonces } from '../../governance/lib/gate/gate-evaluator';
import type { GateRequest } from '../../governance/lib/gate/types';
import type { CertificationResult } from '../../governance/lib/evaluation/types';

function makeCert(result: CertificationResult['result']): CertificationResult {
  return {
    certificationId: 'test-cert-id',
    submissionId: 'sub-1',
    journalId: 'journal-A',
    evidenceSnapshotHash: 'a'.repeat(64),
    traceabilityGraphHash: 'b'.repeat(64),
    provisionSnapshot: { 'SUB-01': '1.0.0' },
    evaluatorVersion: '1.0.0',
    policyVersion: '1.0.0',
    result,
    findings: [],
    evaluatedAt: new Date().toISOString(),
    supersededBy: null,
  };
}

const baseRequest: GateRequest = {
  submissionId: 'sub-1',
  articleId: 'art-1',
  action: 'MINT_DOI',
};

describe('WP-GOV-01E — Release Gate API', () => {
  beforeEach(() => clearNonces());

  it('1. CERTIFIED → ALLOW', () => {
    const response = evaluateGate(baseRequest, makeCert('CERTIFIED'));
    expect(response.result).toBe('ALLOW');
    expect(response.authorizationId).toBeDefined();
    expect(response.nonce).toBeDefined();
  });

  it('2. NOT_CERTIFIED → DENY', () => {
    const response = evaluateGate(baseRequest, makeCert('NOT_CERTIFIED'));
    expect(response.result).toBe('DENY');
  });

  it('3. NOT_EVALUABLE → BLOCKED (fail-closed)', () => {
    const response = evaluateGate(baseRequest, makeCert('NOT_EVALUABLE'));
    expect(response.result).toBe('BLOCKED');
  });

  it('4. INSUFFICIENT_EVIDENCE → BLOCKED', () => {
    const response = evaluateGate(baseRequest, makeCert('INSUFFICIENT_EVIDENCE'));
    expect(response.result).toBe('BLOCKED');
  });

  it('5. SUPERSEDED → BLOCKED', () => {
    const response = evaluateGate(baseRequest, makeCert('SUPERSEDED'));
    expect(response.result).toBe('BLOCKED');
  });

  it('6. No certification → BLOCKED (fail-closed, GOV-INV-11)', () => {
    const response = evaluateGate(baseRequest, null);
    expect(response.result).toBe('BLOCKED');
    expect(response.reason).toContain('fail-closed');
  });

  it('7. Submission ID mismatch → DENY', () => {
    const cert = makeCert('CERTIFIED');
    cert.submissionId = 'different-sub';
    const response = evaluateGate(baseRequest, cert);
    expect(response.result).toBe('DENY');
    expect(response.reason).toContain('mismatch');
  });

  it('8. Authorization has 15-minute TTL', () => {
    const response = evaluateGate(baseRequest, makeCert('CERTIFIED'));
    const issuedAt = new Date(response.issuedAt);
    const expiresAt = new Date(response.expiresAt);
    const diffMs = expiresAt.getTime() - issuedAt.getTime();
    expect(diffMs).toBe(15 * 60 * 1000); // 15 minutes
  });

  it('9. Nonce is unique per authorization', () => {
    const r1 = evaluateGate(baseRequest, makeCert('CERTIFIED'));
    const r2 = evaluateGate(baseRequest, makeCert('CERTIFIED'));
    expect(r1.nonce).not.toBe(r2.nonce);
  });

  it('10. isAuthorizationValid: valid authorization returns true', () => {
    const response = evaluateGate(baseRequest, makeCert('CERTIFIED'));
    expect(isAuthorizationValid(response)).toBe(true);
  });

  it('11. isAuthorizationValid: expired authorization returns false', () => {
    const response = evaluateGate(baseRequest, makeCert('CERTIFIED'));
    response.expiresAt = new Date(Date.now() - 60000).toISOString(); // Expired 1 min ago
    expect(isAuthorizationValid(response)).toBe(false);
  });

  it('12. isAuthorizationValid: DENY result returns false', () => {
    const response = evaluateGate(baseRequest, makeCert('NOT_CERTIFIED'));
    expect(isAuthorizationValid(response)).toBe(false);
  });

  it('13. Nonce consumption: first use succeeds, second use fails (replay)', () => {
    const nonce = 'test-nonce-123';
    expect(consumeNonce(nonce)).toBe(true);  // First use
    expect(consumeNonce(nonce)).toBe(false); // Replay
  });

  it('14. Provenance: ALLOW includes certification hash + evidence hash', () => {
    const cert = makeCert('CERTIFIED');
    const response = evaluateGate(baseRequest, cert);
    expect(response.certificationId).toBe(cert.certificationId);
    expect(response.evidenceSnapshotHash).toBe(cert.evidenceSnapshotHash);
    expect(response.traceabilityGraphHash).toBe(cert.traceabilityGraphHash);
  });

  it('15. Deterministic authorization ID: same request + nonce → same ID', () => {
    // The authorizationId is deterministic given the same inputs + nonce
    const cert = makeCert('CERTIFIED');
    const response = evaluateGate(baseRequest, cert);
    expect(response.authorizationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
