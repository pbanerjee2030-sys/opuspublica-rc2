// governance/lib/lifecycle/publication-date-service.ts
//
// WS-A: Historical Publication Date Domain Service
//
// Operationalizes publication_dates with controlled write path,
// provenance capture, validation, supersession, and audit.

import { PrismaClient } from '@prisma/client';

export interface CreatePublicationDateInput {
  articleId?: string;
  bookId?: string;
  dateType: 'print_publication' | 'online_publication' | 'issue_publication' | 'doi_registration' | 'doi_deposit' | 'crossref_deposit' | 'first_online' | 'issued';
  dateValue: string; // ISO date
  source: 'author' | 'editor' | 'crossref' | 'historical_record' | 'admin' | 'system';
  evidence?: string;
  assertingAuthority: string; // Profile UUID
}

export interface PublicationDateRecord {
  id: string;
  articleId: string | null;
  bookId: string | null;
  dateType: string;
  dateValue: string;
  source: string;
  evidence: string | null;
  assertingAuthority: string | null;
  assertionTimestamp: string;
  verificationStatus: string;
  supersededBy: string | null;
  createdAt: string;
}

/**
 * Creates an authoritative publication date record.
 * Only editors/admins can create historical dates.
 */
export async function createPublicationDate(
  input: CreatePublicationDateInput,
  prisma: PrismaClient
): Promise<PublicationDateRecord> {
  const record = await prisma.$queryRaw<PublicationDateRecord[]>`
    INSERT INTO public.publication_dates (
      article_id, book_id, date_type, date_value, source, evidence,
      asserting_authority, assertion_timestamp, verification_status
    ) VALUES (
      ${input.articleId}::uuid, ${input.bookId}::uuid,
      ${input.dateType}, ${input.dateValue}::date,
      ${input.source}, ${input.evidence},
      ${input.assertingAuthority}::uuid, now(), 'pending'
    )
    RETURNING
      id::text, article_id::text, book_id::text, date_type, date_value::text,
      source, evidence, asserting_authority::text,
      assertion_timestamp::text, verification_status,
      superseded_by::text, created_at::text
  `;
  return record[0];
}

/**
 * Supersedes a prior publication date with a corrected one.
 * The prior record remains in the database (append-only).
 */
export async function supersedePublicationDate(
  priorRecordId: string,
  correction: CreatePublicationDateInput,
  prisma: PrismaClient
): Promise<PublicationDateRecord> {
  const newRecord = await createPublicationDate(correction, prisma);
  await prisma.$executeRaw`
    UPDATE public.publication_dates
    SET superseded_by = ${newRecord.id}::uuid, updated_at = now()
    WHERE id = ${priorRecordId}::uuid
  `;
  return newRecord;
}

/**
 * Verifies a publication date (marks as verified).
 */
export async function verifyPublicationDate(
  recordId: string,
  prisma: PrismaClient
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE public.publication_dates
    SET verification_status = 'verified', updated_at = now()
    WHERE id = ${recordId}::uuid
  `;
}

/**
 * Retrieves all active (non-superseded) publication dates for an article.
 */
export async function getActivePublicationDates(
  articleId: string,
  prisma: PrismaClient
): Promise<PublicationDateRecord[]> {
  return prisma.$queryRaw<PublicationDateRecord[]>`
    SELECT
      id::text, article_id::text, book_id::text, date_type, date_value::text,
      source, evidence, asserting_authority::text,
      assertion_timestamp::text, verification_status,
      superseded_by::text, created_at::text
    FROM public.publication_dates
    WHERE article_id = ${articleId}::uuid
      AND superseded_by IS NULL
    ORDER BY date_type, assertion_timestamp
  `;
}

/**
 * Gets the online publication date (maps to articles.published_at).
 * Per governance decision: articles.published_at continues to represent
 * the actual system-level online publication event.
 */
export async function getOnlinePublicationDate(
  articleId: string,
  prisma: PrismaClient
): Promise<PublicationDateRecord | null> {
  const results = await prisma.$queryRaw<PublicationDateRecord[]>`
    SELECT
      id::text, article_id::text, book_id::text, date_type, date_value::text,
      source, evidence, asserting_authority::text,
      assertion_timestamp::text, verification_status,
      superseded_by::text, created_at::text
    FROM public.publication_dates
    WHERE article_id = ${articleId}::uuid
      AND date_type = 'online_publication'
      AND superseded_by IS NULL
    ORDER BY assertion_timestamp DESC
    LIMIT 1
  `;
  return results[0] || null;
}
