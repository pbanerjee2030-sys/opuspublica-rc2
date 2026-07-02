import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen, Calendar, CheckCircle, Users, Fingerprint } from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

const JOURNAL_COVER_MAP: Record<string, string> = {
  'cybersec-journal': '/CyberSec Journal.jpg',
  'ecolaw-journal': '/EcoLaw Journal.jpg',
  'expressions': '/Expressions.jpg',
  'global-perspectives': '/GPPD.jpg',
  'migration-matters': '/Migration Matters.jpg',
  'conflict-peace-studies': '/Journal of Conflict and Peace Studies.jpg',
  'world-trade-finance-journal': '/The World Trade and Finance Journal.jpg',
  'voice-rights': '/Voice and rights.jpg',
};

interface Props {
  params: Promise<{
    'journal-slug': string;
  }>;
}

export async function generateMetadata({ params }: Props) {
  const { 'journal-slug': journalSlug } = await params;
  const supabase = getSupabaseAdmin();

  const { data: dbJournal } = await supabase
    .from('journals')
    .select('*')
    .eq('slug', journalSlug)
    .single() as { data: any };

  if (!dbJournal) {
    return { title: 'Journal Not Found | Opus Publica' };
  }

  return {
    title: `${dbJournal.name} | Opus Publica`,
    description: dbJournal.description,
  };
}

export default async function JournalLandingPage({ params }: Props) {
  const { 'journal-slug': journalSlug } = await params;
  const supabase = getSupabaseAdmin();

  const { data: dbJournal } = await supabase
    .from('journals')
    .select('*')
    .eq('slug', journalSlug)
    .single() as { data: any };

  if (!dbJournal) {
    notFound();
  }

  let articlesList: any[] = [];

  const { data: dbArticles } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      abstract,
      pdf_url,
      published_at,
      article_authors (
        profiles (
          id,
          full_name,
          role
        )
      )
    `)
    .eq('journal_id', dbJournal.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (dbArticles) {
    articlesList = dbArticles.map((art: any) => ({
      id: art.id,
      title: art.title,
      abstract: art.abstract || 'No abstract available.',
      pdfUrl: art.pdf_url,
      publishedAt: art.published_at,
      authors: art.article_authors?.map((aa: any) => aa.profiles).filter(Boolean) || [],
    }));
  }

  const focusAreas = [
    'Academic Research',
    'Peer Reviewed Studies',
    'Policy Analysis',
    'Interdisciplinary Scholarship'
  ];

  // Fetch editorial board members
  let boardMembers: any[] = [];
  const { data: dbBoardMembers } = await supabase
    .from('editorial_board_members')
    .select('*')
    .eq('journal_id', dbJournal.id)
    .order('sort_order', { ascending: true });

  if (dbBoardMembers) {
    boardMembers = dbBoardMembers;
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white flex flex-col">
      <div className="h-16"></div>

      <main className="flex-grow bg-[#1A1A2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <Link
            href="/#journals"
            className="inline-flex items-center gap-2 text-[#C9A84C] hover:text-[#D4AF37] transition-colors group text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Journals
          </Link>
        </div>

        <section className="relative overflow-hidden bg-gradient-to-br from-[#1A1A2E] via-[#8B1A1A]/20 to-[#1A1A2E] py-16 sm:py-20 border-b border-[#C9A84C]/10">
          {/* Background cover image */}
          {JOURNAL_COVER_MAP[journalSlug] && (
            <div className="absolute inset-0 opacity-10">
              <Image
                src={JOURNAL_COVER_MAP[journalSlug]}
                alt=""
                fill
                sizes="100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A2E] via-[#1A1A2E]/80 to-[#1A1A2E]" />
            </div>
          )}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-10 right-20 w-96 h-96 rounded-full border-2 border-[#C9A84C]"></div>
            <div className="absolute bottom-10 left-20 w-64 h-64 rounded-full border-2 border-[#C9A84C]"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="flex flex-col sm:flex-row gap-8 items-start">
              {JOURNAL_COVER_MAP[journalSlug] && (
                <div className="relative w-32 h-44 sm:w-40 sm:h-56 rounded-lg overflow-hidden shadow-2xl border border-white/10 flex-shrink-0">
                  <Image
                    src={JOURNAL_COVER_MAP[journalSlug]}
                    alt={`${dbJournal.name} Cover`}
                    fill
                    sizes="(max-width: 640px) 128px, 160px"
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <span className="inline-block text-[#C9A84C] uppercase tracking-wider text-xs sm:text-sm font-semibold mb-2">
                  Academic Peer-Reviewed Journal
                </span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-[#C9A84C] mb-4 font-normal leading-tight">
                  {dbJournal.name}
                </h1>
                <p className="text-white/80 text-lg sm:text-xl max-w-4xl leading-relaxed">
                  {dbJournal.description}
                </p>
                {dbJournal.issn && (
                  <p className="text-[#C9A84C]/70 text-xs sm:text-sm mt-4 font-mono">
                    ISSN: {dbJournal.issn}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 bg-[#F5F0E8] text-[#1A1A2E]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-serif text-[#8B1A1A] font-semibold border-b border-[#8B1A1A]/10 pb-3 mb-6">
                    Published Articles
                  </h2>
                  
                  {articlesList.length > 0 ? (
                    <div className="space-y-6">
                      {articlesList.map((article) => (
                        <article 
                          key={article.id}
                          className="bg-white rounded-lg p-6 shadow-sm border border-black/5 hover:shadow-md transition-shadow duration-300"
                        >
                          <span className="text-xs text-[#8B1A1A] font-semibold uppercase tracking-wider">
                            Research Article
                          </span>
                          
                          <h3 className="text-xl font-serif text-[#1A1A2E] font-semibold mt-1 mb-2 hover:text-[#8B1A1A] transition-colors duration-200">
                            <Link href={`/${journalSlug}/article/${article.id}`}>
                              {article.title}
                            </Link>
                          </h3>

                          {article.authors && article.authors.length > 0 && (
                            <div className="flex flex-wrap gap-2 text-sm text-[#1A1A2E]/70 mb-3 items-center">
                              <span className="font-medium text-[#1A1A2E]/80">Authors:</span>
                              {article.authors.map((author: any, idx: number) => (
                                <span key={author.id || idx}>
                                  <Link 
                                    href={`/profile/${author.id}`}
                                    className="underline hover:text-[#8B1A1A] transition-colors"
                                  >
                                    {author.full_name}
                                  </Link>
                                  {idx < article.authors.length - 1 && ', '}
                                </span>
                              ))}
                            </div>
                          )}

                          <p className="text-[#1A1A2E]/70 text-sm sm:text-base line-clamp-3 mb-4 leading-relaxed">
                            {article.abstract}
                          </p>

                          <div className="flex items-center justify-between pt-3 border-t border-[#1A1A2E]/5">
                            <div className="flex items-center gap-2 text-xs text-[#1A1A2E]/60">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>
                                {new Date(article.publishedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>

                            <Link
                              href={`/${journalSlug}/article/${article.id}`}
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B1A1A] hover:text-[#C9A84C] transition-colors"
                            >
                              Read Full Text
                              <BookOpen className="w-4 h-4" />
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-lg border border-black/5">
                      <BookOpen className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-[#1A1A2E]/60">No articles published yet</h3>
                      <p className="text-xs text-[#1A1A2E]/40 mt-1">Articles will appear here once published.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-1 space-y-8">
                {dbJournal.cover_image && (
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-black/5 flex justify-center overflow-hidden">
                    <div className="relative w-full aspect-[4/5] max-w-[280px] rounded-md overflow-hidden border border-zinc-200">
                      <Image
                        src={dbJournal.cover_image}
                        alt={`${dbJournal.name} Cover`}
                        fill
                        sizes="(max-width: 768px) 100vw, 30vw"
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg p-6 shadow-sm border border-black/5">
                  <h3 className="text-[#8B1A1A] font-serif text-xl font-semibold mb-3 border-b border-[#8B1A1A]/10 pb-2">
                    About the Journal
                  </h3>
                  <p className="text-sm sm:text-base text-[#1A1A2E]/80 leading-relaxed">
                    {dbJournal.description}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-[#C9A84C] border border-black/5">
                  <h3 className="text-[#8B1A1A] font-serif text-xl font-semibold mb-4">
                    Aims & Scope
                  </h3>
                  <ul className="space-y-3">
                    {focusAreas.map((area, index) => (
                      <li key={index} className="flex items-start gap-2.5 text-[#1A1A2E]/80">
                        <CheckCircle className="w-4 h-4 text-[#C9A84C] flex-shrink-0 mt-1" />
                        <span className="text-sm leading-snug">{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {boardMembers.length > 0 && (
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-black/5">
                    <h3 className="text-[#8B1A1A] font-serif text-xl font-semibold mb-4 border-b border-[#8B1A1A]/10 pb-2 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Editorial Board
                    </h3>
                    <div className="space-y-4">
                      {boardMembers.map((member) => (
                        <div key={member.id} className="flex items-start gap-3">
                          {member.photo_url ? (
                            <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-zinc-200">
                              <Image
                                src={member.photo_url}
                                alt={member.full_name}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[#8B1A1A] font-serif font-bold text-sm">
                                {member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1A1A2E] leading-tight">{member.full_name}</p>
                            {member.role && (
                              <p className="text-xs text-[#8B1A1A] font-medium">{member.role}</p>
                            )}
                            {member.affiliation && (
                              <p className="text-xs text-[#1A1A2E]/60 mt-0.5">{member.affiliation}</p>
                            )}
                            {member.orcid && (
                              <a
                                href={`https://orcid.org/${member.orcid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#C9A84C] hover:text-[#D4AF37] mt-1"
                              >
                                <Fingerprint className="w-3 h-3" />
                                {member.orcid}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
