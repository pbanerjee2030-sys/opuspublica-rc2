import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { generateCrossrefXml } from '@/lib/crossref';

export async function submitDoiToCrossref(articleId: string, publishedAt: string) {
  const supabaseAdmin = getSupabaseAdmin();
  
  const { data: article, error: articleError } = await (supabaseAdmin as any)
    .from('articles')
    .select(`
      id, title, abstract, doi, funder_name, funder_award_number, funder_id,
      journals ( name, slug ),
      article_authors (
        co_author_name, co_author_orcid, co_author_ror_id,
        profiles ( full_name, orcid, affiliation, ror_id )
      )
    `)
    .eq('id', articleId)
    .single();

  if (articleError || !article) {
    throw new Error(`Article with ID ${articleId} not found.`);
  }

  if (!article.doi) {
    throw new Error('Article does not have a pre-assigned DOI.');
  }

  const authors = article.article_authors?.map((aa: any) => {
    if (aa.profiles) return { full_name: aa.profiles.full_name, orcid: aa.profiles.orcid, affiliation: aa.profiles.affiliation, ror_id: aa.profiles.ror_id };
    if (aa.co_author_name) return { full_name: aa.co_author_name, orcid: aa.co_author_orcid, affiliation: null, ror_id: aa.co_author_ror_id };
    return null;
  }).filter(Boolean) || [];

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://opuspublica.com';
  const journalSlug = article.journals?.slug || 'unknown';
  const articleUrl = `${origin}/${journalSlug}/article/${articleId}`;

  const xmlString = generateCrossrefXml({
    title: article.title,
    abstract: article.abstract,
    doi: article.doi,
    url: articleUrl,
    publishedAt: publishedAt,
    journalName: article.journals?.name || 'Academic Journal',
    journalIssn: undefined,
    authors: authors,
    funderName: article.funder_name,
    funderAwardNumber: article.funder_award_number,
    funderId: article.funder_id,
  });

  const username = process.env.CROSSREF_USERNAME || '';
  const password = process.env.CROSSREF_PASSWORD || '';
  
  if (!username || !password) {
    throw new Error('Crossref credentials missing in production environment');
  }

  const formData = new FormData();
  formData.append('operation', 'doDeposit');
  formData.append('login_id', username);
  formData.append('login_passwd', password);

  const xmlBlob = new Blob([xmlString], { type: 'application/xml' });
  formData.append('fname', xmlBlob, `deposit_${articleId}.xml`);

  let response;
  let responseText = '';
  try {
    response = await fetch('https://doi.crossref.org/servlet/deposit', {
      method: 'POST',
      body: formData,
    });
    responseText = await response.text();
  } catch (err: any) {
    throw new Error('Network error during Crossref submission: ' + err.message);
  }

  if (!response.ok) {
    throw new Error(responseText || `HTTP ${response.status}`);
  }

  return { success: true, status: 'submitted', doi: article.doi };
}
