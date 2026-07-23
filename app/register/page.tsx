'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Mail, 
  Lock, 
  User,
  Loader2, 
  AlertCircle, 
  BookOpen, 
  ArrowLeft,
  CheckCircle,
  Info,
  Fingerprint
} from 'lucide-react';

function getErrorMessage(err: unknown): string {
  if (err === null || err === undefined) return 'An unknown error occurred.';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || err.toString();
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (obj.message && typeof obj.message === 'string') return obj.message;
    if (obj.error_description && typeof obj.error_description === 'string') return obj.error_description;
    if (obj.error && typeof obj.error === 'string') return obj.error;
    if (obj.msg && typeof obj.msg === 'string') return obj.msg;
    if (obj.details && typeof obj.details === 'string') return obj.details;
    try { return JSON.stringify(err); } catch { return 'An unexpected error occurred.'; }
  }
  return String(err);
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orcid, setOrcid] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailConfirmRequired, setEmailConfirmRequired] = useState(false);
  
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: fullName,
            role: 'author',
            orcid: orcid || null
          }
        }
      });

      const signUpError = result.error;
      const user = result.data?.user;
      const session = result.data?.session;

      if (signUpError) {
        throw signUpError;
      }

      if (!user) {
        setError('Registration failed. No user data was returned. Please try again.');
        setLoading(false);
        return;
      }

      if (session) {
        setSuccess(true);
        const userId = user.id;
        setTimeout(() => {
          router.refresh();
          router.push(`/profile/${userId}`);
        }, 1500);
        return;
      }

      if (!session) {
        const identities = user.identities || [];
        if (identities.length === 0) {
          setError('An account with this email already exists. Please log in instead.');
          setLoading(false);
          return;
        }
        setEmailConfirmRequired(true);
        setLoading(false);
        return;
      }

    } catch (err: unknown) {
      console.error('[Register Error]', err);
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-border via-accent to-border"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/5 rounded-full filter blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-text transition-colors text-xs font-semibold uppercase tracking-wider mb-6 mx-4 sm:mx-0">
          <ArrowLeft className="w-4 h-4" />
          Back to Platform Home
        </Link>

        <div className="text-center mb-6">
          <BookOpen className="w-10 h-10 text-accent mx-auto mb-2" />
          <h2 className="text-3xl font-serif font-bold text-primary tracking-tight">Create Author Account</h2>
          <p className="text-xs text-text-secondary mt-2">
            Register to submit abstracts, author details, and PDF manuscripts.
          </p>
        </div>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 sm:px-10 rounded-xl border border-border shadow-2xl space-y-6">
          
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/40 text-red-400 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{String(error)}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-950/40 border border-green-900/40 text-green-400 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Registration successful! Directing to profile...</span>
            </div>
          )}

          {emailConfirmRequired && (
            <div className="space-y-3">
              <div className="p-3 bg-accent/10 border border-accent/30 text-accent text-xs rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Check your inbox.</strong> A confirmation link has been sent to <strong>{email}</strong>. 
                  Click the link to verify your account, then come back and log in.
                </span>
              </div>
              <button
                onClick={() => {
                  setEmailConfirmRequired(false);
                  setEmail('');
                  setPassword('');
                  setFullName('');
                  setOrcid('');
                }}
                className="w-full py-2.5 bg-bg-alt hover:bg-border text-text font-semibold text-sm rounded-lg transition-colors"
              >
                Register a Different Email
              </button>
              <Link
                href="/login"
                className="block w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-lg transition-colors text-center"
              >
                Go to Login
              </Link>
            </div>
          )}

          {!emailConfirmRequired && !success && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary/60" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent placeholder:text-text-secondary/40 transition-colors"
                    placeholder="e.g. Dr. Jane Smith"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary/60" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent placeholder:text-text-secondary/40 transition-colors"
                    placeholder="e.g. researcher@institution.edu"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary/60" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent placeholder:text-text-secondary/40 transition-colors"
                    placeholder="Min 6 characters"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                  ORCID iD <span className="text-text-secondary/60 normal-case">(Optional)</span>
                </label>
                <div className="relative">
                  <Fingerprint className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary/60" />
                  <input
                    type="text"
                    value={orcid}
                    onChange={(e) => setOrcid(e.target.value)}
                    pattern="^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$"
                    className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent placeholder:text-text-secondary/40 transition-colors"
                    placeholder="0000-0002-1234-5678"
                    disabled={loading}
                  />
                </div>
                <p className="text-[9px] text-text-secondary/60">16-digit identifier from orcid.org</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-primary text-white hover:bg-primary-hover font-semibold text-sm rounded-lg shadow-md transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Register & Sign Up'
                )}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-border text-center">
            <p className="text-xs text-text-secondary">
              Already have an author account?{' '}
              <Link href="/login" className="text-accent hover:text-accent-hover hover:underline font-bold">
                Log In
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
