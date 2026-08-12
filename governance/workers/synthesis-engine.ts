import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';

function getDeterministicEdgeId(fromId: string, kind: string, toId: string): string {
  return createHash('sha256').update(`${fromId}:${kind}:${toId}`).digest('hex');
}

/**
 * Transforms EvidenceProjection records into the Traceability Graph topology for a given submission.
 * Idempotently UPSERTS nodes and edges.
 * 
 * Rules:
 * - A SUBMISSION node is always created if there is submission evidence, or as a shell if other evidence arrives first.
 * - REVIEW nodes are created and connected to SUBMISSION via EVIDENCES.
 * - DECISION nodes are created and connected to SUBMISSION via DECIDES.
 * - Active Provisions are connected to SUBMISSION via REQUIRES, respecting isGlobal and ProvisionScope.
 * - If multiple decisions exist, older ones are superseded by newer ones.
 */
export async function synthesizeForSubmission(
  submissionId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  // 1. Fetch all evidence projections connected to this submission.
  const allProjections = await tx.evidenceProjection.findMany();
  const projections = allProjections.filter(
    (p) => (p.state as any)?.submissionId === submissionId
  );

  if (projections.length === 0) {
    return; // Nothing to synthesize
  }

  // 2. Classify evidence by type
  const submissionEvidence = projections.find(p => p.entityType === 'Submission');
  const reviewEvidence = projections.filter(p => p.entityType === 'Review');
  const decisionEvidence = projections.filter(p => p.entityType === 'Decision');

  // 3. Upsert SUBMISSION Node (even as shell to prevent dangling topology)
  const submissionMetadata = submissionEvidence 
    ? { sourceId: submissionEvidence.id, state: submissionEvidence.state }
    : { _type: 'shell', status: 'awaiting_evidence' };
    
  const journalId = submissionEvidence ? (submissionEvidence.state as any)?.journalId : null;

  await tx.traceabilityNode.upsert({
    where: { id: submissionId },
    create: {
      id: submissionId,
      kind: 'workflow',
      label: 'SUBMISSION',
      metadata: JSON.stringify(submissionMetadata)
    },
    update: submissionEvidence ? {
      metadata: JSON.stringify(submissionMetadata)
    } : {}
  });

  // Link active PROVISIONS (REQUIRES) based on applicability schema
  if (journalId) {
    const provisions = await tx.provision.findMany({
      where: {
        status: 'active',
        OR: [
          { isGlobal: true },
          { provisionScopes: { some: { journalId: journalId } } }
        ]
      },
      orderBy: { id: 'asc' }
    });

    for (const prov of provisions) {
      await tx.traceabilityNode.upsert({
        where: { id: prov.id },
        create: {
          id: prov.id,
          kind: 'requirement',
          label: 'PROVISION',
          metadata: JSON.stringify({ version: prov.version, severity: prov.severity })
        },
        update: {
          metadata: JSON.stringify({ version: prov.version, severity: prov.severity })
        }
      });

      const edgeId = getDeterministicEdgeId(submissionId, 'REQUIRES', prov.id);
      await tx.traceabilityEdge.upsert({
        where: { id: edgeId },
        create: {
          id: edgeId,
          fromId: submissionId,
          toId: prov.id,
          kind: 'REQUIRES'
        },
        update: {}
      });
    }
  }

  // 4. Upsert REVIEW Nodes & Edges
  for (const rev of reviewEvidence) {
    const revId = rev.id;
    await tx.traceabilityNode.upsert({
      where: { id: revId },
      create: {
        id: revId,
        kind: 'evidence',
        label: 'REVIEW',
        metadata: JSON.stringify({ sourceId: rev.id, state: rev.state })
      },
      update: {
        metadata: JSON.stringify({ sourceId: rev.id, state: rev.state })
      }
    });

    const edgeId = getDeterministicEdgeId(revId, 'EVIDENCES', submissionId);
    await tx.traceabilityEdge.upsert({
      where: { id: edgeId },
      create: {
        id: edgeId,
        fromId: revId,
        toId: submissionId,
        kind: 'EVIDENCES'
      },
      update: {}
    });
  }

  // 5. Upsert DECISION Nodes & Edges
  const sortedDecisions = [...decisionEvidence].sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  
  for (let i = 0; i < sortedDecisions.length; i++) {
    const dec = sortedDecisions[i];
    const decId = dec.id;

    await tx.traceabilityNode.upsert({
      where: { id: decId },
      create: {
        id: decId,
        kind: 'evidence',
        label: 'DECISION',
        metadata: JSON.stringify({ sourceId: dec.id, state: dec.state })
      },
      update: {
        metadata: JSON.stringify({ sourceId: dec.id, state: dec.state })
      }
    });

    const decEdgeId = getDeterministicEdgeId(decId, 'DECIDES', submissionId);
    await tx.traceabilityEdge.upsert({
      where: { id: decEdgeId },
      create: {
        id: decEdgeId,
        fromId: decId,
        toId: submissionId,
        kind: 'DECIDES'
      },
      update: {}
    });

    // If there is an older decision, this one SUPERSEDES it
    if (i > 0) {
      const olderDec = sortedDecisions[i - 1];
      const superEdgeId = getDeterministicEdgeId(decId, 'SUPERSEDES', olderDec.id);
      await tx.traceabilityEdge.upsert({
        where: { id: superEdgeId },
        create: {
          id: superEdgeId,
          fromId: decId,
          toId: olderDec.id,
          kind: 'SUPERSEDES'
        },
        update: {}
      });
    }
  }
}
