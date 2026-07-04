import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { logAuditEvent } from '@/lib/audit';

async function authGuard(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const supabaseAdmin = getSupabaseAdmin();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return { supabaseAdmin, user };
}

async function requireRole(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  allowedRoles: string[]
) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single() as { data: any; error: any };
  if (!profile || !allowedRoles.includes(profile.role)) {
    return null;
  }
  return profile;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authGuard(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { supabaseAdmin, user } = auth;

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');

    // stats: admin/editor only
    if (entity === 'stats') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const [articlesRes, journalsRes, usersRes] = await Promise.all([
        supabaseAdmin.from('articles').select('id, title, status, doi, published_at, created_at, journals(name, slug), article_authors(co_author_name, profiles(full_name))'),
        supabaseAdmin.from('journals').select('id, name'),
        supabaseAdmin.from('profiles').select('id, role'),
      ]);
      return NextResponse.json({ articles: articlesRes.data || [], journals: journalsRes.data || [], users: usersRes.data || [] });
    }

    // articles: admin/editor only (sees drafts, rejections, emails)
    if (entity === 'articles') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const { data, error } = await supabaseAdmin
        .from('articles')
        .select(`
          id, title, abstract, status, doi, pdf_url, published_at, created_at, rejection_reason,
          doi_deposit_status, doi_deposited_at, doi_deposit_error,
          journals ( name, slug ),
          article_authors ( co_author_name, profiles ( id, full_name, email ) )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // journals: admin/editor only
    if (entity === 'journals') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const { data, error } = await supabaseAdmin.from('journals').select('*').order('name');
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // books: admin/editor only
    if (entity === 'books') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const { data, error } = await (supabaseAdmin as any).from('books').select('*').order('title');
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // users: admin only
    if (entity === 'users') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin']);
      if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role, bio, affiliation, created_at, journal_id, journals(name, slug)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // reviewers: admin/editor only
    if (entity === 'reviewers') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const [assignmentsRes, articlesRes, reviewersRes] = await Promise.all([
        supabaseAdmin.from('reviewer_assignments').select(`
          id, status, recommendation, comments, created_at,
          articles ( id, title, journals ( name ) ),
          profiles ( full_name )
        `).order('created_at', { ascending: false }),
        supabaseAdmin.from('articles').select('id, title, journals(name)').eq('status', 'pending_review'),
        supabaseAdmin.from('profiles').select('id, full_name').in('role', ['editor', 'reviewer']),
      ]);
      return NextResponse.json({
        assignments: assignmentsRes.data || [],
        assignmentsError: assignmentsRes.error?.message || null,
        articles: articlesRes.data || [],
        reviewers: reviewersRes.data || [],
      });
    }

    // editorial_board_members: admin/editor only (filtered by journal_id)
    if (entity === 'editorial_board_members') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const journalId = searchParams.get('journal_id');
      let query = supabaseAdmin.from('editorial_board_members').select('*').order('sort_order');
      if (journalId) {
        query = query.eq('journal_id', journalId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // compliance: admin/editor — DOAJ readiness per journal
    if (entity === 'compliance') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const { data: journals, error: jErr } = await supabaseAdmin
        .from('journals')
        .select('id, name, slug, issn, aims_and_scope, peer_review_policy, license_type')
        .order('name');
      if (jErr) throw jErr;

      const { data: boardCounts, error: bErr } = await supabaseAdmin
        .from('editorial_board_members')
        .select('journal_id')
        .then(async (res) => {
          if (res.error) return { data: [], error: res.error };
          const counts: Record<string, number> = {};
          (res.data || []).forEach((m: any) => {
            counts[m.journal_id] = (counts[m.journal_id] || 0) + 1;
          });
          return { data: counts, error: null };
        });

      const { data: pubCounts } = await supabaseAdmin
        .from('articles')
        .select('journal_id')
        .eq('status', 'published')
        .then(async (res) => {
          if (res.error) return { data: {} as Record<string, number> };
          const counts: Record<string, number> = {};
          (res.data || []).forEach((a: any) => {
            counts[a.journal_id] = (counts[a.journal_id] || 0) + 1;
          });
          return { data: counts };
        });

      const data = (journals || []).map((j: any) => {
        const hasIssn = !!(j.issn && j.issn.trim());
        const hasBoard = ((boardCounts as any) || {})[j.id] > 0;
        const hasAimsScope = !!(j.aims_and_scope && j.aims_and_scope.trim());
        const hasPeerReview = !!(j.peer_review_policy && j.peer_review_policy.trim());
        const hasLicense = !!(j.license_type && j.license_type.trim());
        const publishedCount = ((pubCounts as any) || {})[j.id] || 0;
        const doajReady = hasIssn && hasBoard && hasAimsScope && hasPeerReview && hasLicense && publishedCount >= 10;

        return {
          journal_id: j.id,
          name: j.name,
          slug: j.slug,
          has_issn: hasIssn,
          has_editorial_board: hasBoard,
          has_aims_scope: hasAimsScope,
          has_peer_review_policy: hasPeerReview,
          has_license: hasLicense,
          published_article_count: publishedCount,
          doaj_ready: doajReady,
        };
      });

      return NextResponse.json({ data });
    }

    // reviewer_workload: admin/editor — assignment stats per reviewer
    if (entity === 'reviewer_workload') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const { data: assignments, error: aErr } = await supabaseAdmin
        .from('reviewer_assignments')
        .select('reviewer_id, status, created_at, updated_at');
      if (aErr) throw aErr;

      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('role', ['editor', 'reviewer']);

      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p.full_name; });

      const grouped: Record<string, { total: number; pending: number; completed: number; declined: number; turnaroundDays: number[] }> = {};

      (assignments || []).forEach((a: any) => {
        if (!grouped[a.reviewer_id]) {
          grouped[a.reviewer_id] = { total: 0, pending: 0, completed: 0, declined: 0, turnaroundDays: [] };
        }
        const g = grouped[a.reviewer_id];
        g.total++;
        if (a.status === 'pending') g.pending++;
        else if (a.status === 'completed') {
          g.completed++;
          if (a.created_at && a.updated_at) {
            const days = (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24);
            g.turnaroundDays.push(days);
          }
        } else if (a.status === 'declined') g.declined++;
      });

      const data = Object.entries(grouped).map(([reviewerId, stats]) => ({
        reviewer_id: reviewerId,
        reviewer_name: profileMap[reviewerId] || 'Unknown',
        total: stats.total,
        pending: stats.pending,
        completed: stats.completed,
        declined: stats.declined,
        avg_turnaround_days: stats.turnaroundDays.length > 0
          ? Math.round((stats.turnaroundDays.reduce((a, b) => a + b, 0) / stats.turnaroundDays.length) * 10) / 10
          : null,
      })).sort((a, b) => b.pending - a.pending);

      return NextResponse.json({ data });
    }

    // audit_log: admin only (includes role-change history)
    if (entity === 'audit_log') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin']);
      if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

      const { data, error } = await supabaseAdmin
        .from('audit_log')
        .select(`
          id,
          action,
          target_type,
          target_id,
          metadata,
          created_at,
          profiles!audit_log_actor_id_fkey ( full_name )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Unknown entity' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authGuard(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { supabaseAdmin, user } = auth;

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const body = await request.json();

    if (entity === 'journals') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin']);
      if (!profile) return NextResponse.json({ error: 'Only admins can create journals' }, { status: 403 });
      const { data, error } = await supabaseAdmin.from('journals').insert(body).select().single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (entity === 'books') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Only admins/editors can create books' }, { status: 403 });
      const { data, error } = await (supabaseAdmin as any).from('books').insert(body).select().single();
      if (error) throw error;

      await logAuditEvent({
        actorId: user.id,
        action: 'book_created' as any,
        targetType: 'journal' as any,
        targetId: (data as any)?.id,
        metadata: { title: body.title, slug: body.slug },
      });

      return NextResponse.json({ data });
    }

    if (entity === 'reviewer_assignments') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Only admins/editors can assign reviewers' }, { status: 403 });
      const { data, error } = await supabaseAdmin.from('reviewer_assignments').insert(body).select().single();
      if (error) throw error;

      await logAuditEvent({
        actorId: user.id,
        action: 'reviewer_assigned',
        targetType: 'reviewer_assignment',
        targetId: (data as any)?.id,
        metadata: { article_id: body.article_id, reviewer_id: body.reviewer_id },
      });

      return NextResponse.json({ data });
    }

    if (entity === 'editorial_board_members') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Only admins/editors can add board members' }, { status: 403 });
      const { data, error } = await supabaseAdmin.from('editorial_board_members').insert(body).select().single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Unknown entity' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authGuard(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { supabaseAdmin, user } = auth;

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    if (entity === 'profiles') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin']);
      if (!profile) return NextResponse.json({ error: 'Only admins can modify profiles' }, { status: 403 });

      const { data: oldProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', id)
        .single() as { data: any };

      const { error } = await (supabaseAdmin as any).from('profiles').update(updates).eq('id', id);
      if (error) throw error;

      if (updates.role && oldProfile && oldProfile.role !== updates.role) {
        await logAuditEvent({
          actorId: user.id,
          action: 'role_change',
          targetType: 'user',
          targetId: id,
          metadata: { from_role: oldProfile.role, to_role: updates.role },
        });
      }

      return NextResponse.json({ success: true });
    }

    if (entity === 'journals') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin']);
      if (!profile) return NextResponse.json({ error: 'Only admins can modify journals' }, { status: 403 });
      const { error } = await (supabaseAdmin as any).from('journals').update(updates).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (entity === 'books') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Only admins/editors can modify books' }, { status: 403 });
      const { error } = await (supabaseAdmin as any).from('books').update(updates).eq('id', id);
      if (error) throw error;

      await logAuditEvent({
        actorId: user.id,
        action: 'book_updated' as any,
        targetType: 'journal' as any,
        targetId: id,
        metadata: { ...updates },
      });

      return NextResponse.json({ success: true });
    }

    if (entity === 'articles') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Only admins/editors can modify articles' }, { status: 403 });

      const { data: oldArticle } = await supabaseAdmin
        .from('articles')
        .select('status')
        .eq('id', id)
        .single() as { data: any };

      const { error } = await (supabaseAdmin as any).from('articles').update(updates).eq('id', id);
      if (error) throw error;

      if (updates.status && oldArticle && oldArticle.status !== updates.status) {
        const actionMap: Record<string, 'article_published' | 'article_rejected'> = {
          published: 'article_published',
          rejected: 'article_rejected',
        };
        const auditAction = actionMap[updates.status] || 'article_updated';
        await logAuditEvent({
          actorId: user.id,
          action: auditAction,
          targetType: 'article',
          targetId: id,
          metadata: { from_status: oldArticle.status, to_status: updates.status },
        });
      }

      return NextResponse.json({ success: true });
    }

    if (entity === 'reviewer_assignments') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Only admins/editors can manage reviews' }, { status: 403 });
      const { error } = await (supabaseAdmin as any).from('reviewer_assignments').update(updates).eq('id', id);
      if (error) throw error;

      if (updates.recommendation || updates.status) {
        await logAuditEvent({
          actorId: user.id,
          action: 'review_submitted',
          targetType: 'reviewer_assignment',
          targetId: id,
          metadata: { ...updates },
        });
      }

      return NextResponse.json({ success: true });
    }

    if (entity === 'editorial_board_members') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Only admins/editors can modify board members' }, { status: 403 });
      const { error } = await (supabaseAdmin as any).from('editorial_board_members').update(updates).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown entity' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authGuard(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { supabaseAdmin, user } = auth;

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    if (entity === 'journals') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin']);
      if (!profile) return NextResponse.json({ error: 'Only admins can delete journals' }, { status: 403 });

      const { data: journal } = await supabaseAdmin
        .from('journals')
        .select('name')
        .eq('id', id)
        .single() as { data: any };

      const { error } = await supabaseAdmin.from('journals').delete().eq('id', id);
      if (error) throw error;

      await logAuditEvent({
        actorId: user.id,
        action: 'journal_deleted',
        targetType: 'journal',
        targetId: id,
        metadata: { journal_name: journal?.name },
      });

      return NextResponse.json({ success: true });
    }

    if (entity === 'books') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Only admins/editors can delete books' }, { status: 403 });

      const { data: book } = await (supabaseAdmin as any)
        .from('books')
        .select('title')
        .eq('id', id)
        .single();

      const { error } = await (supabaseAdmin as any).from('books').delete().eq('id', id);
      if (error) throw error;

      await logAuditEvent({
        actorId: user.id,
        action: 'book_deleted' as any,
        targetType: 'journal' as any,
        targetId: id,
        metadata: { title: book?.title },
      });

      return NextResponse.json({ success: true });
    }

    if (entity === 'editorial_board_members') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Only admins/editors can delete board members' }, { status: 403 });
      const { error } = await supabaseAdmin.from('editorial_board_members').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown entity' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
