import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { generateCrossrefXml } from '@/lib/crossref';

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const { articleId } = body;

    if (!articleId) {
      return NextResponse.json({ error: 'Missing articleId in request body.' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabaseAdmin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token || '');

    if (authError || !user) {
      return NextResponse.json({ error: 'User authentication failed.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: any; error: any };

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 403 });
    }

    if (profile.role !== 'admin' && profile.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden. Admin or Editor role required to mint DOI.' }, { status: 403 });
    }

    const { data: article, error: articleError } = await supabaseAdmin
      .from('articles')
      .select(`
        id,
        title,
        abstract,
        doi,
        published_at,
        journals (
          name,
          slug
        ),
        article_authors (
          profiles (
            full_name
          )
        )
      `)
      .eq('id', articleId)
      .single() as { data: any; error: any };

    if (articleError || !article) {
      return NextResponse.json({ error: `Article with ID ${articleId} not found.` }, { status: 404 });
    }

    if (!article.doi) {
      return NextResponse.json({ error: 'Article does not have a pre-assigned DOI in the database.' }, { status: 400 });
    }

    const authors = article.article_authors?.map((aa: any) => aa.profiles).filter(Boolean) || [];

    const host = request.headers.get('host') || 'opuspublica.org';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${host}`;
    const journalSlug = article.journals?.slug || 'unknown';
    const articleUrl = `${origin}/${journalSlug}/article/${articleId}`;

    const xmlString = generateCrossrefXml({
      title: article.title,
      abstract: article.abstract,
      doi: article.doi,
      url: articleUrl,
      publishedAt: article.published_at,
      journalName: article.journals?.name || 'Academic Journal',
      journalIssn: undefined,
      authors: authors,
    });

    const username = process.env.CROSSREF_USERNAME || '';
    const password = process.env.CROSSREF_PASSWORD || '';

    if (!username || !password) {
      return NextResponse.json({ 
        error: 'Missing Crossref Credentials. Environment parameters must be configured for live deposition.' 
      }, { status: 500 });
    }

    const formData = new FormData();
    formData.append('operation', 'doDeposit');
    formData.append('login_id', username);
    formData.append('login_passwd', password);

    const xmlBlob = new Blob([xmlString], { type: 'application/xml' });
    formData.append('fname', xmlBlob, `deposit_${articleId}.xml`);

    const response = await fetch('https://api.crossref.org/v2/deposits', {
      method: 'POST',
      body: formData,
    });

    const responseText = await response.text();

    if (response.ok) {
      return NextResponse.json({
        status: 'submitted',
        statusCode: response.status,
        message: 'DOI batch queued for submission to Crossref successfully.',
        doi: article.doi,
        xml: xmlString,
        crossrefResponse: responseText,
      });
    } else {
      return NextResponse.json({
        status: 'failed',
        statusCode: response.status,
        error: 'Crossref endpoint rejected the deposit request.',
        details: responseText,
      }, { status: 502 });
    }

  } catch (error: any) {
    console.error('mint API route error:', error);
    return NextResponse.json({ error: 'Internal Server Error.', details: error.message }, { status: 500 });
  }
}
