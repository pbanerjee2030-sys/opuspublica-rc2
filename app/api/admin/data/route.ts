import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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
        supabaseAdmin.from('articles').select('id, title, status, doi, published_at, created_at, journals(name, slug), article_authors(profiles(full_name))'),
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
          journals ( name, slug ),
          article_authors ( profiles ( id, full_name, email ) )
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

    if (entity === 'reviewer_assignments') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Only admins/editors can assign reviewers' }, { status: 403 });
      const { data, error } = await supabaseAdmin.from('reviewer_assignments').insert(body).select().single();
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
      const { error } = await (supabaseAdmin as any).from('profiles').update(updates).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (entity === 'journals') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin']);
      if (!profile) return NextResponse.json({ error: 'Only admins can modify journals' }, { status: 403 });
      const { error } = await (supabaseAdmin as any).from('journals').update(updates).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (entity === 'articles') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Only admins/editors can modify articles' }, { status: 403 });
      const { error } = await (supabaseAdmin as any).from('articles').update(updates).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (entity === 'reviewer_assignments') {
      const profile = await requireRole(supabaseAdmin, user.id, ['admin', 'editor']);
      if (!profile) return NextResponse.json({ error: 'Only admins/editors can manage reviews' }, { status: 403 });
      const { error } = await (supabaseAdmin as any).from('reviewer_assignments').update(updates).eq('id', id);
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
      const { error } = await supabaseAdmin.from('journals').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown entity' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
