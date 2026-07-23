import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Download, ExternalLink, Fingerprint } from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import CitationBox from '@/components/CitationBox';
import CitationExport from '@/components/CitationExport';
import SafeHtml from '@/components/SafeHtml';

interface Props {
  params: Promise<{
    'journal-slug': string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: Props) {
  const { 'journal-slug': journalSlug, id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: dbArticle, error: metadataError } = await supabase
    .from('articles')
    .select(`
      title,
      abstract,
      pdf_url,
      published_at,
      keywords,
      journals ( name ),
      article_authors ( profiles ( full_name ) )
    `)
    .eq('id', id)
    .single() as { data: any; error: any };

  if (metadataError) {
    console.error('DATABASE ERROR IN ARTICLE METADATA QUERY:', metadataError);
  }

  if (!dbArticle) {
    console.warn('ARTICLE METADATA: dbArticle is null or undefined for ID:', id);
    return { title: 'Article Not Found | Opus Publica' };
  }

  const articleTitle = dbArticle.title;
  const journalTitle = dbArticle.journals?.name || 'Academic Journal';
  const publishDate = dbArticle.published_at;
  const pdfUrl = dbArticle.pdf_url || '';
  const authorsList = dbArticle.article_authors?.map((aa: any) => aa.profiles?.full_name || aa.co_author_name).filter(Boolean) || [];

  const d = new Date(publishDate);
  const formattedDate = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

  const rawAbstract = dbArticle.abstract || '';
  const cleanAbstract = rawAbstract
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const truncatedAbstract = cleanAbstract.length > 155
    ? cleanAbstract.slice(0, 152).trimEnd() + '...'
    : cleanAbstract;

  const canonicalUrl = `https://opuspublica.com/${journalSlug}/article/${id}`;

  return {
    title: `${articleTitle} | ${journalTitle} | Opus Publica`,
    description: truncatedAbstract,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${articleTitle} | ${journalTitle}`,
      description: truncatedAbstract,
      type: 'article',
      url: canonicalUrl,
      siteName: 'Opus Publica',
      ...(pdfUrl ? { images: [{ url: pdfUrl, width: 1200, height: 1600, alt: articleTitle }] } : {}),
    },
    other: {
      'citation_title': articleTitle,
      'citation_author': authorsList.length > 0 ? authorsList : ['Anonymous'],
      'citation_publication_date': formattedDate,
      'citation_pdf_url': pdfUrl,
      'citation_journal_title': journalTitle,
      ...(dbArticle.keywords && dbArticle.keywords.length > 0 ? { 'citation_keywords': dbArticle.keywords.join(', ') } : {}),
    },
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { 'journal-slug': journalSlug, id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: dbArticle, error: queryError } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      content,
      abstract,
      pdf_url,
      doi,
      published_at,
      status,
      keywords,
      journals (
        id,
        name,
        slug,
        issn,
        indexing_status
      ),
      article_authors (
        profiles (
          id,
          full_name,
          role,
          orcid
        ),
        co_author_name,
        co_author_orcid
      )
    `)
    .eq('id', id)
    .single() as { data: any; error: any };

  if (queryError) {
    console.error('DATABASE ERROR IN ARTICLE DETAIL QUERY:', queryError);
  }

  if (!dbArticle) {
    console.warn('ARTICLE DETAIL: dbArticle is null or undefined for ID:', id);
    notFound();
  }

  if (dbArticle.status !== 'published') {
    console.warn('ARTICLE DETAIL: Article status is not published:', dbArticle.status);
    notFound();
  }

  const article = {
    id: dbArticle.id,
    title: dbArticle.title,
    content: dbArticle.content || '<p>Full content is not yet available for this article.</p>',
    abstract: dbArticle.abstract || 'No abstract available.',
    pdfUrl: dbArticle.pdf_url || '#',
    publishedAt: dbArticle.published_at,
    doi: dbArticle.doi,
    keywords: dbArticle.keywords || [],
    journalName: dbArticle.journals?.name || 'Academic Journal',
    journalSlug: dbArticle.journals?.slug || journalSlug,
    journalIssn: dbArticle.journals?.issn || null,
    journalIndexingStatus: dbArticle.journals?.indexing_status || null,
    authors: dbArticle.article_authors?.map((aa: any) => ({
      id: aa.profile_id || null,
      full_name: aa.profiles?.full_name || aa.co_author_name || 'Unknown Author',
      role: aa.profiles?.role || null,
      orcid: aa.profiles?.orcid || aa.co_author_orcid || null,
    })).filter(Boolean) || [],
  };

  const authorNames = article.authors.map((a: any) => a.full_name);

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <div className="h-16"></div>

      <main className="flex-grow bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 text-sm text-text-secondary flex items-center gap-2">
          <Link href="/" className="hover:text-accent transition-colors">Home</Link>
          <span>/</span>
          <Link href={`/${article.journalSlug}`} className="hover:text-accent transition-colors">{article.journalName}</Link>
          <span>/</span>
          <span className="text-accent truncate max-w-xs sm:max-w-md">Article Details</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <Link
            href={`/${article.journalSlug}`}
            className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors group text-sm sm:text-base font-medium"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Journal
          </Link>
        </div>

        <section className="py-8 sm:py-12 bg-bg mt-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

              <div className="lg:col-span-2 space-y-8">
                <header className="space-y-4">
                  <span className="inline-block px-3 py-1 bg-accent/10 text-accent font-semibold text-xs rounded uppercase tracking-wider">
                    Peer-Reviewed Research Paper
                  </span>

                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-primary font-bold leading-tight">
                    {article.title}
                  </h1>

                  {article.authors && article.authors.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-base text-text-secondary">
                      <span className="font-semibold text-text">Authors:</span>
                      {article.authors.map((author: any, idx: number) => (
                        <span key={idx} className="inline-flex items-center gap-1">
                          {author.id ? (
                            <Link
                              href={`/profile/${author.id}`}
                              className="text-primary font-medium underline decoration-accent underline-offset-2 hover:text-accent transition-colors duration-150"
                            >
                              {author.full_name}
                            </Link>
                          ) : (
                            <span className="text-text font-medium">{author.full_name}</span>
                          )}
                          {author.orcid && (
                            <a
                              href={`https://orcid.org/${author.orcid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:text-accent-hover transition-colors"
                              title={`ORCID: ${author.orcid}`}
                            >
                              <Fingerprint className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {idx < article.authors.length - 1 && <span className="mr-1.5">,</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-text-secondary pt-2 border-b border-border pb-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Published: {new Date(article.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <span className="text-accent">|</span>
                    <div>Journal: <span className="font-medium text-text/80">{article.journalName}</span></div>
                    {article.journalIssn && (
                      <>
                        <span className="text-accent">|</span>
                        <div className="font-mono text-accent font-semibold">ISSN: {article.journalIssn}</div>
                      </>
                    )}
                    {article.doi && (
                      <>
                        <span className="text-accent">|</span>
                        <div className="font-mono">DOI: {article.doi}</div>
                      </>
                    )}
                  </div>
                </header>

                <section className="bg-surface rounded-lg p-6 border border-border border-l-4 border-l-accent">
                  <h2 className="text-accent font-serif text-lg font-bold mb-3 uppercase tracking-wider">
                    Abstract
                  </h2>
                  <SafeHtml
                    html={article.abstract}
                    className="text-base sm:text-lg text-text italic leading-relaxed"
                  />
                  {article.keywords && article.keywords.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border text-sm">
                      <span className="font-bold text-text">Keywords:</span>{' '}
                      <span className="text-text-secondary">{article.keywords.join(', ')}</span>
                    </div>
                  )}
                </section>

                <SafeHtml
                  html={article.content}
                  className="prose-article"
                />
              </div>

              <div className="lg:col-span-1 space-y-8">
                <div className="sticky top-20 space-y-6">

                  <div className="bg-surface rounded-lg p-6 border border-border">
                    <h3 className="text-text font-serif text-lg font-semibold mb-2">
                      Access Article
                    </h3>
                    <p className="text-text-secondary text-xs sm:text-sm mb-4 leading-normal">
                      Read, annotate, and print the official publication format of this research.
                    </p>

                    <a
                      href={`/api/pdf?id=${article.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white font-bold text-base rounded shadow hover:bg-primary-hover transition-all hover:-translate-y-0.5 duration-200"
                    >
                      <Download className="w-5 h-5" />
                      Download PDF
                    </a>
                  </div>

                  <CitationBox
                    title={article.title}
                    authors={authorNames}
                    journalTitle={article.journalName}
                    publishDate={article.publishedAt}
                  />

                  <CitationExport
                    title={article.title}
                    authors={authorNames}
                    journalTitle={article.journalName}
                    publishDate={article.publishedAt}
                    doi={article.doi}
                    abstract={article.abstract}
                  />

                  {article.doi && (
                    <div className="bg-surface rounded-lg p-5 border border-border flex flex-col items-start gap-3">
                      <h4 className="text-text font-serif text-sm font-semibold uppercase tracking-wider">
                        Document Verification
                      </h4>
                      <p className="text-xs text-text-secondary leading-normal mb-1">
                        Click the badge below to verify the authenticity, current publication status, and any corrections or updates for this article via Crossmark.
                      </p>
                      <a
                        href={`https://crossmark.crossref.org/dialog?doi=${encodeURIComponent(article.doi)}&domain=opuspublica.com&date_stamp=${new Date(article.publishedAt).toISOString().split('T')[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block hover:opacity-85 transition-opacity duration-150"
                      >
                        <img
                          src="https://crossmark.crossref.org/button.svg"
                          alt="Crossmark Status"
                          className="h-7"
                        />
                      </a>
                    </div>
                  )}

                  <div className="bg-primary text-white p-5 rounded-lg border border-accent/20 shadow-md">
                    <h4 className="text-accent font-serif font-bold text-sm uppercase tracking-wider mb-3">
                      Publication Context
                    </h4>
                    <div className="space-y-2 text-xs text-white/80 font-mono">
                      <div>Publisher: Advocacy Unified Network</div>
                      <div>Indexed: {article.journalIndexingStatus || 'Google Scholar'}</div>
                      <div>Access: Open Access (CC BY)</div>
                      {article.doi && <div>DOI: {article.doi}</div>}
                      <div className="pt-2">
                        <Link
                          href={`/${article.journalSlug}`}
                          className="text-accent hover:text-accent-hover underline decoration-accent underline-offset-2 flex items-center gap-1"
                        >
                          Visit Journal Home
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
