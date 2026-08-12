import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

/**
 * Computes a deterministic SHA-256 hash of a submission's traceability subgraph.
 * 
 * To ensure determinism:
 * 1. Finds all TraceabilityNodes connected to the submission.
 * 2. Finds all TraceabilityEdges between those nodes.
 * 3. Sorts nodes by id.
 * 4. Sorts edges by id.
 * 5. Serializes them into a stable JSON string and hashes it.
 */
export async function computeTraceabilityGraphHash(
  submissionId: string,
  tx: Prisma.TransactionClient
): Promise<string> {
  // Find all evidence projections related to this submission
  // We use raw query because Prisma's JSON querying varies by version,
  // but since we are in a transaction, we can just fetch all projections for the submission
  // wait, EvidenceProjection has id as the primary key. For submissions it's submissionId,
  // for reviews it's assignmentId, for decisions it's decisionId.
  // The state contains the submissionId.
  
  const projections = await tx.evidenceProjection.findMany();
  // Filter in memory for safety with JSON fields
  const relatedProjections = projections.filter(
    (p) => (p.state as any)?.submissionId === submissionId
  );

  const nodeIds = new Set<string>();
  nodeIds.add(submissionId); // The submission node itself
  for (const p of relatedProjections) {
    nodeIds.add(p.id);
  }

  // We must also include PROVISION nodes connected via REQUIRES from the SUBMISSION node.
  // Let's find all edges originating from or pointing to these nodes.
  const edges = await tx.traceabilityEdge.findMany({
    where: {
      OR: [
        { fromId: { in: Array.from(nodeIds) } },
        { toId: { in: Array.from(nodeIds) } }
      ]
    }
  });

  // Now add any nodes on the other side of these edges (e.g. provisions)
  for (const e of edges) {
    nodeIds.add(e.fromId);
    nodeIds.add(e.toId);
  }

  // Fetch all nodes in the final set
  const nodes = await tx.traceabilityNode.findMany({
    where: {
      id: { in: Array.from(nodeIds) }
    }
  });

  // Deterministic sort
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  // Build a stable representation
  const graphState = {
    nodes: nodes.map(n => ({
      id: n.id,
      kind: n.kind,
      label: n.label,
      metadata: n.metadata ? JSON.parse(n.metadata) : null
    })),
    edges: edges.map(e => ({
      id: e.id,
      fromId: e.fromId,
      toId: e.toId,
      kind: e.kind
    }))
  };

  const serialized = JSON.stringify(graphState);
  return createHash('sha256').update(serialized).digest('hex');
}
