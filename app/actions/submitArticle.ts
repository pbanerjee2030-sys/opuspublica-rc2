'use server';

import { withActionAuth, AuthContext } from '@/lib/rbac';
import * as mammoth from 'mammoth';
import * as crypto from 'crypto';
import { validateSubmissionCompleteness } from '../../lib/submission/preflight';

export interface SubmitArticlePayload {
  idempotencyKey: string;
  title: string;
  abstract: string;
  content: string;
  journalId: string;
  articleType?: string;
  license?: string;
  coAuthors: {
    name: string;
    orcid?: string;
    rorId?: string;
    email?: string;
    isCorresponding?: boolean;
    affiliations?: string[];
  }[];
  pdfFile: {
    name: string;
    type: string;
    base64: string;
  } | null;
  funderName?: string;
  funderAwardNumber?: string;
  funderId?: string;
  keywords?: string[];
  conflictOfInterestStatement?: string;
  dataAvailabilityStatement?: string;
  ethicsApprovalStatement?: string;
}



export const submitArticle = withActionAuth(
  { roles: [] },
  async (ctx: AuthContext, payload: SubmitArticlePayload, accessToken?: string) => {
    const { supabaseAdmin, user } = ctx;
    const userId = user.id;

    if (!payload.idempotencyKey) {
      return { success: false, error: 'Validation Error: idempotencyKey is required.' };
    }

    if (!payload.title || !payload.abstract || !payload.journalId) {
      return { success: false, error: 'Validation Error: Title, Abstract, and Journal Selection are required.' };
    }

    if (!payload.pdfFile) {
      return { success: false, error: 'Validation Error: DOCX Manuscript file is required.' };
    }

    // 1. Generate Deterministic Intent Hash
    const intentHashInput = JSON.stringify({
      title: payload.title,
      abstract: payload.abstract,
      journalId: payload.journalId,
      coAuthors: payload.coAuthors,
      pdfFileHash: crypto.createHash('sha256').update(payload.pdfFile.base64).digest('hex'),
      funderName: payload.funderName || null,
      funderAwardNumber: payload.funderAwardNumber || null,
      funderId: payload.funderId || null,
      keywords: payload.keywords || null,
      conflictOfInterestStatement: payload.conflictOfInterestStatement || null,
      dataAvailabilityStatement: payload.dataAvailabilityStatement || null,
      ethicsApprovalStatement: payload.ethicsApprovalStatement || null,
    });
    const intentHash = crypto.createHash('sha256').update(intentHashInput).digest('hex');

    // 2. Process Manuscript and convert to HTML
    const fileBuffer = Buffer.from(payload.pdfFile.base64, 'base64');
    const cleanFileName = payload.pdfFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
    
    // Path uses idempotency key + intent hash
    const storagePath = `submissions/${payload.idempotencyKey}_${intentHash}_${cleanFileName}`;

    let extractedHtml = '';
    try {
      const result = await mammoth.convertToHtml({ buffer: fileBuffer });
      const rawHtml = result.value;
      const { normalizeManuscript } = await import('@/lib/opce');
      extractedHtml = await normalizeManuscript(rawHtml, payload.journalId);
    } catch (err: any) {
      return { success: false, error: `Failed to extract HTML from DOCX: ${err.message}` };
    }

    // 3. Upload to Storage (Claim Check pattern)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('publications')
      .upload(storagePath, fileBuffer, {
        contentType: payload.pdfFile.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });

    if (uploadError) {
      return { success: false, error: `Upload Failed: ${uploadError.message}` };
    }

    // 4. Resolve co-authors
    const authorIds: string[] = [userId];
    const externalCoAuthors: { name: string; orcid: string; rorId?: string }[] = [];

    for (const coAuthor of payload.coAuthors) {
      const cleanName = coAuthor.name.trim();
      if (!cleanName) continue;

      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('full_name', cleanName)
        .maybeSingle();

      if (existingProfile) {
        authorIds.push((existingProfile as any).id);
      } else {
        externalCoAuthors.push({ 
          name: cleanName, 
          orcid: coAuthor.orcid || '', 
          rorId: coAuthor.rorId || '' 
        });
      }
    }


    // 6. Build RPC Payload
    const rpcPayload = {
      title: payload.title,
      abstract: payload.abstract,
      content: extractedHtml,
      journalId: payload.journalId,
      storagePath,
      authorIds,
      externalCoAuthors,
      funderName: payload.funderName || null,
      funderAwardNumber: payload.funderAwardNumber || null,
      funderId: payload.funderId || null,
      keywords: payload.keywords || null,
      conflictOfInterestStatement: payload.conflictOfInterestStatement || null,
      dataAvailabilityStatement: payload.dataAvailabilityStatement || null,
      ethicsApprovalStatement: payload.ethicsApprovalStatement || null,
      intent_hash: intentHash
    };

    // 6.5 Preflight Completeness Check
    const { data: journalData } = await supabaseAdmin
      .from('journals')
      .select('name')
      .eq('id', payload.journalId)
      .single();
    
    const journalName = journalData?.name || 'Unknown Journal';
    
    // Construct Preflight inputs
    const submissionForm = {
      authors: payload.coAuthors.map(a => ({
        name: a.name,
        email: a.email,
        orcid: a.orcid,
        affiliations: a.affiliations,
        isCorresponding: a.isCorresponding
      })),
      funding_declaration: (payload.funderName || payload.funderAwardNumber) ? `${payload.funderName} ${payload.funderAwardNumber}` : '',
      conflict_of_interest_declaration: payload.conflictOfInterestStatement || '',
      license: payload.license || '',
      article_type: payload.articleType || 'Journal Article'
    };

    const manuscriptData = {
      hasContent: true, // We successfully processed the PDF/DOCX
      title: payload.title, // In a real parser, we'd extract from HTML. Here we fall back to payload.
      abstract: payload.abstract,
      keywords: payload.keywords,
      references: extractedHtml.includes('class="references"') ? ['ref'] : [] // extremely naive references check for validation
    };

    const preflightResult = validateSubmissionCompleteness({
      journal: journalName,
      articleType: payload.articleType || 'Journal Article',
      submissionForm,
      manuscript: manuscriptData
    });

    if (!preflightResult.complete) {
      await supabaseAdmin.storage.from('publications').remove([storagePath]);
      return { 
        success: false, 
        error: 'Validation Error: Submission is incomplete.', 
        missingRequiredFields: preflightResult.missingRequiredFields,
        validationErrors: preflightResult.errors
      };
    }

    // 7. Transition Boundary
    const newSubmissionId = crypto.randomUUID();
    const newArticleId = crypto.randomUUID();

    // Create an authenticated client to call the RPC
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    let authHeader = '';
    if (accessToken) {
      authHeader = `Bearer ${accessToken}`;
    } else {
      try {
        const { getSupabaseServerClient } = await import('@/lib/supabaseServer');
        const supabaseServer = await getSupabaseServerClient();
        const { data: { session } } = await supabaseServer.auth.getSession();
        if (session?.access_token) {
          authHeader = `Bearer ${session.access_token}`;
        }
      } catch (e) {
        // Ignore
      }
    }
    
    const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : undefined
      }
    });

    const { data: transitionResult, error: rpcError } = await authenticatedClient.rpc('submit_article_transition', {
      p_submission_id: newSubmissionId,
      p_article_id: newArticleId,
      p_idempotency_key: payload.idempotencyKey,
      p_intent_hash: intentHash,
      p_payload: rpcPayload
    });

    if (rpcError) {
      await supabaseAdmin.storage.from('publications').remove([storagePath]);
      return { success: false, error: `Transition Error: ${rpcError.message}` };
    }

    if (!transitionResult.success) {
      await supabaseAdmin.storage.from('publications').remove([storagePath]);
      return { success: false, error: 'Transition Error: Failed to process submission.' };
    }

    return { success: true, articleId: transitionResult.article_id, submissionId: transitionResult.submission_id };
  }
);
