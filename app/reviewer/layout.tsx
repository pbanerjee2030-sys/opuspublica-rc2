'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (!profile || !['reviewer', 'editor', 'admin'].includes((profile as any).role)) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-2xl font-serif font-bold text-white">Access Denied</h1>
          <p className="text-zinc-400 text-sm">You do not have reviewer permissions.</p>
          <Link href="/" className="inline-block px-4 py-2 bg-[#C9A84C] text-[#13131A] text-sm font-bold rounded-lg hover:bg-[#D4AF37] transition-colors">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      <header className="border-b border-zinc-800 bg-[#111118]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/reviewer" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#C9A84C] rounded-lg flex items-center justify-center">
              <span className="text-[#13131A] font-bold text-sm">R</span>
            </div>
            <span className="text-sm font-serif font-bold text-white">Reviewer Portal</span>
          </Link>
          <Link href="/" className="text-xs text-zinc-500 hover:text-white transition-colors">
            Back to Site
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
