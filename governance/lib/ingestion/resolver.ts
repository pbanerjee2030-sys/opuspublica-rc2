import { ProjectionError } from './projection';

export async function resolveReviewSubmission(
  tx: any,
  assignmentId: string
): Promise<any> {
  // Use the approved resolver boundary
  // tx is a Prisma transaction already running as governance_ingest_role
  try {
    const result: any[] = await tx.$queryRaw`
      SELECT assignment_id, submission_id, article_id, journal_id 
      FROM public.governance_evidence_resolver(${assignmentId}::uuid)
    `;

    if (!result || result.length === 0) {
      throw new ProjectionError(`Unresolved assignment: ${assignmentId} does not map to a submission`, false);
    }

    return result[0];
  } catch (err: any) {
    if (err instanceof ProjectionError) throw err;
    throw new ProjectionError(`Resolver error: ${err.message}`, true);
  }
}
