import { resolveReviewSubmission } from './resolver';

export interface EvidencePayload {
  entityType: string;
  state: Record<string, any>;
}

export class ProjectionError extends Error {
  constructor(message: string, public readonly isRetryable: boolean) {
    super(message);
    this.name = 'ProjectionError';
  }
}

/**
 * Validates and extracts only constitutionally relevant evidence from ArticleSubmitted.
 * STRONGLY strips any manuscript content, abstracts, emails, or unrelated metadata.
 */
function projectArticleSubmitted(payload: any): EvidencePayload {
  if (!payload.submission_id || !payload.article_id) {
    throw new ProjectionError('Malformed ArticleSubmitted: missing required identity fields', false);
  }

  return {
    entityType: 'Submission',
    state: {
      submissionId: payload.submission_id,
      articleId: payload.article_id,
      journalId: payload.journal_id || null,
      submitterId: payload.submitter_id || null, // Opaque actor ID
      // Do NOT include manuscript, abstract, title, files, or author emails.
    }
  };
}

/**
 * Validates and extracts ReviewSubmitted. 
 * MUST use the resolver to bind assignment_id to submission_id.
 */
async function projectReviewSubmitted(
  payload: any,
  tx: any
): Promise<EvidencePayload> {
  if (!payload.assignment_id) {
    throw new ProjectionError('Malformed ReviewSubmitted: missing assignment_id', false);
  }

  // Use the approved resolver boundary to find the submission mapping
  const resolution = await resolveReviewSubmission(tx, payload.assignment_id);

  return {
    entityType: 'Review',
    state: {
      assignmentId: resolution.assignment_id,
      submissionId: resolution.submission_id,
      articleId: resolution.article_id,
      journalId: resolution.journal_id,
      reviewerId: payload.reviewer_id || null,
      // Do NOT include review text, scores, or comments.
    }
  };
}

/**
 * Validates and extracts DecisionRecorded.
 */
function projectDecisionRecorded(payload: any): EvidencePayload {
  if (!payload.decision_id || !payload.submission_id || !payload.decision) {
    throw new ProjectionError('Malformed DecisionRecorded: missing required identity or decision fields', false);
  }

  return {
    entityType: 'Decision',
    state: {
      decisionId: payload.decision_id,
      submissionId: payload.submission_id,
      decisionType: payload.decision,
      round: payload.round || 1,
      // Do NOT include editorial commentary or internal justification text.
    }
  };
}

/**
 * Projects a raw outbox payload into a minimal, deterministic Governance evidence projection.
 * Throws a ProjectionError if the event is malformed, unresolved, or unknown.
 */
export async function projectEvidence(
  eventType: string,
  payload: any,
  tx: any
): Promise<EvidencePayload> {
  switch (eventType) {
    case 'ArticleSubmitted':
      return projectArticleSubmitted(payload);
    
    case 'ReviewSubmitted':
      return await projectReviewSubmitted(payload, tx);

    case 'DecisionRecorded':
      return projectDecisionRecorded(payload);

    default:
      // Unknown events are explicitly quarantined (non-retryable failure)
      throw new ProjectionError(`Unknown or unsupported event type: ${eventType}`, false);
  }
}
