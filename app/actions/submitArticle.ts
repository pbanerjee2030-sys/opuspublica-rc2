'use server';

import { withActionAuth, AuthContext } from '@/lib/rbac';
import * as mammoth from 'mammoth';
import * as crypto from 'crypto';

export interface SubmitArticlePayload {
  submissionId: string; // WP-01-01 Idempotency key
  title: string;
  abstract: string;
  content: string;
  journalId: string;
  coAuthors: { name: string; orcid: string; rorId?: string }[];
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

function generateSubmissionEmailHtml(
  recipientName: string,
  articleTitle: string,
  journalName: string
) {
  const baseStyles = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #1A1A2E; padding: 30px; text-align: center;">
        <h1 style="color: #C9A84C; margin: 0; font-size: 24px; font-family: Georgia, serif;">Opus Publica</h1>
        <p style="color: #ffffff80; margin: 5px 0 0; font-size: 12px;">Global Public Policy Research & Publishing</p>
      </div>
      <div style="padding: 30px; color: #333;">
  `;
  const footerStyles = `
      </div>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 11px; color: #666;">
        <p>Advocacy Unified Network | Fluwelen Burgwal 58, 2511 CJ Den Haag, Netherlands</p>
        <p>This is an automated notification from Opus Publica.</p>
      </div>
    </div>
  `;

  return `${baseStyles}
    <h2 style="color: #1A1A2E; font-size: 18px;">Submission Received</h2>
    <p>Dear ${recipientName || 'Author'},</p>
    <p>Thank you for submitting your manuscript to Opus Publica. We have received your submission and it is now under review.</p>
    <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #C9A84C; margin: 20px 0;">
      <p style="margin: 0;"><strong>Article Title:</strong> ${articleTitle}</p>
      <p style="margin: 5px 0 0;"><strong>Journal:</strong> ${journalName}</p>
      <p style="margin: 5px 0 0;"><strong>Status:</strong> Pending Review</p>
    </div>
    <p>Our editorial team will review your submission and get back to you within 2-4 weeks.</p>
    <p>Best regards,<br/>The Opus Publica Editorial Team</p>
  ${footerStyles}`;
}

export const submitArticle = withActionAuth(
  { roles: [] },
  async (ctx: AuthContext, payload: SubmitArticlePayload, accessToken?: string) => {
    const { supabaseAdmin, user } = ctx;
    const userId = user.id;

    if (!payload.submissionId) {
      return { success: false, error: 'Validation Error: submissionId is required for idempotency.' };
    }

    if (!payload.title || !payload.abstract || !payload.journalId) {
      return { success: false, error: 'Validation Error: Title, Abstract, and Journal Selection are required.' };
    }

    if (!payload.pdfFile) {
      return { success: false, error: 'Validation Error: DOCX Manuscript file is required.' };
    }

    // 1. Generate Deterministic Fingerprint from Raw Submission Intent
    const fingerprintInput = JSON.stringify({
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
    const fingerprint = crypto.createHash('sha256').update(fingerprintInput).digest('hex');

    // 2. Process Manuscript and convert to HTML
    const fileBuffer = Buffer.from(payload.pdfFile.base64, 'base64');
    const cleanFileName = payload.pdfFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
    // A conflicting payload produces a different fingerprint-derived Storage path, so it cannot 
    // overwrite the original claim-check object through deterministic path derivation unless it 
    // reproduces the original fingerprint.
    const storagePath = `submissions/${payload.submissionId}_${fingerprint}_${cleanFileName}`;

    let extractedHtml = '';
    try {
      const result = await mammoth.convertToHtml({ buffer: fileBuffer });
      const rawHtml = result.value;
      const { normalizeManuscript } = await import('@/lib/opce');
      extractedHtml = await normalizeManuscript(rawHtml, payload.journalId);
    } catch (err: any) {
      return { success: false, error: `Failed to extract HTML from DOCX: ${err.message}` };
    }

    // 3. Upload to Storage (Claim Check pattern) - safe to retry due to upsert: true
    const { error: uploadError } = await supabaseAdmin.storage
      .from('publications')
      .upload(storagePath, fileBuffer, {
        contentType: payload.pdfFile.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });

    if (uploadError) {
      return { success: false, error: `Upload Failed: ${uploadError.message}` };
    }

    // 4. Resolve internal vs external co-authors
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

    // 5. Resolve submitter details for email notification
    const { data: authorProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single() as { data: any };

    const { data: journal } = await supabaseAdmin
      .from('journals')
      .select('name')
      .eq('id', payload.journalId)
      .single() as { data: any };

    // Construct email payload if submitter has email
    let emailPayload = null;
    if (authorProfile?.email) {
      emailPayload = {
        to: authorProfile.email,
        subject: `Manuscript Submission Received - ${payload.title}`,
        html: generateSubmissionEmailHtml(
          authorProfile.full_name || 'Author',
          payload.title,
          journal?.name || 'Unknown Journal'
        )
      };
    }

    // 6. Build Outbox Event Payload
    const outboxPayload = {
      articleId: payload.submissionId, // Use submissionId as articleId to guarantee 1:1 mapping
      actorId: userId,
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
      email: emailPayload,
      fingerprint // Attached for later replay verification
    };

    // 7. Atomically Insert Outbox Event
    // Using submissionId as outbox.id to enforce idempotency at the database level.
    const { error: outboxError } = await supabaseAdmin
      .from('outbox')
      .insert({
        id: payload.submissionId,
        event_type: 'ArticleSubmitted',
        payload: outboxPayload,
        status: 'pending'
      });

    if (outboxError) {
      if (outboxError.code === '23505') {
        // Deterministic Conflict Handling: check for identical canonical submission intent
        const { data: existingEvent } = await supabaseAdmin
          .from('outbox')
          .select('payload')
          .eq('id', payload.submissionId)
          .single();

        if (existingEvent && existingEvent.payload && existingEvent.payload.fingerprint === fingerprint) {
          // Idempotent replay: identical canonical submission intent + matching fingerprint -> return success with existing ID
          return { success: true, articleId: payload.submissionId };
        } else {
          // Materially different payload -> Deterministic conflict failure
          // Attempt to delete the newly created conflicting Storage object.
          // If immediate compensation fails, the object remains an orphan and is subsequently eligible 
          // for the existing asynchronous orphan-reconciliation process. This cannot mutate or overwrite 
          // the original submission's claim-check artifact because the conflicting request uses a 
          // distinct fingerprint-derived Storage path.
          await supabaseAdmin.storage.from('publications').remove([storagePath]);
          return { success: false, error: 'Conflict Error: A submission with this ID already exists with different content.' };
        }
      }

      // Other DB errors
      await supabaseAdmin.storage.from('publications').remove([storagePath]);
      return { success: false, error: `Database Error: Failed to queue submission (${outboxError.message})` };
    }

    return { success: true, articleId: payload.submissionId };
  }
);
