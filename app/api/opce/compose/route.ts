import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac';
import { compose, type QualityReport } from '@/lib/opce';
import { logAuditEvent } from '@/lib/audit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

import { authGuard, requireAdminOrEditor } from '@/lib/auth';

export const POST = withAuth({ roles: ['admin', 'editor'] }, async (req, ctx) => {
  try {
    const { supabaseAdmin, user } = ctx;

    const body = await req.json();
    const { articleId, mode, config } = body;

    if (!articleId || typeof articleId !== 'string') {
      return NextResponse.json({ error: 'articleId is required' }, { status: 400 });
    }

    

    const renderMode: 'draft' | 'publication' = mode === 'publication' ? 'publication' : 'draft';

    const { data: article, error: dbError } = await supabaseAdmin
      .from('articles')
      .select(`
        id, title, abstract, content, doi, keywords, funder_name, funder_award_number, funder_id, conflict_of_interest_statement, data_availability_statement, ethics_approval_statement, published_at, published_pdf_url, canonical_package_url,
        journal:journals ( id, name, slug, issn, publisher ),
        authors:article_authors ( 
          profile:profiles ( id, full_name, orcid, ror_id, affiliation ),
          co_author_name, co_author_orcid, co_author_ror_id 
        )
      `)
      .eq('id', articleId)
      .single() as any;

    if (dbError || !article) {
      return NextResponse.json({ error: 'Failed to fetch article' }, { status: 404 });
    }

    if (!article.content || article.content.trim() === '') {
      return NextResponse.json({ error: 'Article has no manuscript content to compose' }, { status: 400 });
    }

    const publication = {
      article: {
        id: article.id,
        title: article.title,
        abstract: article.abstract,
        manuscriptHtml: article.content,
        doi: article.doi,
        keywords: article.keywords || [],
        chronology: {
          publishedAt: article.published_at
        }
      },
      journal: {
        name: article.journal?.name,
        issn: article.journal?.issn,
        publisher: article.journal?.publisher || 'Advocacy Unified Network',
        slug: article.journal?.slug
      },
      authors: (article.authors || []).map((a: any) => {
        if (a.profile) {
          return {
            name: a.profile.full_name,
            orcid: a.profile.orcid,
            rorId: a.profile.ror_id,
            affiliations: a.profile.affiliation ? [{ name: a.profile.affiliation }] : []
          };
        } else {
          return {
            name: a.co_author_name || 'Anonymous',
            orcid: a.co_author_orcid || null,
            rorId: a.co_author_ror_id,
            affiliations: []
          };
        }
      }),
      funding: {
        funder_name: article.funder_name,
        funder_id: article.funder_id,
        funder_award_number: article.funder_award_number
      },
      declarations: {
        conflict_of_interest_statement: article.conflict_of_interest_statement,
        data_availability_statement: article.data_availability_statement,
        ethics_approval_statement: article.ethics_approval_statement
      },
      identifiers: {
        articleId: article.id,
        journalId: article.journal?.id
      }
    };

    // Execute OPCE Composition Pipeline
    const result = await compose(
      publication, 
      {
        mode: renderMode,
        initiatedBy: 'system-editor',
        journalStyleOverrides: config
      }
    );

    const report = result.qualityReport as QualityReport | null;

    // Log audit event using existing Opus Publica audit system
    await logAuditEvent({
      actorId: 'system-editor',
      action: 'article_updated',
      targetType: 'article',
      targetId: articleId,
      metadata: {
        opceSessionId: result.sessionId,
        renderMode,
        qualityScore: report?.summary?.score ?? null,
        success: result.success,
      },
    });

    return NextResponse.json({
      ...result,
      htmlPreview: result.htmlPreview || article.content,
      existingPdfUrl: article.published_pdf_url || (article.canonical_package_url ? `${article.canonical_package_url}/publisher.pdf` : null)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Composition execution failed' }, { status: 500 });
  }
});
