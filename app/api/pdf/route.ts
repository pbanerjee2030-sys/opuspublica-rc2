import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Extracts the relative storage path inside the publications bucket if the database contains a full URL.
function cleanStoragePath(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  
  // Handle full Supabase URLs or other HTTP links
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    const publicationsIndex = pathOrUrl.indexOf('/publications/');
    if (publicationsIndex !== -1) {
      return pathOrUrl.substring(publicationsIndex + '/publications/'.length);
    }
  }
  
  return pathOrUrl;
}

// Ensures that the signed URL target redirect is always absolute.
function toAbsoluteUrl(signedUrl: string): string {
  if (signedUrl.startsWith('http://') || signedUrl.startsWith('https://')) {
    return signedUrl;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const path = signedUrl.startsWith('/') ? signedUrl : `/${signedUrl}`;
  return `${supabaseUrl}${path}`;
}

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
      .select('pdf_url, published_pdf_url, status')
      .eq('id', articleId)
      .single() as { data: any; error: any };

    if (error || !article?.pdf_url) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    console.log('[PDF Route] Request for Article ID:', articleId);
    console.log('[PDF Route] Raw pdf_url:', article.pdf_url);
    console.log('[PDF Route] Published pdf_url:', article.published_pdf_url);

    if (article.status === 'published') {
      // Prefer house-styled published PDF; fall back to author's raw upload for older articles
      const pdfPath = article.published_pdf_url || article.pdf_url;
      const storagePath = cleanStoragePath(pdfPath);
      console.log('[PDF Route] Published - serving path:', storagePath);

      const { data: signedUrl, error: signError } = await supabaseAdmin.storage
        .from('publications')
        .createSignedUrl(storagePath, 3600);

      if (signError || !signedUrl) {
        // If published_pdf_url failed, try falling back to raw pdf_url
        if (article.published_pdf_url && article.pdf_url) {
          const fallbackPath = cleanStoragePath(article.pdf_url);
          console.log('[PDF Route] Published PDF failed, falling back to raw:', fallbackPath);
          const { data: fallbackUrl, error: fallbackError } = await supabaseAdmin.storage
            .from('publications')
            .createSignedUrl(fallbackPath, 3600);
          if (!fallbackError && fallbackUrl) {
            const absoluteUrl = toAbsoluteUrl(fallbackUrl.signedUrl);
            return NextResponse.redirect(absoluteUrl);
          }
        }

        console.error('[PDF Route] createSignedUrl error for published article:', signError);
        return NextResponse.json({ 
          error: 'Failed to generate download link',
          details: signError?.message || 'Unknown sign error',
          path: storagePath,
          rawUrl: article.pdf_url
        }, { status: 500 });
      }
      
      const absoluteUrl = toAbsoluteUrl(signedUrl.signedUrl);
      console.log('[PDF Route] Published Redirect - Raw:', signedUrl.signedUrl, 'Absolute:', absoluteUrl);
      return NextResponse.redirect(absoluteUrl);
    }

    // For unpublished articles, always use the author's raw upload
    const storagePath = cleanStoragePath(article.pdf_url);

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
      console.error('[PDF Route] createSignedUrl error for unpublished article:', signError);
      return NextResponse.json({ 
        error: 'Failed to generate download link',
        details: signError?.message || 'Unknown sign error',
        path: storagePath,
        rawUrl: article.pdf_url
      }, { status: 500 });
    }

    const absoluteUrl = toAbsoluteUrl(signedUrl.signedUrl);
    console.log('[PDF Route] Unpublished Redirect - Raw:', signedUrl.signedUrl, 'Absolute:', absoluteUrl);
    return NextResponse.redirect(absoluteUrl);

  } catch (e: any) {
    console.error('[PDF Route] Unexpected handler crash:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
