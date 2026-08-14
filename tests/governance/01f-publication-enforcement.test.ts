// tests/governance/01f-publication-enforcement.test.ts
//
// WP-GOV-01F — Publication Gate Integration Tests (UUID CORRECTED)
// Tests: valid, expired, replay, mismatch, fail-closed, durable nonce

import { describe, it, expect, beforeEach } from 'vitest';
import { enforceGateAuthorization } from '../../governance/lib/gate/publication-enforcer';
import { evaluateGate, clearNonces } from '../../governance/lib/gate/gate-evaluator';
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
const WRONG_SUBMISSION_ID = '00000000-0000-4000-8000-000000000003';
const WRONG_ARTICLE_ID = '00000000-0000-4000-8000-000000000004';

function makeCert(result: CertificationResult['result']): CertificationResult {
  return {
    certificationId: 'cert-1',
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

describe('WP-GOV-01F — Publication Gate Integration (Corrected)', () => {
  beforeEach(async () => {
    await prisma.nonceStore.deleteMany({}).catch(() => {});
    await prisma.gateAudit.deleteMany({}).catch(() => {});
  });

  it('1. Valid CERTIFIED authorization → ALLOW publication action', async () => {
    const auth = await evaluateGate(
      { submissionId: TEST_SUBMISSION_ID, articleId: TEST_ARTICLE_ID, action: 'MINT_DOI' },
      makeCert('CERTIFIED'), prisma
    );
    const result = await enforceGateAuthorization(auth, TEST_SUBMISSION_ID, TEST_ARTICLE_ID, 'MINT_DOI', prisma);
    expect(result.allowed).toBe(true);
  });

  it('2. NOT_CERTIFIED authorization → DENY', async () => {
    const auth = await evaluateGate(
      { submissionId: TEST_SUBMISSION_ID, articleId: TEST_ARTICLE_ID, action: 'MINT_DOI' },
      makeCert('NOT_CERTIFIED'), prisma
    );
    const result = await enforceGateAuthorization(auth, TEST_SUBMISSION_ID, TEST_ARTICLE_ID, 'MINT_DOI', prisma);
    expect(result.allowed).toBe(false);
  });

  it('3. Expired authorization → DENY', async () => {
    const auth = await evaluateGate(
      { submissionId: TEST_SUBMISSION_ID, articleId: TEST_ARTICLE_ID, action: 'MINT_DOI' },
      makeCert('CERTIFIED'), prisma
    );
    auth.expiresAt = new Date(Date.now() - 60000).toISOString();
    const result = await enforceGateAuthorization(auth, TEST_SUBMISSION_ID, TEST_ARTICLE_ID, 'MINT_DOI', prisma);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('expired');
  });

  it('4. Replay: second use of PUBLISH nonce → DENY', async () => {
    const auth = await evaluateGate(
      { submissionId: TEST_SUBMISSION_ID, articleId: TEST_ARTICLE_ID, action: 'PUBLISH' },
      makeCert('CERTIFIED'), prisma
    );
    const r1 = await enforceGateAuthorization(auth, TEST_SUBMISSION_ID, TEST_ARTICLE_ID, 'PUBLISH', prisma);
    expect(r1.allowed).toBe(true);
    const r2 = await enforceGateAuthorization(auth, TEST_SUBMISSION_ID, TEST_ARTICLE_ID, 'PUBLISH', prisma);
    expect(r2.allowed).toBe(false);
    expect(r2.reason).toContain('replay');
  });

  it('5. Submission ID mismatch → DENY', async () => {
    const auth = await evaluateGate(
      { submissionId: TEST_SUBMISSION_ID, articleId: TEST_ARTICLE_ID, action: 'MINT_DOI' },
      makeCert('CERTIFIED'), prisma
    );
    const result = await enforceGateAuthorization(auth, WRONG_SUBMISSION_ID, TEST_ARTICLE_ID, 'MINT_DOI', prisma);
    expect(result.allowed).toBe(false);
  });

  it('6. Article ID mismatch → DENY', async () => {
    const auth = await evaluateGate(
      { submissionId: TEST_SUBMISSION_ID, articleId: TEST_ARTICLE_ID, action: 'MINT_DOI' },
      makeCert('CERTIFIED'), prisma
    );
    const result = await enforceGateAuthorization(auth, TEST_SUBMISSION_ID, WRONG_ARTICLE_ID, 'MINT_DOI', prisma);
    expect(result.allowed).toBe(false);
  });

  it('7. Action mismatch → DENY', async () => {
    const auth = await evaluateGate(
      { submissionId: TEST_SUBMISSION_ID, articleId: TEST_ARTICLE_ID, action: 'MINT_DOI' },
      makeCert('CERTIFIED'), prisma
    );
    const result = await enforceGateAuthorization(auth, TEST_SUBMISSION_ID, TEST_ARTICLE_ID, 'PUBLISH', prisma);
    expect(result.allowed).toBe(false);
  });

  it('8. BLOCKED authorization → DENY', async () => {
    const auth = await evaluateGate(
      { submissionId: TEST_SUBMISSION_ID, articleId: TEST_ARTICLE_ID, action: 'MINT_DOI' },
      makeCert('NOT_EVALUABLE'), prisma
    );
    const result = await enforceGateAuthorization(auth, TEST_SUBMISSION_ID, TEST_ARTICLE_ID, 'MINT_DOI', prisma);
    expect(result.allowed).toBe(false);
  });

  it('9. No certification → BLOCKED (fail-closed)', async () => {
    const auth = await evaluateGate(
      { submissionId: TEST_SUBMISSION_ID, articleId: TEST_ARTICLE_ID, action: 'MINT_DOI' },
      null, prisma
    );
    expect(auth.result).toBe('BLOCKED');
    const result = await enforceGateAuthorization(auth, TEST_SUBMISSION_ID, TEST_ARTICLE_ID, 'MINT_DOI', prisma);
    expect(result.allowed).toBe(false);
  });
});
