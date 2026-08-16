import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { submitArticle } from '../../app/actions/submitArticle';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Setup Supabase Client
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!SUPABASE_SERVICE_ROLE_KEY, 'length:', SUPABASE_SERVICE_ROLE_KEY.length);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

import { vi } from 'vitest';

// Mock Next.js cookies and OPCE to prevent crashes
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: () => ({ value: 'mock-token' }),
    getAll: () => []
  })
}));

vi.mock('@/lib/opce', () => ({
  normalizeManuscript: async (html: string, journalId: string) => `<h1>Mocked HTML</h1>${html}`
}));

vi.mock('@/lib/generate-pdf', () => ({
  generatePDF: async () => Buffer.from('mock pdf')
}));

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

describe('WP-D V3: Real Submission-Path Metadata Persistence + Event Idempotency', () => {
  let victorProfileId: string;
  let testJournalId: string;
  let accessToken: string;
  const intentHash = randomUUID();
  const idempotencyKey = `e2e-sub-${Date.now()}`;

  beforeAll(async () => {

    // 2. Get or create the test journal using Prisma raw query (bypassing RLS)
    let journals: any = await prisma.$queryRaw`SELECT id FROM public.journals LIMIT 1`;
    if (!journals || journals.length === 0) {
      const newJournalId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO public.journals (id, name, slug) 
        VALUES (${newJournalId}::uuid, 'Test Journal', 'test-journal')
      `;
      testJournalId = newJournalId;
    } else {
      testJournalId = journals[0].id;
    }

    // 4. Authenticate as a real test user to get a valid access token
    const testEmail = `victor.test.${Date.now()}@example.com`;
    const password = 'Password123!';

    // Create the user in GoTrue
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: password,
      email_confirm: true
    });
    if (createError) throw new Error(`Failed to create test user: ${createError.message}`);

    const newUserId = authData.user.id;

    // Create the profile mapping so submitArticle doesn't fail on profile lookup
    await supabase.from('profiles').upsert({
      id: newUserId,
      full_name: 'Victor Samuel',
      email: 'victor.samuel@aunetwork.org'
    });

    // Use the newly created user ID in the test payload
    victorProfileId = newUserId;

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: password
    });
    if (signInError || !signInData.session) throw new Error('Failed to sign in test user');
    
    accessToken = signInData.session.access_token;
  });

  it('should process a submission with rich metadata through the application path and be idempotent on retry', async () => {
    // 1. Create a dummy test file using a real DOCX to pass mammoth parsing
    const sourceFilePath = path.join(process.cwd(), 'node_modules', 'mammoth', 'test', 'test-data', 'empty.docx');
    const testFilePath = path.join(__dirname, 'test_article.docx');
    fs.copyFileSync(sourceFilePath, testFilePath);
    
    const fileBase64 = fs.readFileSync(testFilePath).toString('base64');
    
    // Pass the payload as required by the action
    const submitPayload = {
      title: 'Global Perspectives E2E Test',
      abstract: 'Testing WP-D V3 complete submission path',
      journalId: testJournalId,
      idempotencyKey: idempotencyKey,
      articleType: 'Report / Working Paper',
      license: 'CC BY 4.0',
      funderName: 'Global Science Trust',
      funderId: 'https://ror.org/03yrm5c26',
      conflictOfInterestStatement: 'The authors declare no conflict of interest.',
      keywords: ['Idempotency', 'Submission'],
      pdfFile: {
        name: 'test_article.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        base64: fileBase64
      },
      coAuthors: [
        {
          name: 'Victor Samuel',
          orcid: '0009-0002-4823-962X',
          email: 'victor.samuel@aunetwork.org',
          isCorresponding: true,
          affiliations: ['Advocacy Unified Network']
        },
        {
          name: 'Francisca Oliviera',
          orcid: '0009-0002-1103-7725',
          email: 'francisca@aunetwork.org',
          isCorresponding: false,
          affiliations: ['Test University']
        }
      ]
    };

    // 2. Invoke the Next.js Action directly
    const result = await submitArticle(submitPayload as any, accessToken);

    if (!result.success) {
      console.error('Submit Article Failed:', result.error);
      if (result.missingRequiredFields) console.error('Missing fields:', result.missingRequiredFields);
      if (result.validationErrors) console.error('Validation errors:', result.validationErrors);
    }

    expect(result.success).toBe(true);
    expect(result.articleId).toBeDefined();

    const newArticleId = result.articleId;

    // 3. Verify Database State (using Prisma raw query to bypass RLS/grants)
    const articles: any = await prisma.$queryRaw`SELECT * FROM public.articles WHERE id = ${newArticleId}::uuid`;
    const article = articles[0];

    expect(article).toBeDefined();
    expect(article.article_type).toBe('Report / Working Paper');
    expect(article.license_type).toBe('CC BY 4.0');
    expect(article.funder_name).toBe('Global Science Trust');
    expect(article!.funder_id).toBe('https://ror.org/03yrm5c26');
    expect(article!.conflict_of_interest_statement).toBe('The authors declare no conflict of interest.');
    expect(article!.keywords).toEqual(['Idempotency', 'Submission']);

    const structuredAuthors: any = await prisma.$queryRaw`
      SELECT * FROM public.article_authors_structured 
      WHERE article_id = ${newArticleId}::uuid
      ORDER BY author_order ASC
    `;

    expect(structuredAuthors).toBeDefined();

    expect(structuredAuthors?.length).toBe(2);
    expect(structuredAuthors![0].email).toBe('victor.samuel@aunetwork.org');
    expect(structuredAuthors![0].corresponding).toBe(true);
    expect(structuredAuthors![1].orcid).toBe('0009-0002-1103-7725');
    expect(structuredAuthors![1].corresponding).toBe(false);

    const affiliations: any = await prisma.$queryRaw`
      SELECT * FROM public.author_affiliations 
      WHERE author_id = ${structuredAuthors[0].id}::uuid
      ORDER BY affiliation_order ASC
    `;
    
    expect(affiliations?.length).toBe(1);
    expect(affiliations![0].institution).toBe('Advocacy Unified Network');

    // 4. Run the worker directly to verify idempotency
    // Find the outbox event
    const outboxEvents: any = await prisma.$queryRaw`
      SELECT * FROM public.outbox 
      WHERE event_type = 'ArticleSubmitted'
      AND payload->>'idempotency_key' = ${idempotencyKey}
    `;
    
    expect(outboxEvents?.length).toBe(1);
    const eventId = outboxEvents![0].id;

    // Run the worker for the first time
    const { data: workerResult1 } = await supabaseAdmin.rpc('process_article_submission', { p_outbox_id: eventId });
    expect(workerResult1).toBe(true);

    // Run the worker a second time (should be idempotent / return false or gracefully handle)
    const { data: workerResult2 } = await supabaseAdmin.rpc('process_article_submission', { p_outbox_id: eventId });
    expect(workerResult2).toBe(false); // Because status is no longer 'pending'

    // Verify no duplicates were created
    const duplicateCheck: any = await prisma.$queryRaw`
      SELECT * FROM public.article_authors_structured
      WHERE article_id = ${newArticleId}::uuid
    `;
    
    expect(duplicateCheck?.length).toBe(2);
  });
});

