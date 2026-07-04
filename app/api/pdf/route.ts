import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('id');

    if (!articleId) {
      return NextResponse.json({ error: 'Missing article id' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: article, error } = await supabaseAdmin
      .from('articles')
      .select('pdf_url, status')
      .eq('id', articleId)
      .single() as { data: any; error: any };

    if (error || !article?.pdf_url) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const storagePath = article.pdf_url;

    if (article.status === 'published') {
      const { data: signedUrl, error: signError } = await supabaseAdmin.storage
        .from('publications')
        .createSignedUrl(storagePath, 3600);

      if (signError || !signedUrl) {
        return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
      }
      return NextResponse.redirect(signedUrl.signedUrl);
    }

    const authHeader = request.headers.get('Authorization');
    let token: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else {
      const authCookie = request.cookies.getAll().find(c => c.name.includes('-auth-token'));
      if (authCookie?.value) {
        try {
          const decoded = decodeURIComponent(authCookie.value);
          const parsed = JSON.parse(decoded);
          token = parsed.access_token || null;
        } catch {}
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Authentication required to access unpublished manuscripts' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: any; error: any };

    const role = profile?.role;

    if (role !== 'admin' && role !== 'editor') {
      const { data: isAuthor } = await supabaseAdmin
        .from('article_authors')
        .select('id')
        .eq('article_id', articleId)
        .eq('profile_id', user.id)
        .maybeSingle();

      if (!isAuthor) {
        const { data: isReviewer } = await supabaseAdmin
          .from('reviewer_assignments')
          .select('id')
          .eq('reviewer_id', user.id)
          .eq('article_id', articleId)
          .maybeSingle();

        if (!isReviewer) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }
    }

    const { data: signedUrl, error: signError } = await supabaseAdmin.storage
      .from('publications')
      .createSignedUrl(storagePath, 3600);

    if (signError || !signedUrl) {
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
    }

    return NextResponse.redirect(signedUrl.signedUrl);

  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
