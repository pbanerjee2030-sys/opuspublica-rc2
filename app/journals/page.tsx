import { getSupabaseAdmin } from '@/lib/supabase-admin';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import type { DatabaseJournal } from '@/lib/types';

export const metadata = {
  title: 'Journals | Opus Publica',
  description: 'Browse peer-reviewed academic journals published by Opus Publica covering international relations, human rights, finance, ecology, and more.',
  alternates: {
    canonical: 'https://opuspublica.com/journals',
  },
  openGraph: {
    title: 'Journals | Opus Publica',
    description: 'Browse peer-reviewed academic journals published by Opus Publica.',
    type: 'website',
    url: 'https://opuspublica.com/journals',
    siteName: 'Opus Publica',
  },
};

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

export default async function JournalsPage() {
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

  return (
    <div className="min-h-screen bg-[#0D0D11] text-zinc-100 flex flex-col font-sans">
      <div className="h-16"></div>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#C9A84C] hover:text-[#D4AF37] transition-colors group text-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </div>

        <section className="py-12 bg-[#0D0D11]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <header className="mb-12 flex justify-between items-end">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] mb-2 font-mono">Academic Portals</div>
                <h1 className="text-3xl font-serif font-bold text-white tracking-tight">All Journals</h1>
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

                    <div className="p-4 space-y-2 flex-1 flex flex-col">
                      <h2 className="text-sm font-serif font-bold text-white group-hover:text-[#C9A84C] transition-colors leading-tight line-clamp-2">
                        {journal.name}
                      </h2>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed font-sans flex-1">
                        {journal.description}
                      </p>
                    </div>

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

            {dbJournals.length === 0 && (
              <div className="text-center py-16 bg-[#13131A]/60 border border-zinc-800 rounded-xl">
                <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-zinc-300">No journals available yet</h2>
                <p className="text-xs text-zinc-500 mt-2">Journals will appear here once published.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
