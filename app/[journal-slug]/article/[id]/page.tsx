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

  return {
    title: `${articleTitle} | ${journalTitle} | Opus Publica`,
    description: dbArticle.abstract,
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
        slug
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
    journalIssn: 'N/A',
    authors: dbArticle.article_authors?.map((aa: any) => ({
      id: aa.profile_id || null,
      full_name: aa.profiles?.full_name || aa.co_author_name || 'Unknown Author',
      role: aa.profiles?.role || null,
      orcid: aa.profiles?.orcid || aa.co_author_orcid || null,
    })).filter(Boolean) || [],
  };

  const authorNames = article.authors.map((a: any) => a.full_name);

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white flex flex-col">
      <div className="h-16"></div>

      <main className="flex-grow bg-[#1A1A2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 text-sm text-white/60 flex items-center gap-2">
          <Link href="/" className="hover:text-[#C9A84C] transition-colors">Home</Link>
          <span>/</span>
          <Link href={`/${article.journalSlug}`} className="hover:text-[#C9A84C] transition-colors">{article.journalName}</Link>
          <span>/</span>
          <span className="text-[#C9A84C] truncate max-w-xs sm:max-w-md">Article Details</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <Link
            href={`/${article.journalSlug}`}
            className="inline-flex items-center gap-2 text-[#C9A84C] hover:text-[#D4AF37] transition-colors group text-sm sm:text-base font-medium"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Journal
          </Link>
        </div>

        <section className="py-8 sm:py-12 bg-[#F5F0E8] text-[#1A1A2E] mt-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              
              <div className="lg:col-span-2 space-y-8">
                <header className="space-y-4">
                  <span className="inline-block px-3 py-1 bg-[#8B1A1A]/10 text-[#8B1A1A] font-semibold text-xs rounded uppercase tracking-wider">
                    Peer-Reviewed Research Paper
                  </span>
                  
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#1A1A2E] font-bold leading-tight">
                    {article.title}
                  </h1>

                  {article.authors && article.authors.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-base text-[#1A1A2E]/80">
                      <span className="font-semibold text-[#1A1A2E]">Authors:</span>
                      {article.authors.map((author: any, idx: number) => (
                        <span key={idx} className="inline-flex items-center gap-1">
                          {author.id ? (
                            <Link 
                              href={`/profile/${author.id}`}
                              className="text-[#8B1A1A] font-medium underline hover:text-[#C9A84C] transition-colors duration-150"
                            >
                              {author.full_name}
                            </Link>
                          ) : (
                            <span className="text-[#1A1A2E]/80 font-medium">{author.full_name}</span>
                          )}
                          {author.orcid && (
                            <a
                              href={`https://orcid.org/${author.orcid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#C9A84C] hover:text-[#D4AF37] transition-colors"
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

                  <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#1A1A2E]/60 pt-2 border-b border-[#1A1A2E]/10 pb-4">
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
                    <div>&#8226;</div>
                    <div>Journal: <span className="font-medium text-[#1A1A2E]/80">{article.journalName}</span></div>
                    {article.journalIssn && article.journalIssn !== 'N/A' && (
                      <>
                        <div>&#8226;</div>
                        <div className="font-mono">ISSN: {article.journalIssn}</div>
                      </>
                    )}
                    {article.doi && (
                      <>
                        <div>&#8226;</div>
                        <div className="font-mono">DOI: {article.doi}</div>
                      </>
                    )}
                  </div>
                </header>

                <section className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-[#8B1A1A] border border-black/5">
                  <h2 className="text-[#8B1A1A] font-serif text-lg font-bold mb-3 uppercase tracking-wider">
                    Abstract
                  </h2>
                  <SafeHtml
                    html={article.abstract}
                    className="text-base sm:text-lg text-[#1A1A2E]/90 italic leading-relaxed"
                  />
                  {article.keywords && article.keywords.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#1A1A2E]/10 text-sm">
                      <span className="font-bold text-[#1A1A2E]">Keywords:</span>{' '}
                      <span className="text-[#1A1A2E]/80">{article.keywords.join(', ')}</span>
                    </div>
                  )}
                </section>

                <SafeHtml
                  html={article.content}
                  className="prose prose-stone max-w-none text-[#1A1A2E]/90 leading-relaxed font-serif text-base sm:text-lg space-y-6"
                />
              </div>

              <div className="lg:col-span-1 space-y-8">
                <div className="sticky top-20 space-y-6">
                  
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-black/5">
                    <h3 className="text-[#1A1A2E] font-serif text-lg font-semibold mb-2">
                      Access Article
                    </h3>
                    <p className="text-[#1A1A2E]/70 text-xs sm:text-sm mb-4 leading-normal">
                      Read, annotate, and print the official publication format of this research.
                    </p>
                    
                    <a
                      href={`/api/pdf?id=${article.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#1A1A2E] font-bold text-base rounded shadow hover:shadow-md transition-all transform hover:-translate-y-0.5 duration-200"
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
                    <div className="bg-white rounded-lg p-5 shadow-sm border border-black/5 flex flex-col items-start gap-3">
                      <h4 className="text-[#1A1A2E] font-serif text-sm font-semibold uppercase tracking-wider">
                        Document Verification
                      </h4>
                      <p className="text-xs text-[#1A1A2E]/70 leading-normal mb-1">
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

                  <div className="bg-[#1A1A2E] text-white p-5 rounded-lg border border-[#C9A84C]/10 shadow-md">
                    <h4 className="text-[#C9A84C] font-serif font-bold text-sm uppercase tracking-wider mb-3">
                      Publication Context
                    </h4>
                    <div className="space-y-2 text-xs text-white/80 font-mono">
                      <div>Publisher: Advocacy Unified Network</div>
                      <div>Indexed: Google Scholar</div>
                      <div>Access: Open Access (CC BY)</div>
                      {article.doi && <div>DOI: {article.doi}</div>}
                      <div className="pt-2">
                        <Link 
                          href={`/${article.journalSlug}`}
                          className="text-[#C9A84C] hover:underline flex items-center gap-1"
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
