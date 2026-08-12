'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, X, LogOut, LayoutDashboard, User as UserIcon, ChevronDown, FileText, Shield, BookMarked } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import type { DatabaseProfile, DatabaseJournal, ProfileWithRelations } from '@/lib/types';

interface NavbarProps {
  initialUser: { id: string; email?: string; user_metadata?: Record<string, any> } | null;
  initialProfile: ProfileWithRelations | null;
}

export default function Navbar({ initialUser, initialProfile }: NavbarProps) {
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user as any);
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*, journals(*)')
          .eq('id', session.user.id)
          .single();
        setProfile(userProfile as any);
      } else {
        setUser(initialUser);
        setProfile(initialProfile);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user as any);
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*, journals(*)')
          .eq('id', session.user.id)
          .single();
        setProfile(userProfile as any);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    setIsOpen(false);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const getInitials = () => {
    if (!profile?.full_name) return 'U';
    return profile.full_name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const isEditorOrAdmin = profile?.role === 'editor' || profile?.role === 'admin';

  return (
    <nav className="fixed w-full z-50 bg-[#1A1A2E]/90 backdrop-blur-md border-b border-[#C9A84C]/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/opus-publica-logo.png"
              alt="Opus Publica Logo"
              width={1024}
              height={682}
              className="object-contain rounded-md shadow-sm"
              style={{ width: 'auto', height: '46px' }}
            />
            <span className="text-[#C9A84C] font-bold text-xl font-serif tracking-wider group-hover:text-white transition-colors ml-1">OPUS</span>
            <span className="text-white font-bold text-xl font-serif tracking-wider group-hover:text-[#C9A84C] transition-colors">PUBLICA</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-white/80 hover:text-[#C9A84C] transition-colors text-xs font-semibold uppercase tracking-wider">
              Home
            </Link>
            <Link href="/journals" className="text-white/80 hover:text-[#C9A84C] transition-colors text-xs font-semibold uppercase tracking-wider">
              Journals
            </Link>
            <Link href="/books" className="text-white/80 hover:text-[#C9A84C] transition-colors text-xs font-semibold uppercase tracking-wider">
              Books
            </Link>
            <Link href="/about" className="text-white/80 hover:text-[#C9A84C] transition-colors text-xs font-semibold uppercase tracking-wider">
              About
            </Link>
            <Link href="/contact" className="text-white/80 hover:text-[#C9A84C] transition-colors text-xs font-semibold uppercase tracking-wider">
              Contact
            </Link>
            {isEditorOrAdmin && (
              <Link href="/admin/dashboard" className="text-[#C9A84C] hover:text-[#D4AF37] transition-colors text-xs font-bold uppercase tracking-wider">
                Dashboard
              </Link>
            )}

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:border-[#C9A84C]/40 bg-white/5 hover:bg-white/10 transition-all focus:outline-none"
                >
                  <div className="w-7 h-7 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center text-xs font-bold font-serif shadow-inner">
                    {getInitials()}
                  </div>
                  <span className="text-xs text-white/90 font-medium font-sans">
                    {profile?.full_name || user.email}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/60" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-2xl border border-black/5 p-1 text-[#1A1A2E] z-50">
                    <div className="px-3 py-2 border-b border-black/5">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-black/40">Registered Account</p>
                      <p className="text-xs font-semibold text-black truncate mt-0.5">{profile?.full_name}</p>
                      <p className="text-[10px] text-black/55 capitalize font-mono mt-0.5">Role: {profile?.role}</p>
                    </div>

                    <div className="py-1">
                      {isEditorOrAdmin && (
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-black/5 rounded-md transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#8B1A1A]" />
                          Editorial Dashboard
                        </Link>
                      )}

                      {isEditorOrAdmin && (
                        <Link
                          href="/admin/reviewers"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-black/5 rounded-md transition-colors"
                        >
                          <Shield className="w-4 h-4 text-zinc-500" />
                          Reviewer Portal
                        </Link>
                      )}

                      <Link
                        href={`/profile/${user.id}`}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-black/5 rounded-md transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-zinc-500" />
                        My Profile
                      </Link>

                      <Link
                        href="/submit"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-black/5 rounded-md transition-colors"
                      >
                        <FileText className="w-4 h-4 text-zinc-500" />
                        Submit Manuscript
                      </Link>
                    </div>

                    <div className="border-t border-black/5 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-md text-left transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-white/90 hover:text-white transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/submit"
                  className="px-3.5 py-1.5 bg-[#C9A84C] hover:bg-[#8B1A1A] text-white text-xs font-bold rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  Submit Research
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white hover:text-[#C9A84C] transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-[#1A1A2E] border-b border-[#C9A84C]/25 text-sm">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/"
              className="block text-white/80 hover:text-[#C9A84C] transition-colors text-xs font-bold uppercase tracking-wider py-1.5 border-b border-white/5"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/journals"
              className="block text-white/80 hover:text-[#C9A84C] transition-colors text-xs font-bold uppercase tracking-wider py-1.5 border-b border-white/5"
              onClick={() => setIsOpen(false)}
            >
              Journals
            </Link>
            <Link
              href="/books"
              className="block text-white/80 hover:text-[#C9A84C] transition-colors text-xs font-bold uppercase tracking-wider py-1.5 border-b border-white/5"
              onClick={() => setIsOpen(false)}
            >
              Books
            </Link>
            <Link
              href="/about"
              className="block text-white/80 hover:text-[#C9A84C] transition-colors text-xs font-bold uppercase tracking-wider py-1.5 border-b border-white/5"
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>
            <Link
              href="/contact"
              className="block text-white/80 hover:text-[#C9A84C] transition-colors text-xs font-bold uppercase tracking-wider py-1.5 border-b border-white/5"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
            {isEditorOrAdmin && (
              <Link
                href="/admin/dashboard"
                className="block text-[#C9A84C] hover:text-[#D4AF37] transition-colors text-xs font-bold uppercase tracking-wider py-1.5 border-b border-white/5"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
            )}

            {user ? (
              <div className="pt-2 space-y-2">
                {isEditorOrAdmin && (
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-2 text-white/80 hover:text-[#C9A84C] transition-colors py-1.5"
                    onClick={() => setIsOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#C9A84C]" />
                    Editorial Dashboard
                  </Link>
                )}

                {isEditorOrAdmin && (
                  <Link
                    href="/admin/reviewers"
                    className="flex items-center gap-2 text-white/80 hover:text-[#C9A84C] transition-colors py-1.5"
                    onClick={() => setIsOpen(false)}
                  >
                    <Shield className="w-4 h-4 text-white/50" />
                    Reviewer Portal
                  </Link>
                )}

                <Link
                  href={`/profile/${user.id}`}
                  className="flex items-center gap-2 text-white/80 hover:text-[#C9A84C] transition-colors py-1.5"
                  onClick={() => setIsOpen(false)}
                >
                  <UserIcon className="w-4 h-4 text-white/50" />
                  My Profile
                </Link>

                <Link
                  href="/submit"
                  className="flex items-center gap-2 text-white/80 hover:text-[#C9A84C] transition-colors py-1.5"
                  onClick={() => setIsOpen(false)}
                >
                  <FileText className="w-4 h-4 text-white/50" />
                  Submit Manuscript
                </Link>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 py-1.5 text-left border-t border-white/5 mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/login"
                  className="w-full text-center py-2 border border-white/10 rounded-lg text-xs font-semibold text-white/90 hover:bg-white/5 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  href="/submit"
                  className="w-full text-center py-2 bg-[#C9A84C] text-white rounded-lg text-xs font-bold hover:bg-[#8B1A1A] transition-colors shadow"
                  onClick={() => setIsOpen(false)}
                >
                  Submit Research
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
