import * as crypto from 'crypto';

/**
 * Generates a standard UUIDv4 to be used as the canonical session ID.
 * This ensures compatibility with the UUID database schema.
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Generates the canonical package storage path.
 */
export function generateCanonicalPackagePath(articleId: string, sessionId: string): string {
  return `packages/${articleId}/${sessionId}`;
}

/**
 * Generates the publisher PDF path based on the canonical package path.
 */
export function generatePublicationPath(packagePath: string): string {
  return `${packagePath}/publisher.pdf`;
}

/**
 * Computes a SHA-256 hex checksum for a given string (e.g. HTML preview).
 */
export function computeCanonicalChecksum(html: string): string {
  const buffer = Buffer.from(html || '', 'utf-8');
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generates a standardized ISO-8601 timestamp for approval times.
 */
export function generateApprovalTimestamp(): string {
  return new Date().toISOString();
}
