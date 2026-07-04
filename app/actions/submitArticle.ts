'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';

export interface SubmitArticlePayload {
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

async function sendSubmissionConfirmation(
  recipientEmail: string,
  recipientName: string,
  articleTitle: string,
  journalName: string
) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log(`[Email] submission_received: To=${recipientEmail}, Article=${articleTitle} (no API key, logged only)`);
    return;
  }

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

  const subject = `Manuscript Submission Received - ${articleTitle}`;
  const html = `${baseStyles}
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

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Opus Publica <notifications@opuspublica.com>',
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Email] Resend error:', err);
    } else {
      console.log(`[Email] submission_received sent to ${recipientEmail}`);
    }
  } catch (err) {
    console.error('[Email] Failed to send submission confirmation:', err);
  }
}

export async function submitArticle(payload: SubmitArticlePayload, accessToken: string) {
  try {
    if (!accessToken) {
      return { success: false, error: 'Access Denied: You must be authenticated to submit articles.' };
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) {
      return { success: false, error: 'Access Denied: Invalid or expired secure session token. Please log in again.' };
    }

    const userId = user.id;

    if (!payload.title || !payload.abstract || !payload.journalId) {
      return { success: false, error: 'Validation Error: Title, Abstract, and Journal Selection are required.' };
    }

    if (!payload.pdfFile) {
      return { success: false, error: 'Validation Error: PDF Manuscript file is required.' };
    }

    const fileBuffer = Buffer.from(payload.pdfFile.base64, 'base64');
    const cleanFileName = payload.pdfFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const storagePath = `submissions/${Date.now()}_${userId}_${cleanFileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('publications')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      return { success: false, error: `Upload Failed: ${uploadError.message}` };
    }

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

    const { data: newArticle, error: artError } = await supabaseAdmin
      .from('articles')
      .insert({
        title: payload.title,
        abstract: payload.abstract,
        content: payload.content,
        status: 'pending_review',
        journal_id: payload.journalId,
        pdf_url: storagePath,
        version: 1,
        funder_name: payload.funderName || null,
        funder_award_number: payload.funderAwardNumber || null,
        funder_id: payload.funderId || null,
        keywords: payload.keywords || null,
        conflict_of_interest_statement: payload.conflictOfInterestStatement || null,
        data_availability_statement: payload.dataAvailabilityStatement || null,
        ethics_approval_statement: payload.ethicsApprovalStatement || null
      } as any)
      .select()
      .single();

    if (artError || !newArticle) {
      return { success: false, error: `Database Error: ${artError?.message || 'Failed to save article.'}` };
    }

    for (const aId of authorIds) {
      await supabaseAdmin
        .from('article_authors')
        .insert({
          article_id: (newArticle as any).id,
          profile_id: aId
        } as any);
    }

    for (const co of externalCoAuthors) {
      await supabaseAdmin
        .from('article_authors')
        .insert({
          article_id: (newArticle as any).id,
          co_author_name: co.name,
          co_author_orcid: co.orcid || null,
          co_author_ror_id: co.rorId || null
        } as any);
    }

    // Send submission confirmation email to the author
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

    if (authorProfile?.email) {
      await sendSubmissionConfirmation(
        authorProfile.email,
        authorProfile.full_name || 'Author',
        payload.title,
        journal?.name || 'Unknown Journal'
      );
    }

    return { success: true, articleId: (newArticle as any).id };

  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected server error occurred.' };
  }
}
