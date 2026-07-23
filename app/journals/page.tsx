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
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans">
      <div className="h-16"></div>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors group text-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </div>

        <section className="py-12 bg-bg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <header className="mb-12 flex justify-between items-end">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-accent mb-2 font-mono">Academic Portals</div>
                <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">All Journals</h1>
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
                    className="bg-surface border border-border hover:border-accent/30 rounded-xl overflow-hidden flex flex-col group shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
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
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <BookOpen className="w-10 h-10 text-accent/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-70" />
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col">
                      <h2 className="text-sm font-serif font-bold text-primary group-hover:text-accent transition-colors leading-tight line-clamp-2">
                        {journal.name}
                      </h2>
                      <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed font-sans flex-1">
                        {journal.description}
                      </p>
                    </div>

                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-xs font-mono text-text-secondary/60">View Journal</span>
                        <ChevronRight className="w-3.5 h-3.5 text-accent group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {dbJournals.length === 0 && (
              <div className="text-center py-16 bg-surface/60 border border-border rounded-xl">
                <BookOpen className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-text-secondary">No journals available yet</h2>
                <p className="text-sm text-text-secondary/60 mt-2">Journals will appear here once published.</p>
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
