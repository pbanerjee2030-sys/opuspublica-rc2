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
      .limit(200);
    
    if (data) {
      dbArticles = data;
    }
  } catch (e) {
    console.error('Search query database error:', e);
  }

  const sourceArticles: FilteredArticle[] = dbArticles.map((art: any) => {
    const authors = art.article_authors?.map((aa: any) => aa.profiles?.full_name || '').filter(Boolean) || [];
    return {
      id: art.id,
      title: art.title,
      abstract: art.abstract || 'No abstract available.',
      published_at: art.published_at,
      journal_name: art.journals?.name || 'Academic Journal',
      journal_slug: art.journals?.slug || '',
      author_name: authors[0] || 'Academic Contributor',
      all_authors: authors
    };
  });

  const searchQuery = q.trim().toLowerCase();
  const results = searchQuery
    ? sourceArticles.filter(art => {
        const titleMatch = art.title.toLowerCase().includes(searchQuery);
        const abstractMatch = art.abstract.toLowerCase().includes(searchQuery);
        const journalMatch = art.journal_name.toLowerCase().includes(searchQuery);
        const authorMatch = art.all_authors.some(name => name.toLowerCase().includes(searchQuery));
        return titleMatch || abstractMatch || journalMatch || authorMatch;
      })
    : [];

  return (
    <div className="min-h-screen bg-[#0D0D11] text-zinc-100 flex flex-col font-sans selection:bg-[#C9A84C] selection:text-[#0D0D11]">
      
      <section className="relative overflow-hidden pt-32 pb-16 border-b border-zinc-900 bg-gradient-to-b from-[#13131A] via-[#0D0D11] to-[#0D0D11]">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#C9A84C]/5 rounded-full filter blur-3xl pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <GraduationCap className="w-3.5 h-3.5 text-[#C9A84C]" />
              Repository Search Engine
            </span>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
              Search Research Index
            </h1>
          </div>

          <div className="max-w-2xl mx-auto">
            <SearchBar placeholder="Search by title, keywords, authors, or DOIs..." />
          </div>
        </div>
      </section>

      <main className="flex-grow bg-[#0D0D11] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">

          {!q && (
            <div className="bg-[#13131A]/60 border border-zinc-800 rounded-xl p-12 text-center max-w-2xl mx-auto space-y-6">
              <HelpCircle className="w-12 h-12 text-zinc-650 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-300">Search the Repository</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  Enter keywords in the input field above to query the index. You can search by article title, abstract topics, authors, or registered DOIs.
                </p>
              </div>
            </div>
          )}

          {q && results.length === 0 && (
            <div className="bg-[#13131A]/60 border border-zinc-800 rounded-xl p-12 text-center max-w-2xl mx-auto space-y-6">
              <AlertCircle className="w-12 h-12 text-zinc-650 mx-auto animate-pulse" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-300">No results found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  We could not find any published articles matching your keyword: <strong className="text-[#C9A84C] font-mono">&apos;{q}&apos;</strong>. Try adjusting spelling or using generic terms.
                </p>
              </div>
            </div>
          )}

          {q && results.length > 0 && (
            <div className="space-y-8">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <span className="text-xs text-zinc-400 font-medium font-sans">
                  Found <strong className="text-white">{results.length}</strong> matching published papers for keyword: <span className="text-[#C9A84C] font-mono font-bold">&apos;{q}&apos;</span>
                </span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                  Indexed Resolvers
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {results.map((article) => (
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

                      <div className="pt-4 border-t border-zinc-900/60 flex items-center justify-between font-sans">
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
            </div>
          )}

        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
