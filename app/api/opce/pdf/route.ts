import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { logAuditEvent } from '@/lib/audit';
import { generatePublishedPdf } from '@/lib/generate-pdf';
import { generatePublicationPath } from '@/lib/opce/canonical';
import * as fs from 'fs';

export const POST = withAuth({ roles: ['admin', 'editor'] }, async (req, ctx) => {
  try {
    const { supabaseAdmin, user } = ctx;

    const body = await req.json();
    const { articleId } = body;

    if (!articleId) {
      return NextResponse.json({ error: 'articleId is required' }, { status: 400 });
    }

    // 1. Fetch article to get canonical_package_url and content
    const { data: article, error: fetchError } = await (supabaseAdmin as any)
      .from('articles')
      .select('id, title, content, status, canonical_package_url, canonical_checksum, published_pdf_url')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    if (article.status !== 'accepted' && article.status !== 'published') {
      return NextResponse.json({ error: 'Article must be accepted before generating publisher PDF' }, { status: 400 });
    }

    if (!article.canonical_package_url) {
      return NextResponse.json({ error: 'No canonical artifact found. Please Accept Preview first.' }, { status: 400 });
    }

    const publishedPdfStoragePath = generatePublicationPath(article.canonical_package_url);

    // Idempotency: If published_pdf_url already exists AND matches the current canonical package, return success without regenerating
    if (article.published_pdf_url) {
      if (article.published_pdf_url === publishedPdfStoragePath) {
        return NextResponse.json({ 
          success: true, 
          canonical_package_url: article.canonical_package_url,
          published_pdf_url: article.published_pdf_url
        });
      } else {
        return NextResponse.json({ error: 'Publisher PDF already generated and cannot be overwritten' }, { status: 403 });
      }
    }

    const htmlContent = article.content || '';
    
    const localPdfPath = await generatePublishedPdf({
      id: article.id,
      title: article.title,
      abstract: null,
      content: htmlContent, // Frozen HTML
      keywords: null,
      doi: null,
      published_at: null,
      journal_name: null,
      journal_issn: null,
      authors: [],
    }, publishedPdfStoragePath);

    // 4. Update published_pdf_url on article
    const { error: updateError } = await (supabaseAdmin as any)
      .from('articles')
      .update({ published_pdf_url: publishedPdfStoragePath })
      .eq('id', articleId);

    if (updateError) {
      console.error('Failed to update published_pdf_url:', JSON.stringify(updateError));
      return NextResponse.json({ error: 'Failed to update publication artifact path' }, { status: 500 });
    }

    // 5. Cleanup local temp file
    if (fs.existsSync(localPdfPath)) {
      fs.unlinkSync(localPdfPath);
    }

    // 6. Log the audit event
    await logAuditEvent({
      actorId: user.id,
      action: 'article_updated',
      targetType: 'article',
      targetId: articleId,
      metadata: {
        publishedPdfUrl: publishedPdfStoragePath,
        canonicalPackageUrl: article.canonical_package_url,
        canonicalChecksum: article.canonical_checksum
      }
    });

    return NextResponse.json({ 
      success: true, 
      canonical_package_url: article.canonical_package_url,
      published_pdf_url: publishedPdfStoragePath 
    });

  } catch (err: any) {
    console.error('PDF generation failed:', err);
    return NextResponse.json({ error: err?.message || 'PDF generation failed' }, { status: 500 });
  }
});
