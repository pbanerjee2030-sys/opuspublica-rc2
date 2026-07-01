'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';

export interface SubmitArticlePayload {
  title: string;
  abstract: string;
  journalId: string;
  coAuthors: { name: string; orcid: string }[];
  pdfFile: {
    name: string;
    type: string;
    base64: string;
  } | null;
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
    const externalCoAuthors: { name: string; orcid: string }[] = [];

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
        externalCoAuthors.push({ name: cleanName, orcid: coAuthor.orcid || '' });
      }
    }

    const { data: newArticle, error: artError } = await supabaseAdmin
      .from('articles')
      .insert({
        title: payload.title,
        abstract: payload.abstract,
        content: `<p>${payload.abstract}</p>`,
        status: 'pending_review',
        journal_id: payload.journalId,
        pdf_url: storagePath,
        published_at: null,
        version: 1
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
          co_author_orcid: co.orcid || null
        } as any);
    }

    return { success: true, articleId: (newArticle as any).id };

  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected server error occurred.' };
  }
}
