import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { generatePublishedPdf } from '@/lib/generate-pdf';
import { logAuditEvent } from '@/lib/audit';
import { withAuth } from '@/lib/rbac';
import { onSuccessfulPublication } from '@/governance/lib/integration/publication-integration';
import { PrismaClient } from '@prisma/client';

const governancePrisma = new PrismaClient();

/**
 * POST /api/admin/articles/publish
 *
 * Body: { articleId: string, action?: 'publish' | 'regenerate' }
 *
 * - 'publish' (default): Sets status to 'published', generates house PDF, sets published_pdf_url
 * - 'regenerate': Re-generates the house PDF for an already-published article
 *
 * POST-PUBLICATION INTEGRATION (WS-D+H):
 * After successful publication, invokes onSuccessfulPublication() which:
 * 1. Checks for valid Release Gate ALLOW authorization
 * 2. If ALLOW: queues Crossref deposit job
 * 3. Triggers preservation (BagIt package)
 *
 * Side-effect failures are non-blocking (durable job creation, async workers).
 * Publication is NOT rolled back if Crossref queue or preservation fails.
 */
export const POST = withAuth({ roles: ['admin', 'editor'] }, async (request, ctx) => {
  try {
    const { supabaseAdmin, user } = ctx;

    const body = await request.json();
    const { articleId, action = 'publish' } = body;

    if (!articleId) {
      return NextResponse.json({ error: 'Missing articleId' }, { status: 400 });
    }

    // Fetch full article data needed for PDF generation
    const { data: article, error: fetchError } = await supabaseAdmin
      .from('articles')
      .select(`
        id, title, abstract, content, keywords, doi, status, published_at, pdf_url, use_author_pdf_as_final,
        journals ( name, issn ),
        article_authors (
          co_author_name,
          profiles ( full_name, affiliation )
        )
      `)
      .eq('id', articleId)
      .single() as { data: any; error: any };

    if (fetchError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Validate action
    if (action === 'regenerate' && article.status !== 'published') {
      return NextResponse.json(
        { error: 'Can only regenerate PDF for published articles' },
        { status: 400 }
      );
    }

    // If publishing, update status and published_at first
    if (action === 'publish') {
      if (article.status === 'published') {
        return NextResponse.json(
          { error: 'Article is already published' },
          { status: 400 }
        );
      }

      const { error: updateError } = await (supabaseAdmin as any)
        .from('articles')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', articleId);

      if (updateError) {
        throw new Error(`Failed to update article status: ${updateError.message}`);
      }
    }

    let publishedPdfUrl = '';
    
    if (article.use_author_pdf_as_final) {
      publishedPdfUrl = article.pdf_url || '';
      console.log(`[Publish] Skipping PDF generation. Using author's PDF as final: ${publishedPdfUrl}`);
    } else {
      // Build author data for PDF template
      const authors = (article.article_authors || []).map((aa: any) => ({
        name: aa.profiles?.full_name || aa.co_author_name || 'Unknown Author',
        affiliation: aa.profiles?.affiliation || null,
      }));

      if (authors.length === 0) {
        authors.push({ name: 'Unknown Author', affiliation: null });
      }

      // Generate PDF
      const pdfArticleData = {
        id: article.id,
        title: article.title,
        abstract: article.abstract,
        content: article.content,
        keywords: article.keywords,
        doi: article.doi,
        published_at: action === 'publish' ? new Date().toISOString() : article.published_at,
        journal_name: article.journals?.name || null,
        journal_issn: article.journals?.issn || null,
        authors,
      };

      try {
        publishedPdfUrl = await generatePublishedPdf(pdfArticleData);
      } catch (pdfError: any) {
        console.error('[Publish] PDF generation failed:', pdfError);
        // If publishing, the status is already updated — return success with a warning
        if (action === 'publish') {
          return NextResponse.json({
            success: true,
            warning: 'Article published but PDF generation failed. You can regenerate it later.',
            pdfError: pdfError.message,
          });
        }
        return NextResponse.json(
          { error: `PDF generation failed: ${pdfError.message}` },
          { status: 500 }
        );
      }
    }

    // Update published_pdf_url
    const { error: pdfUpdateError } = await (supabaseAdmin as any)
      .from('articles')
      .update({ published_pdf_url: publishedPdfUrl })
      .eq('id', articleId);

    if (pdfUpdateError) {
      console.error('[Publish] Failed to update published_pdf_url:', pdfUpdateError);
    }

    // Audit log
    const auditAction = action === 'publish' ? 'article_published' : 'article_updated';
    await logAuditEvent({
      actorId: user.id,
      action: auditAction,
      targetType: 'article',
      targetId: articleId,
      metadata: {
        action,
        published_pdf_url: publishedPdfUrl,
        ...(action === 'publish' ? { from_status: article.status, to_status: 'published' } : {}),
      },
    });

    // ─── POST-PUBLICATION INTEGRATION (WS-D+H) ────────────────────────────
    // After successful publication, trigger:
    // 1. Crossref deposit queue (if Release Gate ALLOW exists)
    // 2. Preservation (BagIt dark archive package)
    //
    // These are non-blocking side effects. If they fail, the article
    // is still published — the failure is durably recorded.
    if (action === 'publish') {
      try {
        const result = await onSuccessfulPublication(articleId, governancePrisma);
        console.log(`[Publish] Post-publication: crossrefQueued=${result.crossrefQueued} preservationTriggered=${result.preservationTriggered}`);
      } catch (integrationError) {
        // Non-blocking — publication succeeded, side effects will be retried by workers
        console.error('[Publish] Post-publication integration failed (non-blocking):', integrationError);
      }
    }

    return NextResponse.json({
      success: true,
      published_pdf_url: publishedPdfUrl,
      action,
    });
  } catch (e: any) {
    console.error('[Publish Route] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
});
