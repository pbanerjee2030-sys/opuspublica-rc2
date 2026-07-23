import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { generateCrossrefXml, generateBookCrossrefXml } from '@/lib/crossref';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryType = searchParams.get('type');

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const type = queryType || body.type || 'article';
    const id = body.bookId || body.articleId;

    if (!id) {
      return NextResponse.json({ error: 'Missing bookId or articleId in request body.' }, { status: 400 });
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

    const username = process.env.CROSSREF_USERNAME || '';
    const password = process.env.CROSSREF_PASSWORD || '';

    if (!username || !password) {
      return NextResponse.json({ 
        error: 'Missing Crossref Credentials. Environment parameters must be configured for live deposition.' 
      }, { status: 500 });
    }

    // ----------------------------------------------------
    // BOOK DEPOSIT BRANCH
    // ----------------------------------------------------
    if (type === 'book') {
      const { data: book, error: bookError } = await (supabaseAdmin as any)
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      if (bookError || !book) {
        return NextResponse.json({ error: `Book with ID ${id} not found.` }, { status: 404 });
      }

      if (!book.doi) {
        return NextResponse.json({ error: 'Book does not have a pre-assigned DOI in the database.' }, { status: 400 });
      }

      const host = request.headers.get('host') || 'opuspublica.org';
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      const origin = `${proto}://${host}`;
      const bookUrl = `${origin}/books/${book.slug}`;

      const xmlString = generateBookCrossrefXml({
        title: book.title,
        doi: book.doi,
        url: bookUrl,
        publication_date: book.publication_date,
        isbn: book.isbn,
        isbn_ebook: book.isbn_ebook,
        authors: book.authors || [],
      });

      const formData = new FormData();
      formData.append('operation', 'doDeposit');
      formData.append('login_id', username);
      formData.append('login_passwd', password);

      const xmlBlob = new Blob([xmlString], { type: 'application/xml' });
      formData.append('fname', xmlBlob, `deposit_book_${id}.xml`);

      const response = await fetch('https://doi.crossref.org/servlet/deposit', {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();

      if (response.ok) {
        await (supabaseAdmin as any)
          .from('books')
          .update({
            doi_deposit_status: 'submitted',
            doi_deposited_at: new Date().toISOString(),
            doi_deposit_error: null,
          })
          .eq('id', id);

        return NextResponse.json({
          status: 'submitted',
          statusCode: response.status,
          message: 'DOI batch queued for submission to Crossref successfully.',
          doi: book.doi,
          xml: xmlString,
          crossrefResponse: responseText,
        });
      } else {
        await (supabaseAdmin as any)
          .from('books')
          .update({
            doi_deposit_status: 'failed',
            doi_deposit_error: responseText || `HTTP ${response.status}`,
          })
          .eq('id', id);

        return NextResponse.json({
          status: 'failed',
          statusCode: response.status,
          error: 'Crossref endpoint rejected the deposit request.',
          details: responseText,
          xml: xmlString,
        }, { status: 502 });
      }
    }

    // ----------------------------------------------------
    // ARTICLE DEPOSIT BRANCH (Original logic, untouched)
    // ----------------------------------------------------
    const articleId = id;
    const { data: article, error: articleError } = await supabaseAdmin
      .from('articles')
      .select(`
        id,
        title,
        abstract,
        doi,
        published_at,
        funder_name,
        funder_award_number,
        funder_id,
        journals (
          name,
          slug
        ),
        article_authors (
          co_author_name,
          co_author_orcid,
          co_author_ror_id,
          profiles (
            full_name,
            orcid,
            affiliation,
            ror_id
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

    const authors = article.article_authors?.map((aa: any) => {
      if (aa.profiles) {
        return {
          full_name: aa.profiles.full_name,
          orcid: aa.profiles.orcid,
          affiliation: aa.profiles.affiliation,
          ror_id: aa.profiles.ror_id,
        };
      }
      if (aa.co_author_name) {
        return {
          full_name: aa.co_author_name,
          orcid: aa.co_author_orcid,
          affiliation: null,
          ror_id: aa.co_author_ror_id,
        };
      }
      return null;
    }).filter(Boolean) || [];

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
      funderName: article.funder_name,
      funderAwardNumber: article.funder_award_number,
      funderId: article.funder_id,
    });

    const formData = new FormData();
    formData.append('operation', 'doDeposit');
    formData.append('login_id', username);
    formData.append('login_passwd', password);

    const xmlBlob = new Blob([xmlString], { type: 'application/xml' });
    formData.append('fname', xmlBlob, `deposit_${articleId}.xml`);

    const response = await fetch('https://doi.crossref.org/servlet/deposit', {
      method: 'POST',
      body: formData,
    });

    const responseText = await response.text();

    if (response.ok) {
      await (supabaseAdmin as any)
        .from('articles')
        .update({
          doi_deposit_status: 'submitted',
          doi_deposited_at: new Date().toISOString(),
          doi_deposit_error: null,
        })
        .eq('id', articleId);

      return NextResponse.json({
        status: 'submitted',
        statusCode: response.status,
        message: 'DOI batch queued for submission to Crossref successfully.',
        doi: article.doi,
        xml: xmlString,
        crossrefResponse: responseText,
      });
    } else {
      await (supabaseAdmin as any)
        .from('articles')
        .update({
          doi_deposit_status: 'failed',
          doi_deposit_error: responseText || `HTTP ${response.status}`,
        })
        .eq('id', articleId);

      return NextResponse.json({
        status: 'failed',
        statusCode: response.status,
        error: 'Crossref endpoint rejected the deposit request.',
        details: responseText,
        xml: xmlString,
      }, { status: 502 });
    }

  } catch (error: any) {
    console.error('mint API route error:', error);
    return NextResponse.json({ error: 'Internal Server Error.', details: error.message }, { status: 500 });
  }
}
