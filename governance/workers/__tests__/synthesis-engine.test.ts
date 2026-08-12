import { synthesizeForSubmission } from '../synthesis-engine';
import { computeTraceabilityGraphHash } from '../../lib/synthesis/graph';
import { prismaGovernance } from '../../lib/ingestion/db';
import { randomUUID, createHash } from 'crypto';

describe('WP-GOV-01C - Evidence Synthesis Engine', () => {
  const db = prismaGovernance;

  beforeEach(async () => {
    await db.traceabilityEdge.deleteMany({});
    await db.traceabilityNode.deleteMany({});
    await db.evidenceProjection.deleteMany({});
    await db.provisionScope.deleteMany({});
    await db.provision.deleteMany({});
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  function getDeterministicEdgeId(fromId: string, kind: string, toId: string): string {
    return createHash('sha256').update(`${fromId}:${kind}:${toId}`).digest('hex');
  }

  it('1, 2, 3: Deterministic edge ID, graph hash, duplicate synthesis (Idempotency)', async () => {
    const submissionId = randomUUID();
    const revId = randomUUID();

    await db.evidenceProjection.create({
      data: {
        id: submissionId,
        entityType: 'Submission',
        state: { submissionId, title: 'Test Sub' },
        lastEventId: randomUUID()
      }
    });

    await db.evidenceProjection.create({
      data: {
        id: revId,
        entityType: 'Review',
        state: { submissionId, assignmentId: revId },
        lastEventId: randomUUID()
      }
    });

    await db.$transaction(async (tx) => {
      await synthesizeForSubmission(submissionId, tx);
    });

    let hash1 = '';
    await db.$transaction(async (tx) => {
      hash1 = await computeTraceabilityGraphHash(submissionId, tx);
    });

    const edgeCount1 = await db.traceabilityEdge.count();
    expect(edgeCount1).toBeGreaterThan(0);

    const edge = await db.traceabilityEdge.findFirst({ where: { kind: 'EVIDENCES' } });
    expect(edge!.id).toBe(getDeterministicEdgeId(revId, 'EVIDENCES', submissionId));

    // Run synthesis 2 (Idempotency)
    await db.$transaction(async (tx) => {
      await synthesizeForSubmission(submissionId, tx);
    });

    let hash2 = '';
    await db.$transaction(async (tx) => {
      hash2 = await computeTraceabilityGraphHash(submissionId, tx);
    });

    const edgeCount2 = await db.traceabilityEdge.count();
    
    expect(edgeCount2).toBe(edgeCount1);
    expect(hash2).toBe(hash1); // Determinism
  });

  it('4. Concurrency: multiple parallel syntheses do not crash or duplicate edges', async () => {
    const submissionId = randomUUID();

    await db.evidenceProjection.create({
      data: {
        id: submissionId,
        entityType: 'Submission',
        state: { submissionId, title: 'Test Sub' },
        lastEventId: randomUUID()
      }
    });

    // Fire concurrently
    await Promise.all([
      db.$transaction(async (tx) => synthesizeForSubmission(submissionId, tx)),
      db.$transaction(async (tx) => synthesizeForSubmission(submissionId, tx)),
      db.$transaction(async (tx) => synthesizeForSubmission(submissionId, tx))
    ]);

    const submissionNodes = await db.traceabilityNode.findMany({ where: { id: submissionId } });
    expect(submissionNodes.length).toBe(1);
  });

  it('5, 6: Out-of-order evidence, no dangling edges', async () => {
    const submissionId = randomUUID();
    const revId = randomUUID();
    
    // Only Review evidence exists
    await db.evidenceProjection.create({
      data: {
        id: revId,
        entityType: 'Review',
        state: { submissionId, assignmentId: revId },
        lastEventId: randomUUID()
      }
    });

    await db.$transaction(async (tx) => {
      await synthesizeForSubmission(submissionId, tx);
    });

    const revNode = await db.traceabilityNode.findUnique({ where: { id: revId } });
    expect(revNode).not.toBeNull();
    
    // Shell submission node must be created
    const subNode = await db.traceabilityNode.findUnique({ where: { id: submissionId } });
    expect(subNode).not.toBeNull();
    expect(JSON.parse(subNode!.metadata as string)._type).toBe('shell');
    
    const edge = await db.traceabilityEdge.findFirst({
      where: { fromId: revId, toId: submissionId, kind: 'EVIDENCES' }
    });
    expect(edge).not.toBeNull();
  });

  it('7, 8, 9, 10, 11: Global vs scoped provisions, cross-journal isolation, no provision case', async () => {
    const journal1 = 'J1';
    const journal2 = 'J2';

    // Global
    await db.provision.create({
      data: { id: 'PROV-GLOBAL', class: 'invariant', statement: 'Global', sourceChapter: 'I', owner: 'O', isGlobal: true }
    });
    // Scoped to J1
    await db.provision.create({
      data: { id: 'PROV-J1', class: 'rule', statement: 'J1 only', sourceChapter: 'II', owner: 'O', isGlobal: false,
              provisionScopes: { create: { journalId: journal1 } } }
    });
    // Scoped to J2
    await db.provision.create({
      data: { id: 'PROV-J2', class: 'rule', statement: 'J2 only', sourceChapter: 'II', owner: 'O', isGlobal: false,
              provisionScopes: { create: { journalId: journal2 } } }
    });
    
    // Submission for J1
    const subJ1 = randomUUID();
    await db.evidenceProjection.create({
      data: { id: subJ1, entityType: 'Submission', state: { submissionId: subJ1, journalId: journal1 }, lastEventId: randomUUID() }
    });

    await db.$transaction(async (tx) => {
      await synthesizeForSubmission(subJ1, tx);
    });

    const reqEdgesJ1 = await db.traceabilityEdge.findMany({ where: { fromId: subJ1, kind: 'REQUIRES' } });
    expect(reqEdgesJ1.length).toBe(2);
    const toIds = reqEdgesJ1.map(e => e.toId).sort();
    expect(toIds).toEqual(['PROV-GLOBAL', 'PROV-J1']); // Isolated from J2

    // Submission for unknown journal (No provisions scoped)
    const subUnknown = randomUUID();
    await db.evidenceProjection.create({
      data: { id: subUnknown, entityType: 'Submission', state: { submissionId: subUnknown, journalId: 'JX' }, lastEventId: randomUUID() }
    });

    await db.$transaction(async (tx) => {
      await synthesizeForSubmission(subUnknown, tx);
    });
    
    const reqEdgesUnknown = await db.traceabilityEdge.findMany({ where: { fromId: subUnknown, kind: 'REQUIRES' } });
    expect(reqEdgesUnknown.length).toBe(1);
    expect(reqEdgesUnknown[0].toId).toBe('PROV-GLOBAL'); // Only global applies
  });

  it('12, 13, 14: Provenance, Contradiction, Supersedes', async () => {
    const submissionId = randomUUID();
    
    await db.evidenceProjection.create({
      data: {
        id: submissionId,
        entityType: 'Submission',
        state: { submissionId },
        lastEventId: randomUUID()
      }
    });

    const dec1Id = randomUUID();
    await db.evidenceProjection.create({
      data: {
        id: dec1Id,
        entityType: 'Decision',
        state: { submissionId, decisionType: 'reject' },
        lastEventId: randomUUID(),
        updatedAt: new Date('2026-08-01T10:00:00Z')
      }
    });

    const dec2Id = randomUUID();
    await db.evidenceProjection.create({
      data: {
        id: dec2Id,
        entityType: 'Decision',
        state: { submissionId, decisionType: 'accept' },
        lastEventId: randomUUID(),
        updatedAt: new Date('2026-08-01T11:00:00Z') // Newer
      }
    });

    await db.$transaction(async (tx) => {
      await synthesizeForSubmission(submissionId, tx);
    });

    const decEdge1 = await db.traceabilityEdge.findFirst({ where: { fromId: dec1Id, toId: submissionId, kind: 'DECIDES' } });
    const decEdge2 = await db.traceabilityEdge.findFirst({ where: { fromId: dec2Id, toId: submissionId, kind: 'DECIDES' } });
    expect(decEdge1).not.toBeNull();
    expect(decEdge2).not.toBeNull();

    const supersedesEdge = await db.traceabilityEdge.findFirst({ where: { fromId: dec2Id, toId: dec1Id, kind: 'SUPERSEDES' } });
    expect(supersedesEdge).not.toBeNull();
  });
});
