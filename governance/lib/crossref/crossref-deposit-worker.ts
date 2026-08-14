// governance/lib/crossref/crossref-deposit-worker.ts
//
// WS-D: Crossref Deposit Worker
//
// Operationalizes the Crossref deposit pipeline.
// Flow: Release Gate ALLOW → durable queue record → CrossrefDepositWorker
//       → XML generation → Crossref HTTP submission → confirmed/failed
//
// Per governance decision §5: deposit ONLY after successful Release Gate.
//
// This worker extends GovernanceWorker and runs under WorkerManager.

import { GovernanceWorker, type WorkerHealth } from '../worker/worker-manager';
import { generateDepositXml } from './deposit-pipeline';
import { PrismaClient } from '@prisma/client';

export interface CrossrefDepositConfig {
  pollIntervalMs: number;
  maxRetries: number;
  crossrefApiUrl: string;
  crossrefUsername: string;
  crossrefPassword: string;
  crossrefPrefix: string;
}

export interface CrossrefDepositResult {
  success: boolean;
  responseCode?: number;
  responseBody?: string;
  errorMessage?: string;
}

/**
 * HTTP submission interface — mockable for tests.
 */
export interface CrossrefHttpClient {
  submit(xml: string, config: CrossrefDepositConfig): Promise<CrossrefDepositResult>;
}

/**
 * Default HTTP client (uses fetch). NOT used in tests.
 */
export const defaultCrossrefClient: CrossrefHttpClient = {
  async submit(xml: string, config: CrossrefDepositConfig): Promise<CrossrefDepositResult> {
    try {
      const formData = new FormData();
      formData.append('operation', 'doMDUpload');
      formData.append('login_id', config.crossrefUsername);
      formData.append('login_passwd', config.crossrefPassword);
      formData.append('file', new Blob([xml], { type: 'application/xml' }), 'deposit.xml');

      const response = await fetch(config.crossrefApiUrl, {
        method: 'POST',
        body: formData,
      });

      const body = await response.text();
      return {
        success: response.status >= 200 && response.status < 300,
        responseCode: response.status,
        responseBody: body,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Crossref Deposit Worker.
 *
 * Polls the crossref_deposit_queue for pending deposits,
 * generates XML, submits to Crossref, and records the result.
 *
 * The worker MUST NOT deposit an article unless a valid Release Gate
 * authorization exists for that article.
 */
export class CrossrefDepositWorker extends GovernanceWorker {
  private prisma: PrismaClient;
  private httpClient: CrossrefHttpClient;
  private crossrefConfig: CrossrefDepositConfig;

  constructor(
    prisma: PrismaClient,
    httpClient: CrossrefHttpClient,
    config: CrossrefDepositConfig
  ) {
    super({
      name: 'crossref-deposit-worker',
      pollIntervalMs: config.pollIntervalMs,
      maxRetries: config.maxRetries,
      retryDelayMs: 5000,
      gracefulShutdownTimeoutMs: 30000,
    });
    this.prisma = prisma;
    this.httpClient = httpClient;
    this.crossrefConfig = config;
  }

  protected async poll(): Promise<number> {
    // Find pending deposits
    const pending = await this.prisma.$queryRaw<Array<{ id: string; article_id: string; authorization_id: string; retry_count: number; max_retries: number }>>`
      SELECT id::text, article_id::text, authorization_id, retry_count, max_retries
      FROM public.crossref_deposit_queue
      WHERE deposit_status IN ('pending', 'redeposit')
        AND retry_count < max_retries
      ORDER BY created_at
      LIMIT 1
    `;

    if (pending.length === 0) return 0;

    const job = pending[0];

    // Verify authorization exists (Release Gate ALLOW)
    const auth = await this.prisma.$queryRaw<Array<{ result: string }>>`
      SELECT result FROM governance.gate_audit
      WHERE authorization_id = ${job.authorization_id}::uuid
      LIMIT 1
    `;

    if (auth.length === 0 || auth[0].result !== 'ALLOW') {
      // No valid authorization — mark as failed
      await this.prisma.$executeRaw`
        UPDATE public.crossref_deposit_queue
        SET deposit_status = 'failed',
            last_error = 'No valid Release Gate ALLOW authorization found',
            updated_at = now()
        WHERE id = ${job.id}::uuid
      `;
      return 0;
    }

    // Mark as depositing
    await this.prisma.$executeRaw`
      UPDATE public.crossref_deposit_queue
      SET deposit_status = 'depositing', updated_at = now()
      WHERE id = ${job.id}::uuid
    `;

    // Fetch article metadata for XML generation
    const article = await this.prisma.$queryRaw<Array<{
      doi: string; title: string; abstract: string | null;
      journal_name: string; journal_issn: string | null;
      license_url: string | null; license_type: string | null;
    }>>`
      SELECT a.doi, a.title, a.abstract,
             j.name as journal_name, j.issn as journal_issn,
             a.license_url, a.license_type
      FROM public.articles a
      JOIN public.journals j ON a.journal_id = j.id
      WHERE a.id = ${job.article_id}::uuid
    `;

    if (article.length === 0) {
      await this.prisma.$executeRaw`
        UPDATE public.crossref_deposit_queue
        SET deposit_status = 'failed', last_error = 'Article not found', updated_at = now()
        WHERE id = ${job.id}::uuid
      `;
      return 0;
    }

    // Fetch structured metadata
    const authors = await this.prisma.$queryRaw<Array<{ given_name: string; family_name: string; orcid: string | null; orcid_authenticated: boolean }>>`
      SELECT given_name, family_name, orcid, orcid_authenticated
      FROM public.article_authors_structured
      WHERE article_id = ${job.article_id}::uuid
      ORDER BY author_order
    `;

    const affiliations = await this.prisma.$queryRaw<Array<{ institution: string; ror_id: string | null }>>`
      SELECT af.institution, af.ror_id
      FROM public.author_affiliations af
      JOIN public.article_authors_structured aas ON af.author_id = aas.id
      WHERE aas.article_id = ${job.article_id}::uuid
      ORDER BY af.affiliation_order
    `;

    const references = await this.prisma.$queryRaw<Array<{ doi: string | null; citation_text: string }>>`
      SELECT doi, citation_text FROM public.article_references
      WHERE article_id = ${job.article_id}::uuid ORDER BY reference_order
    `;

    const funding = await this.prisma.$queryRaw<Array<{ funder_name: string; funder_doi: string | null; award_number: string | null }>>`
      SELECT funder_name, funder_doi, award_number FROM public.article_funding
      WHERE article_id = ${job.article_id}::uuid
    `;

    const pubDates = await this.prisma.$queryRaw<Array<{ date_type: string; date_value: string }>>`
      SELECT date_type, date_value::text FROM public.publication_dates
      WHERE article_id = ${job.article_id}::uuid AND superseded_by IS NULL
    `;

    // Generate XML
    const xml = generateDepositXml({
      doi: article[0].doi,
      title: article[0].title,
      abstract: article[0].abstract || undefined,
      journalTitle: article[0].journal_name,
      journalIssn: article[0].journal_issn || undefined,
      authors: authors.map(a => ({
        givenName: a.given_name,
        familyName: a.family_name,
        orcid: a.orcid || undefined,
        orcidAuthenticated: a.orcid_authenticated,
      })),
      affiliations: affiliations.map(a => ({
        institution: a.institution,
        rorId: a.ror_id || undefined,
      })),
      references: references.map(r => ({
        doi: r.doi || undefined,
        citationText: r.citation_text,
      })),
      funding: funding.map(f => ({
        funderName: f.funder_name,
        funderDoi: f.funder_doi || undefined,
        awardNumber: f.award_number || undefined,
      })),
      publicationDates: pubDates.map(d => ({
        dateType: d.date_type,
        dateValue: d.date_value,
      })),
      licenseUrl: article[0].license_url || undefined,
      licenseType: article[0].license_type || undefined,
    });

    // Submit to Crossref
    const result = await this.httpClient.submit(xml, this.crossrefConfig);

    if (result.success) {
      await this.prisma.$executeRaw`
        UPDATE public.crossref_deposit_queue
        SET deposit_status = 'confirmed',
            deposit_xml = ${xml},
            crossref_response = ${result.responseBody || ''},
            deposited_at = now(),
            confirmed_at = now(),
            updated_at = now()
        WHERE id = ${job.id}::uuid
      `;
    } else {
      const newRetry = job.retry_count + 1;
      const status = newRetry >= job.max_retries ? 'failed' : 'redeposit';
      await this.prisma.$executeRaw`
        UPDATE public.crossref_deposit_queue
        SET deposit_status = ${status},
            deposit_xml = ${xml},
            crossref_response = ${result.responseBody || ''},
            last_error = ${result.errorMessage || `HTTP ${result.responseCode}`},
            retry_count = ${newRetry},
            updated_at = now()
        WHERE id = ${job.id}::uuid
      `;
    }

    return 1;
  }
}

/**
 * Queues a Crossref deposit job for an article after Release Gate ALLOW.
 */
export async function queueCrossrefDeposit(
  articleId: string,
  authorizationId: string,
  prisma: PrismaClient
): Promise<void> {
  // Idempotent: ON CONFLICT prevents duplicate queue entries
  await prisma.$executeRaw`
    INSERT INTO public.crossref_deposit_queue (article_id, authorization_id, deposit_status)
    VALUES (${articleId}::uuid, ${authorizationId}, 'pending')
    ON CONFLICT DO NOTHING
  `;
}
