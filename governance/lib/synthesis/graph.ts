import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { canonicalizeJson } from '../ingestion/hash';

/**
 * Computes a deterministic SHA-256 hash of the pure evidence snapshot.
 *
 * Per rc2-evidence-snapshot-hash-semantics-decision.md:
 * - evidenceSnapshotHash represents canonical evidence payloads ONLY.
 * - Infrastructure identifiers (id, lastEventId, createdAt, updatedAt, entityType,
 *   version) MUST NOT contaminate the evidence digest.
 * - The projection id is used only as a deterministic sorting/tie-breaker to
 *   make serialization order stable; it does NOT enter the SHA-256 stream.
 * - The semantic evidence payload in state is what is committed.
 * - Uses the certified canonicalizeJson from governance/lib/ingestion/hash.ts
 *   (WP-GOV-01B, CERTIFIED / FROZEN) — no standalone crypto abstraction.
 */
export async function computeEvidenceSnapshotHash(
  submissionId: string,
  tx: Prisma.TransactionClient
): Promise<string> {
  const projections = await tx.evidenceProjection.findMany();

  const relatedProjections = projections.filter(
    (p) => (p.state as any)?.submissionId === submissionId
  );

  // Sort deterministically by infrastructure ID — tie-breaker ONLY.
  // The ID is NOT included in the digest input (per the hash semantics decision).
  relatedProjections.sort((a, b) => a.id.localeCompare(b.id));

  // Build the canonical input: SEMANTIC EVIDENCE PAYLOAD ONLY.
  // Infrastructure IDs, timestamps, event cursors, entity type, and version
  // are excluded by virtue of hashing only p.state.
  const serializedChunks = relatedProjections.map(p => {
    return canonicalizeJson(p.state);
  });

  const canonicalInput = serializedChunks.join('');
  return createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
}

/**
 * Computes a deterministic SHA-256 hash of a submission's traceability subgraph.
 *
 * This hash is INDEPENDENT of evidenceSnapshotHash — it captures topology
 * (nodes + edges), not evidence payloads. It MUST NOT be altered by the
 * evidence hash correction.
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
  const projections = await tx.evidenceProjection.findMany();
  const relatedProjections = projections.filter(
    (p) => (p.state as any)?.submissionId === submissionId
  );

  const nodeIds = new Set<string>();
  nodeIds.add(submissionId);
  for (const p of relatedProjections) {
    nodeIds.add(p.id);
  }

  const edges = await tx.traceabilityEdge.findMany({
    where: {
      OR: [
        { fromId: { in: Array.from(nodeIds) } },
        { toId: { in: Array.from(nodeIds) } }
      ]
    }
  });

  for (const e of edges) {
    nodeIds.add(e.fromId);
    nodeIds.add(e.toId);
  }

  const nodes = await tx.traceabilityNode.findMany({
    where: {
      id: { in: Array.from(nodeIds) }
    }
  });

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

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
