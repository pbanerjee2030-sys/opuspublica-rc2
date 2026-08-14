// tests/governance/01f-publication-enforcement.test.ts
//
// WP-GOV-01F — Publication Gate Integration Tests
//
// Authority: Installment 3 Directive §PHASE C
// Tests: valid authorization, expired, replay, mismatch, fail-closed

import { describe, it, expect, beforeEach } from 'vitest';
import { enforceGateAuthorization } from '../../governance/lib/gate/publication-enforcer';
import { evaluateGate, clearNonces } from '../../governance/lib/gate/gate-evaluator';
import type { CertificationResult } from '../../governance/lib/evaluation/types';

function makeCert(result: CertificationResult['result']): CertificationResult {
  return {
    certificationId: 'cert-1',
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

describe('WP-GOV-01F — Publication Gate Integration', () => {
  beforeEach(() => clearNonces());

  it('1. Valid CERTIFIED authorization → ALLOW publication action', () => {
    const auth = evaluateGate(
      { submissionId: 'sub-1', articleId: 'art-1', action: 'MINT_DOI' },
      makeCert('CERTIFIED')
    );
    const result = enforceGateAuthorization(auth, 'sub-1', 'art-1', 'MINT_DOI');
    expect(result.allowed).toBe(true);
  });

  it('2. NOT_CERTIFIED authorization → DENY', () => {
    const auth = evaluateGate(
      { submissionId: 'sub-1', articleId: 'art-1', action: 'MINT_DOI' },
      makeCert('NOT_CERTIFIED')
    );
    const result = enforceGateAuthorization(auth, 'sub-1', 'art-1', 'MINT_DOI');
    expect(result.allowed).toBe(false);
  });

  it('3. Expired authorization → DENY', () => {
    const auth = evaluateGate(
      { submissionId: 'sub-1', articleId: 'art-1', action: 'MINT_DOI' },
      makeCert('CERTIFIED')
    );
    auth.expiresAt = new Date(Date.now() - 60000).toISOString(); // Expired
    const result = enforceGateAuthorization(auth, 'sub-1', 'art-1', 'MINT_DOI');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('expired');
  });

  it('4. Replay: second use of PUBLISH nonce → DENY', () => {
    const auth = evaluateGate(
      { submissionId: 'sub-1', articleId: 'art-1', action: 'PUBLISH' },
      makeCert('CERTIFIED')
    );
    // First use
    const result1 = enforceGateAuthorization(auth, 'sub-1', 'art-1', 'PUBLISH');
    expect(result1.allowed).toBe(true);
    // Replay
    const result2 = enforceGateAuthorization(auth, 'sub-1', 'art-1', 'PUBLISH');
    expect(result2.allowed).toBe(false);
    expect(result2.reason).toContain('replay');
  });

  it('5. Submission ID mismatch → DENY', () => {
    const auth = evaluateGate(
      { submissionId: 'sub-1', articleId: 'art-1', action: 'MINT_DOI' },
      makeCert('CERTIFIED')
    );
    const result = enforceGateAuthorization(auth, 'wrong-sub', 'art-1', 'MINT_DOI');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Submission ID mismatch');
  });

  it('6. Article ID mismatch → DENY', () => {
    const auth = evaluateGate(
      { submissionId: 'sub-1', articleId: 'art-1', action: 'MINT_DOI' },
      makeCert('CERTIFIED')
    );
    const result = enforceGateAuthorization(auth, 'sub-1', 'wrong-art', 'MINT_DOI');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Article ID mismatch');
  });

  it('7. Action mismatch → DENY', () => {
    const auth = evaluateGate(
      { submissionId: 'sub-1', articleId: 'art-1', action: 'MINT_DOI' },
      makeCert('CERTIFIED')
    );
    const result = enforceGateAuthorization(auth, 'sub-1', 'art-1', 'PUBLISH');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Action mismatch');
  });

  it('8. BLOCKED authorization → DENY', () => {
    const auth = evaluateGate(
      { submissionId: 'sub-1', articleId: 'art-1', action: 'MINT_DOI' },
      makeCert('NOT_EVALUABLE')
    );
    const result = enforceGateAuthorization(auth, 'sub-1', 'art-1', 'MINT_DOI');
    expect(result.allowed).toBe(false);
  });

  it('9. No certification → BLOCKED (fail-closed)', () => {
    const auth = evaluateGate(
      { submissionId: 'sub-1', articleId: 'art-1', action: 'MINT_DOI' },
      null
    );
    expect(auth.result).toBe('BLOCKED');
    const result = enforceGateAuthorization(auth, 'sub-1', 'art-1', 'MINT_DOI');
    expect(result.allowed).toBe(false);
  });
});
