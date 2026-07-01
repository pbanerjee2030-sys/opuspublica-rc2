'use client';

import React, { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  BookOpen, 
  ArrowLeft,
  CheckCircle,
  Database
} from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      if (data?.user) {
        setSuccess(true);
        // Query user role to determine smart redirect
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        setTimeout(() => {
          router.refresh();
          if (redirectTo) {
            router.push(redirectTo);
          } else if (profile?.role === 'editor' || profile?.role === 'admin') {
            router.push('/admin/dashboard');
          } else {
            router.push(`/profile/${data.user.id}`);
          }
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify details and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#13131A] text-zinc-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Background Accent Gradients */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-zinc-700 via-[#C9A84C] to-zinc-700"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#C9A84C]/5 rounded-full filter blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#8B1A1A]/5 rounded-full filter blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider mb-6 mx-4 sm:mx-0">
          <ArrowLeft className="w-4 h-4" />
          Back to Platform Home
        </Link>

        <div className="text-center mb-6">
          <BookOpen className="w-10 h-10 text-[#C9A84C] mx-auto mb-2" />
          <h2 className="text-3xl font-serif font-bold text-white tracking-tight">Welcome Back</h2>
          <p className="text-xs text-zinc-400 mt-2">
            Access secure manuscript submissions and editorial triage panels.
          </p>
        </div>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-[#1C1C24] py-8 px-6 sm:px-10 rounded-xl border border-zinc-800 shadow-2xl space-y-6">
          
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/40 text-red-400 text-xs rounded-lg flex items-center gap-2 animate-pulse">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-950/40 border border-green-900/40 text-green-400 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Login successful! Redirecting to workspace...</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#13131A] border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-[#C9A84C] placeholder-zinc-600 transition-colors"
                  placeholder="name@opuspublica.org"
                  disabled={loading || success}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#13131A] border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-[#C9A84C] placeholder-zinc-600 transition-colors"
                  placeholder="••••••••"
                  disabled={loading || success}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-zinc-200 text-black font-semibold text-sm rounded-lg shadow-md transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-400">
              Don&apos;t have an author account?{' '}
              <Link href="/register" className="text-[#C9A84C] hover:underline font-bold">
                Create Account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#13131A] text-zinc-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-[#C9A84C] animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">Initializing secure session...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
