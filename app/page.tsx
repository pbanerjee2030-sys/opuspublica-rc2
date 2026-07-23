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
  Search,
} from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
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
    <div className="min-h-screen bg-bg text-text flex flex-col overflow-x-hidden">

      {/* HERO SECTION */}
      <section id="home" className="pt-32 pb-20 border-b border-border bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-xs font-bold uppercase tracking-wider text-accent">
              <GraduationCap className="w-3.5 h-3.5" />
              Open Access Academic Repository
            </span>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-primary tracking-tight leading-tight max-w-4xl mx-auto">
              Advancing Global Policy &amp; Research
            </h1>
            <p className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Bridging classical statecraft and contemporary global governance through peer-reviewed research, open-access journals, and authoritative books.
            </p>
          </div>

          <div className="max-w-xl mx-auto w-full">
            <div className="flex border border-border min-w-0">
              <div className="flex items-center pl-4 pr-3 bg-surface border-r border-border shrink-0">
                <Search className="w-4 h-4 text-text-secondary/60" />
              </div>
              <input
                type="text"
                placeholder="Search articles, DOIs, authors..."
                className="flex-1 py-3 px-3 bg-surface text-sm text-text placeholder:text-text-secondary/40 outline-none min-w-0"
              />
              <button className="px-3 sm:px-5 py-3 bg-primary text-white text-xs sm:text-sm font-semibold tracking-wider uppercase hover:bg-primary-hover transition-colors shrink-0">
                Search
              </button>
            </div>
          </div>

          <div className="flex justify-center items-center gap-4 pt-2">
            <a
              href="#journals"
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              Explore Journals
            </a>
            <Link
              href="/submit"
              className="px-6 py-3 border border-border hover:border-accent/50 text-text-secondary hover:text-text text-sm font-semibold rounded-lg transition-all"
            >
              Submit Manuscript
            </Link>
          </div>
        </div>
      </section>

      {/* LATEST RESEARCH FEED — most prominent */}
      <section className="py-20 border-b border-border bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <header className="mb-12">
            <div className="w-12 h-px bg-accent mb-4"></div>
            <h2 className="text-3xl font-serif font-bold text-primary tracking-tight">Latest Research</h2>
            <p className="text-sm text-text-secondary mt-1.5 max-w-md leading-relaxed">
              Recently approved papers and policy briefs indexed on Opus Publica.
            </p>
          </header>

          {latestArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {latestArticles.map((article) => (
                <Link 
                  key={article.id}
                  href={`/${article.journal_slug}/article/${article.id}`}
                  className="bg-surface border border-border hover:border-accent/25 rounded-xl p-6 block hover:shadow-sm transition-all group"
                >
                  <div className="flex flex-col h-full justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-text-secondary">
                        <span className="text-accent font-semibold">{article.journal_name}</span>
                        <span className="text-accent">|</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(article.published_at).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      <h3 className="text-base font-serif font-bold text-primary group-hover:text-accent transition-colors leading-snug">
                        {article.title}
                      </h3>

                      <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
                        {article.abstract}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <User className="w-3.5 h-3.5" />
                        {article.author_name}
                      </span>
                      <span className="text-xs font-semibold text-accent group-hover:text-accent-hover transition-colors flex items-center gap-0.5">
                        Read Paper
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-surface border border-border rounded-xl">
              <BookOpen className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-text">No published articles yet</h3>
              <p className="text-sm text-text-secondary mt-2">Articles will appear here once published by editors.</p>
            </div>
          )}

          <div className="text-center pt-10">
              <p className="text-sm text-text-secondary">
                Need to search older indexes? Use the search bar above to scan all historical volumes.
              </p>
          </div>
        </div>
      </section>

      {/* JOURNALS GRID */}
      <section id="journals" className="py-20 border-b border-border bg-bg-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <header className="mb-12 flex justify-between items-end">
            <div>
              <div className="w-12 h-px bg-accent mb-4"></div>
              <h2 className="text-3xl font-serif font-bold text-primary tracking-tight">Active Journals</h2>
              <p className="text-sm text-text-secondary mt-1.5 max-w-md leading-relaxed">
                Indexed repositories addressing international relations, human rights, finance, and ecology.
              </p>
            </div>
            <div className="hidden sm:block">
              <span className="text-sm text-text-secondary/60 font-medium">
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
                  className="bg-surface border border-border hover:border-accent/30 rounded-xl overflow-hidden flex flex-col group shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-bg-alt">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={`${journal.name} Cover`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-accent/5">
                        <BookOpen className="w-8 h-8 text-accent/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-60" />
                  </div>

                  <div className="p-4 space-y-2 flex-1 flex flex-col">
                    <h3 className="text-sm font-serif font-bold text-primary group-hover:text-accent transition-colors leading-tight line-clamp-2">
                      {journal.name}
                    </h3>
                    <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed flex-1">
                      {journal.description}
                    </p>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-xs text-text-secondary/60">View Journal</span>
                      <ChevronRight className="w-3.5 h-3.5 text-accent group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* BOOKS DISPLAY */}
      <section id="books" className="py-20 border-b border-border bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <header className="mb-12">
            <div className="w-12 h-px bg-accent mb-4"></div>
            <h2 className="text-3xl font-serif font-bold text-primary tracking-tight">Recent Book Publications</h2>
            <p className="text-sm text-text-secondary mt-1.5 max-w-lg leading-relaxed">
              Monographs and collaborative edits offering historical depth to policy questions.
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            {dbBooks.map((book) => {
              const displayAuthor = book.authors && book.authors.length > 0
                ? (book.authors.length > 1 ? `${book.authors[0].name} et al.` : book.authors[0].name)
                : 'Unknown Author';

              return (
                <div 
                  key={book.id}
                  className="group relative bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/30 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col"
                >
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-bg-alt">
                    {book.cover_image ? (
                      <Image
                        src={book.cover_image}
                        alt={`${book.title} Cover`}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
                        priority
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-accent/5">
                        <BookOpen className="w-8 h-8 text-accent/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-60" />
                    <div className="absolute top-3 right-3 z-20">
                      <span className="text-[10px] uppercase tracking-widest font-bold bg-accent/90 text-primary px-2 py-0.5 rounded-full">
                        {book.status}
                      </span>
                    </div>
                  </div>

                  <div className="relative p-4 space-y-2 flex-1 flex flex-col">
                    <h3 className="text-sm font-serif font-bold text-primary line-clamp-2 leading-snug group-hover:text-accent transition-colors duration-300">
                      {book.title}
                    </h3>
                    <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed flex-1">
                      {book.description}
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <User className="w-3 h-3 text-accent" />
                      <span className="text-xs text-text-secondary/70 font-medium">{displayAuthor}</span>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <Link
                      href={`/books/${book.slug}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-bg-alt hover:bg-accent/10 border border-border hover:border-accent/30 text-text-secondary hover:text-accent text-sm font-semibold rounded-lg transition-all duration-300"
                    >
                      View Details
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT/MISSION SECTION */}
      <section id="about" className="py-20 border-b border-border bg-bg-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6 max-w-4xl mx-auto mb-16">
            <div className="w-12 h-px bg-accent mx-auto"></div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary">Academic Integrity &amp; Global Access</h2>
            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl mx-auto">
              Opus Publica provides a multi-tenant environment facilitating rigorous academic vetting. All published manuscripts undergo rigorous peer review and receive formal Crossref DOIs for indexing integration in world databases, enabling researchers to discover cross-disciplinary insights.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: GraduationCap, value: String(dbJournals.length || 8), label: 'Active Journals' },
              { icon: BookOpen, value: String(latestArticles.length || 3), label: 'Published Papers' },
              { icon: User, value: '50+', label: 'Academic Contributors' },
            ].map((stat, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-6 text-center hover:shadow-sm transition-shadow">
                <stat.icon className="w-5 h-5 text-accent mx-auto mb-3" />
                <div className="text-2xl font-serif font-bold text-primary">{stat.value}</div>
                <div className="text-xs uppercase tracking-wider text-text-secondary mt-1 font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all"
            >
              Learn More About Us
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CONTACT & OFFICES SECTION */}
      <section id="contact" className="py-20 bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-12">
            <div className="w-12 h-px bg-accent mb-4"></div>
            <h2 className="text-2xl font-serif font-bold text-primary">Global Offices</h2>
            <p className="text-sm text-text-secondary mt-1">Advocacy Unified Network Locations</p>
          </header>

          <div className="grid sm:grid-cols-3 gap-6">
            {addresses.slice(0, 3).map((addr, index) => (
              <div 
                key={index}
                className="bg-surface border border-border rounded-xl p-6 flex flex-col justify-between hover:shadow-sm transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {index === 0 ? (
                      <Building2 className="w-4 h-4 text-accent" />
                    ) : index === 1 ? (
                      <MapPin className="w-4 h-4 text-accent" />
                    ) : (
                      <Mail className="w-4 h-4 text-accent" />
                    )}
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{addr.label}</h3>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{addr.address}</p>
                </div>

                {addr.note && (
                  <div className="mt-4 text-xs text-text-secondary/60 font-semibold uppercase font-mono">
                    {addr.note}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all"
            >
              View All Offices & Contact
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <ScrollToTop />

    </div>
  );
}
