import { getSupabaseAdmin } from '@/lib/supabase-admin';
import Link from 'next/link';
import Image from 'next/image';
import { 
  BookOpen, 
  ArrowRight, 
  Calendar, 
  User, 
  Compass, 
  GraduationCap, 
  ChevronRight,
  Mail, 
  MapPin, 
  Building2,
} from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import SearchBar from '@/components/SearchBar';
import type { DatabaseJournal } from '@/lib/types';

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

function getJournalCover(slug: string): string | null {
  return JOURNAL_COVER_MAP[slug] || null;
}

interface ArticleData {
  id: string;
  title: string;
  abstract: string;
  published_at: string;
  journal_name: string;
  journal_slug: string;
  author_name: string;
}

const addresses = [
  { 
    label: "Headquarters", 
    icon: "Building2",
    address: "Fluwelen Burgwal 58, 2511 CJ Den Haag, Netherlands",
    note: "Advocacy Unified Network"
  },
  { 
    label: "Registered Office", 
    icon: "MapPin",
    address: "85 MOUNT HOPE RD, MAHOPAC NY 10541-0000, USA"
  },
  { 
    label: "SAARC Office", 
    icon: "Globe",
    address: "Anamnagar, Kathmandu, Nepal"
  },
];

export const revalidate = 0;

export default async function Home() {
  const supabase = getSupabaseAdmin();

  let dbJournals: DatabaseJournal[] = [];
  try {
    const { data } = await supabase.from('journals').select('*').order('name');
    if (data && data.length > 0) {
      dbJournals = data;
    }
  } catch (e) {
    console.error('Error querying journals database:', e);
  }

  let dbBooks: any[] = [];
  try {
    const { data } = await (supabase as any).from('books').select('*');
    if (data && data.length > 0) {
      const slugOrder = ['grace-timekeepers', 'echoes-of-the-himalayas', 'bhagavad-gita-ballot-box'];
      dbBooks = [...data].sort((a, b) => slugOrder.indexOf(a.slug) - slugOrder.indexOf(b.slug));
    }
  } catch (e) {
    console.error('Error querying books database:', e);
  }

  let latestArticles: ArticleData[] = [];
  try {
    const { data: articles, error } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        abstract,
        published_at,
        status,
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
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(6);

    if (!error && articles && articles.length > 0) {
      latestArticles = articles.map((art: any) => ({
        id: art.id,
        title: art.title,
        abstract: art.abstract || 'No abstract available.',
        published_at: art.published_at,
        journal_name: art.journals?.name || 'Academic Journal',
        journal_slug: art.journals?.slug || '',
        author_name: art.article_authors?.[0]?.profiles?.full_name || 'Academic Contributor'
      }));
    }
  } catch (e) {
    console.error('Error querying articles database:', e);
  }

  return (
    <div className="min-h-screen bg-[#0D0D11] text-zinc-100 flex flex-col font-sans selection:bg-[#C9A84C] selection:text-[#0D0D11]">
      
      {/* HERO SECTION */}
      <section id="home" className="relative overflow-hidden pt-32 pb-20 border-b border-zinc-900 bg-gradient-to-b from-[#13131A] via-[#0D0D11] to-[#0D0D11]">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C9A84C]/5 rounded-full filter blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#8B1A1A]/3 rounded-full filter blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <GraduationCap className="w-3.5 h-3.5 text-[#C9A84C]" />
              Open Access Academic Repository
            </span>
            <h1 className="text-4xl sm:text-6xl font-serif font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
              Advancing Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] via-amber-200 to-[#C9A84C]">Policy &amp; Research</span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto font-sans leading-relaxed">
              Bridging classical statecraft and contemporary global governance through peer-reviewed research, open-access journals, and authoritative books.
            </p>
          </div>

          <SearchBar placeholder="Search articles, DOIs, authors, or subjects..." className="max-w-2xl mx-auto" />

          <div className="flex justify-center items-center gap-4 pt-2">
            <a
              href="#journals"
              className="px-6 py-3 bg-[#8B1A1A] hover:bg-[#1A1A2E] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg"
            >
              Explore Journals
            </a>
            <Link
              href="/submit"
              className="px-6 py-3 border border-zinc-800 hover:border-[#C9A84C]/50 hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            >
              Submit Manuscript
            </Link>
          </div>
        </div>
      </section>

      {/* DYNAMIC JOURNALS GRID */}
      <section id="journals" className="py-20 border-b border-zinc-900 bg-[#0D0D11]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <header className="mb-12 flex justify-between items-end">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] mb-2 font-mono">Academic Portals</div>
              <h2 className="text-3xl font-serif font-bold text-white tracking-tight">Active Journals</h2>
              <p className="text-xs text-zinc-400 mt-1.5 max-w-md leading-relaxed">
                Indexed repositories addressing international relations, human rights, finance, and ecology.
              </p>
            </div>
            <div className="hidden sm:block">
              <span className="text-xs text-zinc-500 font-medium">
                {dbJournals.length} active publication tracks
              </span>
            </div>
          </header>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {dbJournals.map((journal) => {
              const cover = getJournalCover(journal.slug);
              return (
                <Link
                  key={journal.id}
                  href={`/${journal.slug}`}
                  className="bg-[#13131A] border border-zinc-800 hover:border-[#C9A84C]/30 rounded-xl overflow-hidden flex flex-col group shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Cover Image */}
                  <div className="relative w-full h-36 overflow-hidden bg-zinc-900">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={`${journal.name} Cover`}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#8B1A1A]/10">
                        <BookOpen className="w-10 h-10 text-[#8B1A1A]/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#13131A] via-transparent to-transparent opacity-70" />
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-2 flex-1 flex flex-col">
                    <h3 className="text-sm font-serif font-bold text-white group-hover:text-[#C9A84C] transition-colors leading-tight line-clamp-2">
                      {journal.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed font-sans flex-1">
                      {journal.description}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-900">
                      <span className="text-[10px] font-mono text-zinc-500">View Journal</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#C9A84C] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* LATEST RESEARCH FEED */}
      <section className="py-20 border-b border-zinc-900 bg-[#0D0D11]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <header className="mb-12">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] mb-2 font-mono">Research Feed</div>
            <h2 className="text-3xl font-serif font-bold text-white tracking-tight">Latest Research</h2>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-md leading-relaxed">
              Recently approved papers, case studies, and policy briefs indexed on Opus Publica.
            </p>
          </header>

          {latestArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {latestArticles.map((article) => (
                <Link 
                  key={article.id}
                  href={`/${article.journal_slug}/article/${article.id}`}
                  className="bg-[#13131A]/60 border border-zinc-800/80 hover:border-[#C9A84C]/25 rounded-xl p-6 block hover:bg-[#13131A] transition-all group shadow-xs"
                >
                  <div className="flex flex-col h-full justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                        <span className="text-[#C9A84C] font-semibold">{article.journal_name}</span>
                        <span>&#8226;</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          {new Date(article.published_at).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      <h3 className="text-base font-serif font-bold text-white group-hover:text-[#C9A84C] transition-colors leading-snug">
                        {article.title}
                      </h3>
                      
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-sans font-normal">
                        {article.abstract}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-zinc-900/60 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        {article.author_name}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]/70 group-hover:text-white transition-colors flex items-center gap-0.5">
                        Read Paper
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[#13131A]/60 border border-zinc-800 rounded-xl">
              <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-zinc-300">No published articles yet</h3>
              <p className="text-xs text-zinc-500 mt-2">Articles will appear here once published by editors.</p>
            </div>
          )}

          <div className="text-center pt-10">
            <p className="text-xs text-zinc-500">
              Need to search older indexes? Use the search bar in the hero section to scan all historical volumes.
            </p>
          </div>
        </div>
      </section>

      {/* BOOKS DISPLAY */}
      <section id="books" className="py-24 border-b border-zinc-900 bg-gradient-to-b from-[#0D0D11] via-[#13131A] to-[#0D0D11]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <header className="mb-16 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] mb-3 font-mono">Policy Volumes</div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">Recent Book Publications</h2>
            <p className="text-sm text-zinc-400 mt-3 max-w-lg mx-auto leading-relaxed">
              Monographs and collaborative edits offering historical depth to policy questions.
            </p>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent mx-auto mt-6"></div>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            {dbBooks.map((book) => {
              const displayAuthor = book.authors && book.authors.length > 0
                ? (book.authors.length > 1 ? `${book.authors[0].name} et al.` : book.authors[0].name)
                : 'Unknown Author';

              return (
                <div 
                  key={book.id}
                  className="group relative bg-[#13131A] border border-zinc-800/60 rounded-xl overflow-hidden hover:border-[#C9A84C]/30 transition-all duration-500 shadow-md hover:shadow-xl hover:shadow-[#C9A84C]/5 flex flex-col"
                >
                  {/* Cover Image */}
                  <div className="relative w-full h-48 overflow-hidden bg-zinc-900">
                    {book.cover_image ? (
                      <Image
                        src={book.cover_image}
                        alt={`${book.title} Cover`}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
                        priority
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#8B1A1A]/10">
                        <BookOpen className="w-10 h-10 text-[#8B1A1A]/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#13131A] via-transparent to-transparent opacity-60" />
                    <div className="absolute top-3 right-3 z-20">
                      <span className="text-[8px] uppercase tracking-widest font-bold bg-[#C9A84C]/90 text-[#13131A] px-2 py-0.5 rounded-full">
                        {book.status}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative p-4 space-y-2 flex-1 flex flex-col">
                    <h3 className="text-sm font-serif font-bold text-white line-clamp-2 leading-snug group-hover:text-[#C9A84C] transition-colors duration-300">
                      {book.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed flex-1">
                      {book.description}
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <User className="w-3 h-3 text-[#C9A84C]" />
                      <span className="text-[10px] text-zinc-500 font-medium">{displayAuthor}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 pb-4">
                    <Link
                      href={`/books/${book.slug}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-[#C9A84C]/10 border border-zinc-800 hover:border-[#C9A84C]/30 text-zinc-300 hover:text-[#C9A84C] text-[11px] font-bold rounded-lg transition-all duration-300"
                    >
                      View Details
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT/MISSION SECTION */}
      <section id="about" className="py-20 border-b border-zinc-900 bg-[#0D0D11]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6 max-w-4xl mx-auto mb-16">
            <div className="w-12 h-12 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] flex items-center justify-center mx-auto">
              <Compass className="w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">Academic Integrity &amp; Global Access</h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans font-normal">
              Opus Publica provides a multi-tenant environment facilitating rigorous academic vetting. All published manuscripts undergo rigorous peer review and receive formal Crossref DOIs for indexing integration in world databases, enabling researchers to discover cross-disciplinary insights.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: GraduationCap, value: String(dbJournals.length || 8), label: 'Active Journals' },
              { icon: BookOpen, value: String(latestArticles.length || 3), label: 'Published Papers' },
              { icon: User, value: '50+', label: 'Academic Contributors' },
            ].map((stat, i) => (
              <div key={i} className="bg-[#13131A] border border-zinc-800 rounded-xl p-6 text-center hover:border-zinc-700 transition-colors">
                <stat.icon className="w-6 h-6 text-[#C9A84C] mx-auto mb-3" />
                <div className="text-2xl font-serif font-bold text-white">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1 font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT & OFFICES SECTION */}
      <section id="contact" className="py-20 bg-[#0D0D11]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-12 text-center">
            <h2 className="text-2xl font-serif font-bold text-white">Global Offices</h2>
            <p className="text-xs text-zinc-400 mt-1">Advocacy Unified Network Locations</p>
          </header>

          <div className="grid sm:grid-cols-3 gap-6">
            {addresses.map((addr, index) => (
              <div 
                key={index}
                className="bg-[#13131A] border border-zinc-800 rounded-xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {index === 0 ? (
                      <Building2 className="w-4 h-4 text-[#C9A84C]" />
                    ) : index === 1 ? (
                      <MapPin className="w-4 h-4 text-[#C9A84C]" />
                    ) : (
                      <Mail className="w-4 h-4 text-[#C9A84C]" />
                    )}
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">{addr.label}</h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">{addr.address}</p>
                </div>
                
                {addr.note && (
                  <div className="mt-4 text-[10px] text-zinc-500 font-semibold uppercase font-mono">
                    {addr.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <ScrollToTop />

    </div>
  );
}
