import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';
import { onLifecycleEvent } from '@/governance/lib/integration/publication-integration';
import { PrismaClient } from '@prisma/client';

// WS-B: Lifecycle Event API — REAL runtime path
// POST /api/admin/articles/[articleId]/lifecycle
//
// Authorized lifecycle action:
// → append-only lifecycle event
// → derived scholarly state
// → Crossref update/redeposit queue where applicable
//
// Does NOT mutate articles.status.

const prisma = new PrismaClient();

export const POST = withAuth({ roles: ['admin', 'editor'] }, async (request: NextRequest, ctx) => {
  try {
    const { supabaseAdmin, user } = ctx;
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const articleId = pathParts[pathParts.length - 2];

    const body = await request.json();
    const { eventType, effectiveDate, evidence, rationale, relatedArticleId } = body;

    const validTypes = ['CORRECTION', 'RETRACTION', 'EXPRESSION_OF_CONCERN', 'WITHDRAWAL'];
    if (!validTypes.includes(eventType)) {
      return NextResponse.json({ error: `Invalid eventType: ${eventType}` }, { status: 422 });
    }
    if (!effectiveDate) {
      return NextResponse.json({ error: 'effectiveDate is required' }, { status: 422 });
    }

    const { data: article, error: fetchError } = await supabaseAdmin
      .from('articles')
      .select('id, title, doi, status')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Create append-only lifecycle event
    await prisma.$executeRaw`
      INSERT INTO public.article_lifecycle_events (
        article_id, event_type, effective_date, authority,
        evidence, rationale, related_article_id, is_active
      ) VALUES (
        ${articleId}::uuid, ${eventType}, ${effectiveDate}::date,
        ${user.id}::uuid, ${evidence || null}, ${rationale || null},
        ${relatedArticleId ? prisma.$queryRaw`${relatedArticleId}::uuid` : null},
        true
      )
    `;

    // Trigger Crossref redeposit if applicable (non-blocking)
    try {
      await onLifecycleEvent(articleId, eventType, prisma);
    } catch (crossrefError) {
      console.error('[Lifecycle] Crossref update queue failed:', crossrefError);
    }

    // Audit log
    await logAuditEvent({
      actorId: user.id,
      action: 'article_lifecycle_event' as any,
      targetType: 'article',
      targetId: articleId,
      metadata: { eventType, effectiveDate, evidence, rationale },
    });

    return NextResponse.json({
      success: true,
      eventType,
      articleId,
      message: `${eventType} event recorded for article ${articleId}`,
    });
  } catch (e: any) {
    console.error('[Lifecycle Route] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
});
