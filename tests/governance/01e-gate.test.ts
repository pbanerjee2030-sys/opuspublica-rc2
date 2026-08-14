// tests/governance/01e-gate.test.ts
//
// WP-GOV-01E — Release Gate API Tests (UUID CORRECTED)
// Tests: ALLOW, DENY, BLOCKED, expiry, nonce, provenance, audit persistence

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateGate, isAuthorizationValid, consumeNonce, clearNonces } from '../../governance/lib/gate/gate-evaluator';
import type { GateRequest } from '../../governance/lib/gate/types';
import type { CertificationResult } from '../../governance/lib/evaluation/types';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
for (const f of ['.env.local', '.env', '.env.example']) {
  try { dotenv.config({ path: f }); break; } catch {}
}

const prisma = new PrismaClient();

// Deterministic test UUIDs (valid PostgreSQL UUID format)
const TEST_SUBMISSION_ID = '00000000-0000-4000-8000-000000000001';
const TEST_ARTICLE_ID = '00000000-0000-4000-8000-000000000002';
const TEST_DIFFERENT_SUB_ID = '00000000-0000-4000-8000-000000000003';

function makeCert(result: CertificationResult['result']): CertificationResult {
  return {
    certificationId: 'test-cert-id',
    submissionId: TEST_SUBMISSION_ID,
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
  submissionId: TEST_SUBMISSION_ID,
  articleId: TEST_ARTICLE_ID,
  action: 'MINT_DOI',
};

describe('WP-GOV-01E — Release Gate API (Corrected)', () => {
  beforeEach(async () => {
    await prisma.nonceStore.deleteMany({}).catch(() => {});
    await prisma.gateAudit.deleteMany({}).catch(() => {});
  });

  it('1. CERTIFIED → ALLOW', async () => {
    const response = await evaluateGate(baseRequest, makeCert('CERTIFIED'), prisma);
    expect(response.result).toBe('ALLOW');
    expect(response.authorizationId).toBeDefined();
    expect(response.nonce).toBeDefined();
  });

  it('2. NOT_CERTIFIED → DENY', async () => {
    const response = await evaluateGate(baseRequest, makeCert('NOT_CERTIFIED'), prisma);
    expect(response.result).toBe('DENY');
  });

  it('3. NOT_EVALUABLE → BLOCKED (fail-closed)', async () => {
    const response = await evaluateGate(baseRequest, makeCert('NOT_EVALUABLE'), prisma);
    expect(response.result).toBe('BLOCKED');
  });

  it('4. INSUFFICIENT_EVIDENCE → BLOCKED', async () => {
    const response = await evaluateGate(baseRequest, makeCert('INSUFFICIENT_EVIDENCE'), prisma);
    expect(response.result).toBe('BLOCKED');
  });

  it('5. SUPERSEDED → BLOCKED', async () => {
    const response = await evaluateGate(baseRequest, makeCert('SUPERSEDED'), prisma);
    expect(response.result).toBe('BLOCKED');
  });

  it('6. No certification → BLOCKED (fail-closed, GOV-INV-11)', async () => {
    const response = await evaluateGate(baseRequest, null, prisma);
    expect(response.result).toBe('BLOCKED');
    expect(response.reason).toContain('fail-closed');
  });

  it('7. Submission ID mismatch → DENY', async () => {
    const cert = makeCert('CERTIFIED');
    cert.submissionId = TEST_DIFFERENT_SUB_ID;
    const response = await evaluateGate(baseRequest, cert, prisma);
    expect(response.result).toBe('DENY');
    expect(response.reason).toContain('mismatch');
  });

  it('8. Authorization has 15-minute TTL', async () => {
    const response = await evaluateGate(baseRequest, makeCert('CERTIFIED'), prisma);
    const diffMs = new Date(response.expiresAt).getTime() - new Date(response.issuedAt).getTime();
    expect(diffMs).toBe(15 * 60 * 1000);
  });

  it('9. Nonce is unique per authorization', async () => {
    const r1 = await evaluateGate(baseRequest, makeCert('CERTIFIED'), prisma);
    const r2 = await evaluateGate(baseRequest, makeCert('CERTIFIED'), prisma);
    expect(r1.nonce).not.toBe(r2.nonce);
  });

  it('10. isAuthorizationValid: valid → true', async () => {
    const response = await evaluateGate(baseRequest, makeCert('CERTIFIED'), prisma);
    expect(isAuthorizationValid(response)).toBe(true);
  });

  it('11. isAuthorizationValid: expired → false', async () => {
    const response = await evaluateGate(baseRequest, makeCert('CERTIFIED'), prisma);
    response.expiresAt = new Date(Date.now() - 60000).toISOString();
    expect(isAuthorizationValid(response)).toBe(false);
  });

  it('12. Provenance: ALLOW includes hashes', async () => {
    const cert = makeCert('CERTIFIED');
    const response = await evaluateGate(baseRequest, cert, prisma);
    expect(response.certificationId).toBe(cert.certificationId);
    expect(response.evidenceSnapshotHash).toBe(cert.evidenceSnapshotHash);
    expect(response.traceabilityGraphHash).toBe(cert.traceabilityGraphHash);
  });

  // ── AUDIT PERSISTENCE TESTS (directive §6 A-E) ──────────────────────────

  it('13. ALLOW creates durable gate_audit record', async () => {
    const response = await evaluateGate(baseRequest, makeCert('CERTIFIED'), prisma);
    const audit = await prisma.gateAudit.findFirst({ where: { authorizationId: response.authorizationId } });
    expect(audit).not.toBeNull();
    expect(audit!.result).toBe('ALLOW');
    expect(audit!.nonce).toBe(response.nonce);
  });

  it('14. DENY creates durable gate_audit record', async () => {
    const response = await evaluateGate(baseRequest, makeCert('NOT_CERTIFIED'), prisma);
    const audit = await prisma.gateAudit.findFirst({ where: { authorizationId: response.authorizationId } });
    expect(audit).not.toBeNull();
    expect(audit!.result).toBe('DENY');
  });

  it('15. BLOCKED creates durable gate_audit record', async () => {
    const response = await evaluateGate(baseRequest, null, prisma);
    const audit = await prisma.gateAudit.findFirst({ where: { authorizationId: response.authorizationId } });
    expect(audit).not.toBeNull();
    expect(audit!.result).toBe('BLOCKED');
  });

  it('16. Audit record contains required hashes', async () => {
    const cert = makeCert('CERTIFIED');
    const response = await evaluateGate(baseRequest, cert, prisma);
    const audit = await prisma.gateAudit.findFirst({ where: { authorizationId: response.authorizationId } });
    expect(audit!.evidenceSnapshotHash).toBe(cert.evidenceSnapshotHash);
    expect(audit!.traceabilityGraphHash).toBe(cert.traceabilityGraphHash);
    expect(audit!.certificationId).toBe(cert.certificationId);
  });

  // ── DURABLE NONCE TESTS (directive §6 F-O) ──────────────────────────────

  it('17. First nonce consumption succeeds', async () => {
    const response = await evaluateGate(baseRequest, makeCert('CERTIFIED'), prisma);
    const consumed = await consumeNonce(response, prisma);
    expect(consumed).toBe(true);
  });

  it('18. Second nonce consumption fails (replay)', async () => {
    const response = await evaluateGate(baseRequest, makeCert('CERTIFIED'), prisma);
    await consumeNonce(response, prisma);
    const replay = await consumeNonce(response, prisma);
    expect(replay).toBe(false);
  });

  it('19. Nonce cannot be consumed with altered submissionId', async () => {
    const response = await evaluateGate(baseRequest, makeCert('CERTIFIED'), prisma);
    const tampered = { ...response, submissionId: TEST_DIFFERENT_SUB_ID };
    const result = await consumeNonce(tampered, prisma);
    expect(result).toBe(false);
  });

  it('20. Expired authorization cannot be consumed', async () => {
    const response = await evaluateGate(baseRequest, makeCert('CERTIFIED'), prisma);
    response.expiresAt = new Date(Date.now() - 60000).toISOString();
    const result = await consumeNonce(response, prisma);
    expect(result).toBe(false);
  });

  it('21. Audit record reflects consumption state', async () => {
    const response = await evaluateGate(baseRequest, makeCert('CERTIFIED'), prisma);
    await consumeNonce(response, prisma);
    const audit = await prisma.gateAudit.findFirst({ where: { authorizationId: response.authorizationId } });
    expect(audit!.consumed).toBe(true);
    expect(audit!.consumedAt).not.toBeNull();
  });
});
