// governance/lib/gate/types.ts
//
// WP-GOV-01E — Release Gate API Types
//
// Authority: wp-gov-01-engineering-specification.md §8 (Release Authorization)
//            Installment 3 Directive §PHASE B

export type GateResult = 'ALLOW' | 'DENY' | 'BLOCKED';

export type ProtectedAction = 'MINT_DOI' | 'PUBLISH' | 'ARCHIVE';

export interface GateRequest {
  submissionId: string;
  articleId: string;
  action: ProtectedAction;
}

export interface GateResponse {
  authorizationId: string;       // UUID, unique per authorization
  submissionId: string;
  articleId: string;
  requestedAction: ProtectedAction;
  certificationId: string | null;
  certificationHash: string | null;
  evidenceSnapshotHash: string | null;
  traceabilityGraphHash: string | null;
  constitutionVersion: string;
  result: GateResult;
  reason: string;
  nonce: string;                 // UUID, for replay resistance
  issuedAt: string;              // ISO 8601
  expiresAt: string;            // ISO 8601, 15 minutes after issuedAt
  authorizationVersion: string;
  findings?: unknown[];         // Certification findings if DENY/BLOCKED
}

export interface GateAuditRecord {
  auditId: string;
  authorizationId: string | null;
  submissionId: string;
  articleId: string;
  requestedAction: ProtectedAction;
  result: GateResult;
  reason: string;
  requestedAt: string;           // ISO 8601
  respondedAt: string;           // ISO 8601
  requesterIdentity: string;     // Opaque identifier of the caller
}

export const GATE_AUTHORIZATION_VERSION = '1.0.0';
export const GATE_AUTHORIZATION_TTL_MINUTES = 15;
export const CONSTITUTION_VERSION = '2.0.0';
