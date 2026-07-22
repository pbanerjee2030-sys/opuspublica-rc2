import { getSupabaseAdmin } from '@/lib/supabase-admin';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ArrowRight, User, ArrowLeft } from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

export const metadata = {
  title: 'Books | Opus Publica',
  description: 'Browse monographs and edited volumes published by Opus Publica covering policy, history, and international affairs.',
  alternates: {
    canonical: 'https://opuspublica.com/books',
  },
  openGraph: {
    title: 'Books | Opus Publica',
    description: 'Browse monographs and edited volumes published by Opus Publica.',
    type: 'website',
    url: 'https://opuspublica.com/books',
    siteName: 'Opus Publica',
  },
};

export default async function BooksPage() {
  const supabase = getSupabaseAdmin();

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

        <section className="py-12 bg-gradient-to-b from-[#0D0D11] via-[#13131A] to-[#0D0D11]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <header className="mb-16 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] mb-3 font-mono">Policy Volumes</div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">All Book Publications</h1>
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

                    <div className="relative p-4 space-y-2 flex-1 flex flex-col">
                      <h2 className="text-sm font-serif font-bold text-white line-clamp-2 leading-snug group-hover:text-[#C9A84C] transition-colors duration-300">
                        {book.title}
                      </h2>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed flex-1">
                        {book.description}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <User className="w-3 h-3 text-[#C9A84C]" />
                        <span className="text-[10px] text-zinc-500 font-medium">{displayAuthor}</span>
                      </div>
                    </div>

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

            {dbBooks.length === 0 && (
              <div className="text-center py-16 bg-[#13131A]/60 border border-zinc-800 rounded-xl">
                <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-zinc-300">No books available yet</h2>
                <p className="text-xs text-zinc-500 mt-2">Books will appear here once published.</p>
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
