import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, BookOpen, Calendar, MapPin, Mail, GraduationCap, Fingerprint } from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single() as { data: any };

  const name = profile?.full_name || 'Academic Author';

  return {
    title: `${name} | Academic Profile | Opus Publica`,
    description: `Academic publications and profile details for ${name} on Opus Publica.`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: dbProfile } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      full_name,
      avatar_url,
      bio,
      affiliation,
      orcid,
      journals (
        id,
        name,
        slug
      )
    `)
    .eq('id', id)
    .single() as { data: any };

  if (!dbProfile) {
    notFound();
  }

  const profile = {
    id: dbProfile.id,
    full_name: dbProfile.full_name || 'Academic Researcher',
    role: dbProfile.role,
    avatar_url: dbProfile.avatar_url,
    bio: dbProfile.bio || 'Peer-reviewed academic contributor.',
    affiliation: dbProfile.affiliation || (dbProfile.journals ? `Editor, ${dbProfile.journals?.name}` : 'Opus Publica Contributor'),
    orcid: dbProfile.orcid || null,
    journalName: dbProfile.journals?.name || null,
    journalSlug: dbProfile.journals?.slug || null,
  };

  let publications: any[] = [];

  const { data: dbPubs } = await supabase
    .from('article_authors')
    .select(`
      articles (
        id,
        title,
        abstract,
        published_at,
        journals (
          name,
          slug
        )
      )
    `)
    .eq('profile_id', dbProfile.id);

  if (dbPubs) {
    publications = dbPubs
      .map((p: any) => p.articles)
      .filter(Boolean)
      .map((art: any) => ({
        id: art.id,
        title: art.title,
        abstract: art.abstract || 'No abstract available.',
        publishedAt: art.published_at,
        journalName: art.journals?.name || 'Academic Journal',
        journalSlug: art.journals?.slug || '#',
      }));
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white flex flex-col">
      <div className="h-16"></div>

      <main className="flex-grow bg-[#1A1A2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#C9A84C] hover:text-[#D4AF37] transition-colors group text-sm sm:text-base font-medium"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </div>

        <section className="py-12 bg-gradient-to-br from-[#1A1A2E] via-[#8B1A1A]/10 to-[#1A1A2E] border-b border-[#C9A84C]/10 text-center sm:text-left">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#C9A84C]/20 border border-[#C9A84C] rounded-full flex items-center justify-center text-[#C9A84C] shadow-lg">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.full_name} 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <User className="w-12 h-12 sm:w-16 sm:h-16" />
                )}
              </div>

              <div className="space-y-2">
                <span className="px-2.5 py-0.5 bg-[#C9A84C]/20 text-[#C9A84C] font-mono text-xs rounded uppercase tracking-wider">
                  {profile.role}
                </span>
                <h1 className="text-3xl sm:text-4xl font-serif text-white font-bold">
                  {profile.full_name}
                </h1>
                {profile.orcid && (
                  <a
                    href={`https://orcid.org/${profile.orcid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#C9A84C] hover:text-[#D4AF37] text-sm font-mono transition-colors"
                  >
                    <Fingerprint className="w-4 h-4" />
                    {profile.orcid}
                  </a>
                )}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-white/80 items-center justify-center sm:justify-start">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#C9A84C]" />
                    <span>{profile.affiliation}</span>
                  </div>
                  {profile.journalSlug && (
                    <>
                      <span className="hidden sm:inline">&#8226;</span>
                      <Link 
                        href={`/${profile.journalSlug}`}
                        className="text-[#C9A84C] hover:underline"
                      >
                        Managing Journal: {profile.journalName}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-[#F5F0E8] text-[#1A1A2E] flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-black/5">
                  <h3 className="text-[#8B1A1A] font-serif text-lg font-bold mb-3 border-b border-[#8B1A1A]/10 pb-2">
                    Biography
                  </h3>
                  <p className="text-sm sm:text-base text-[#1A1A2E]/80 leading-relaxed">
                    {profile.bio}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-black/5 text-sm space-y-3 text-[#1A1A2E]/80">
                  {profile.affiliation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#8B1A1A]" />
                      <span>{profile.affiliation}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#8B1A1A]" />
                    <span>Opus Publica Contributor</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <h2 className="text-2xl font-serif text-[#8B1A1A] font-bold border-b border-[#8B1A1A]/10 pb-2 mb-4">
                  Scholarly Publications ({publications.length})
                </h2>

                {publications.length > 0 ? (
                  <div className="space-y-6">
                    {publications.map((pub) => (
                      <div 
                        key={pub.id}
                        className="bg-white p-6 rounded-lg shadow-sm border border-black/5"
                      >
                        <span className="text-xs text-[#8B1A1A] font-mono tracking-wide font-semibold uppercase">
                          Published In: {pub.journalName}
                        </span>
                        
                        <h3 className="text-lg font-serif text-[#1A1A2E] font-semibold mt-1 mb-2 hover:text-[#8B1A1A] transition-colors duration-150">
                          <Link href={`/${pub.journalSlug}/article/${pub.id}`}>
                            {pub.title}
                          </Link>
                        </h3>

                        <p className="text-[#1A1A2E]/70 text-sm line-clamp-2 leading-relaxed mb-4">
                          {pub.abstract}
                        </p>

                        <div className="flex items-center justify-between text-xs text-[#1A1A2E]/60 pt-3 border-t border-black/5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(pub.publishedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                            })}
                          </span>
                          
                          <Link 
                            href={`/${pub.journalSlug}/article/${pub.id}`}
                            className="font-semibold text-[#8B1A1A] hover:underline flex items-center gap-1 text-sm"
                          >
                            View Paper
                            <BookOpen className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-8 rounded-lg shadow-sm border border-black/5 text-center">
                    <BookOpen className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-[#1A1A2E]/60">No publications yet</h3>
                    <p className="text-xs text-[#1A1A2E]/40 mt-1">Publications will appear here once articles are published.</p>
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
