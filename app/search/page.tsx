import { getSupabaseAdmin } from '@/lib/supabase-admin';
import Link from 'next/link';
import { 
  Calendar, 
  User, 
  ArrowRight, 
  GraduationCap, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import SearchBar from '@/components/SearchBar';

interface SearchParams {
  q?: string;
}

interface FilteredArticle {
  id: string;
  title: string;
  abstract: string;
  published_at: string;
  journal_name: string;
  journal_slug: string;
  author_name: string;
  all_authors: string[];
  doi?: string | null;
}

export const revalidate = 0;

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';
  const supabase = getSupabaseAdmin();

  let dbArticles: any[] = [];
  try {
    const { data } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        abstract,
        published_at,
        status,
        doi,
        journals (
          name,
          slug
        ),
        article_authors (
          co_author_name,
          profiles (
            full_name
          )
        )
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(200);
    
    if (data) {
      dbArticles = data;
    }
  } catch (e) {
    console.error('Search query database error:', e);
  }

  const sourceArticles: FilteredArticle[] = dbArticles.map((art: any) => {
    const authors = art.article_authors?.map((aa: any) => aa.profiles?.full_name || aa.co_author_name || '').filter(Boolean) || [];
    return {
      id: art.id,
      title: art.title,
      abstract: art.abstract || 'No abstract available.',
      published_at: art.published_at,
      journal_name: art.journals?.name || 'Academic Journal',
      journal_slug: art.journals?.slug || '',
      author_name: authors[0] || 'Academic Contributor',
      all_authors: authors,
      doi: art.doi
    };
  });

  const searchQuery = q.trim().toLowerCase();
  const results = searchQuery
    ? sourceArticles.filter(art => {
        const titleMatch = art.title.toLowerCase().includes(searchQuery);
        const abstractMatch = art.abstract.toLowerCase().includes(searchQuery);
        const journalMatch = art.journal_name.toLowerCase().includes(searchQuery);
        const authorMatch = art.all_authors.some(name => name.toLowerCase().includes(searchQuery));
        const doiMatch = art.doi?.toLowerCase().includes(searchQuery) || false;
        return titleMatch || abstractMatch || journalMatch || authorMatch || doiMatch;
      })
    : [];

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans selection:bg-accent selection:text-white overflow-x-hidden">
      
      <section className="relative overflow-hidden pt-32 pb-16 border-b border-border bg-bg">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/5 rounded-full filter blur-3xl pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-bold uppercase tracking-wider text-accent">
              <GraduationCap className="w-3.5 h-3.5 text-accent" />
              Repository Search Engine
            </span>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-primary tracking-tight leading-tight">
              Search Research Index
            </h1>
          </div>

          <div className="max-w-2xl mx-auto">
            <SearchBar placeholder="Search by title, keywords, authors, or DOIs..." />
          </div>
        </div>
      </section>

      <main className="flex-grow bg-bg py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">

          {!q && (
            <div className="bg-surface border border-border rounded-xl p-12 text-center max-w-2xl mx-auto space-y-6">
              <HelpCircle className="w-12 h-12 text-text-secondary/30 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-text-secondary">Search the Repository</h3>
                <p className="text-xs text-text-secondary/60 max-w-sm mx-auto leading-relaxed">
                  Enter keywords in the input field above to query the index. You can search by article title, abstract topics, authors, or registered DOIs.
                </p>
              </div>
            </div>
          )}

          {q && results.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-12 text-center max-w-2xl mx-auto space-y-6">
              <AlertCircle className="w-12 h-12 text-text-secondary/30 mx-auto animate-pulse" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-text-secondary">No results found</h3>
                <p className="text-xs text-text-secondary/60 max-w-sm mx-auto leading-relaxed">
                  We could not find any published articles matching your keyword: <strong className="text-accent font-mono">&apos;{q}&apos;</strong>. Try adjusting spelling or using generic terms.
                </p>
              </div>
            </div>
          )}

          {q && results.length > 0 && (
            <div className="space-y-8">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <span className="text-xs text-text-secondary font-medium font-sans">
                  Found <strong className="text-primary">{results.length}</strong> matching published papers for keyword: <span className="text-accent font-mono font-bold">&apos;{q}&apos;</span>
                </span>
                <span className="text-[10px] text-text-secondary/60 uppercase tracking-widest font-mono">
                  Indexed Resolvers
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {results.map((article) => (
                  <Link 
                    key={article.id}
                    href={`/${article.journal_slug}/article/${article.id}`}
                    className="bg-surface border border-border hover:border-accent/25 rounded-xl p-6 block hover:shadow-sm transition-all group"
                  >
                    <div className="flex flex-col h-full justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-text-secondary/60">
                          <span className="text-accent font-semibold">{article.journal_name}</span>
                          <span>&#8226;</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-text-secondary/60" />
                            {new Date(article.published_at).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        <h3 className="text-base font-serif font-bold text-primary group-hover:text-accent transition-colors leading-snug">
                          {article.title}
                        </h3>
                        
                        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed font-sans font-normal">
                          {article.abstract}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-border flex items-center justify-between font-sans">
                        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <User className="w-3.5 h-3.5 text-text-secondary/60" />
                          {article.author_name}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent group-hover:text-primary transition-colors flex items-center gap-0.5">
                          Read Paper
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
