import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { SupabaseClient } from '@supabase/supabase-js';
import { getStorageProvider, FEATURE_STORAGE_ABSTRACTION } from '@/lib/storage';
import { Database } from '@/lib/types';

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
  
  if (pathOrUrl.startsWith('publications/')) {
    return pathOrUrl.substring('publications/'.length);
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
    const type = searchParams.get('type');

    if (!articleId) {
      return NextResponse.json({ error: 'Missing article id' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin() as SupabaseClient<Database>;

    const { data: article, error } = await supabaseAdmin
      .from('articles')
      .select('pdf_url, canonical_package_url, published_pdf_url, status')
      .eq('id', articleId)
      .single();

    if (error || !article) {
      return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
    }


    if (article.status === 'published') {
      if (!article.published_pdf_url && !article.canonical_package_url) {
        return NextResponse.json({ error: 'No publisher PDF generated.' }, { status: 404 });
      }
      const targetPdfUrl = article.published_pdf_url || `${article.canonical_package_url}/publisher.pdf`;
      const storagePath = cleanStoragePath(targetPdfUrl);

      let signedUrlStr = '';
      if (FEATURE_STORAGE_ABSTRACTION) {
        signedUrlStr = await getStorageProvider().getSignedUrl('publications', storagePath, 3600, { download: searchParams.get('download') === 'true' });
      } else {
        const { data: signedUrl, error: signError } = await supabaseAdmin.storage
          .from('publications')
          .createSignedUrl(storagePath, 3600, { download: searchParams.get('download') === 'true' });

        if (signError || !signedUrl) {
          console.error('[PDF Route] createSignedUrl error for published article:', signError);
          return NextResponse.json({ 
            error: 'Failed to generate download link',
            details: signError?.message || 'Unknown sign error',
            path: storagePath
          }, { status: 500 });
        }
        signedUrlStr = signedUrl.signedUrl;
      }
      
      const absoluteUrl = toAbsoluteUrl(signedUrlStr);
      return NextResponse.redirect(absoluteUrl);
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
      .single();

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

    let targetUrl = article.pdf_url;
    const requestedPath = searchParams.get('path');
    
    if (requestedPath && (requestedPath.startsWith('packages/') || requestedPath.startsWith('publications/'))) {
      targetUrl = requestedPath;
    } else if (type === 'publisher') {
      if (!article.published_pdf_url && !article.canonical_package_url) {
        return NextResponse.json({ error: 'Publisher PDF not found.' }, { status: 404 });
      }
      targetUrl = article.published_pdf_url || `${article.canonical_package_url}/publisher.pdf`;
    } else {
      if (!article.pdf_url) {
        return NextResponse.json({ error: 'Manuscript not found.' }, { status: 404 });
      }
    }

    const storagePath = cleanStoragePath(targetUrl || '');

    let signedUrlStr = '';
    if (FEATURE_STORAGE_ABSTRACTION) {
      signedUrlStr = await getStorageProvider().getSignedUrl('publications', storagePath, 3600, { download: searchParams.get('download') === 'true' });
    } else {
      const { data: signedUrl, error: signError } = await supabaseAdmin.storage
        .from('publications')
        .createSignedUrl(storagePath, 3600, { download: searchParams.get('download') === 'true' });

      if (signError || !signedUrl) {
        console.error('[PDF Route] createSignedUrl error for unpublished article:', signError);
        return NextResponse.json({ 
          error: 'Failed to generate download link',
          details: signError?.message || 'Unknown sign error',
          path: storagePath,
          rawUrl: article.pdf_url
        }, { status: 500 });
      }
      signedUrlStr = signedUrl.signedUrl;
    }

    const absoluteUrl = toAbsoluteUrl(signedUrlStr);
    return NextResponse.redirect(absoluteUrl);

  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Internal error';
    console.error('[PDF Route] Unexpected handler crash:', e);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
