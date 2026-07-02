'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
  Bell,
  Search,
  Menu,
  X,
  Lock,
  History,
  ExternalLink,
  ClipboardCheck,
  BarChart3,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/articles', label: 'Articles', icon: FileText },
  { href: '/admin/journals', label: 'Journals', icon: BookOpen },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/reviewers', label: 'Reviews', icon: Shield },
  { href: '/admin/reviewer-workload', label: 'Reviewer Workload', icon: BarChart3 },
  { href: '/admin/compliance', label: 'Compliance', icon: ClipboardCheck },
  { href: '/admin/doi-monitor', label: 'DOI Monitor', icon: ExternalLink },
  { href: '/admin/audit-log', label: 'Audit Log', icon: History },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (!p || (p.role !== 'admin' && p.role !== 'editor')) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      setProfile(p);
      setLoading(false);
    };
    init();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getInitials = () => {
    if (!profile?.full_name) return 'A';
    return profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D11] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0D0D11] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-900/30 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-serif font-bold text-white mb-2">Access Denied</h1>
          <p className="text-sm text-zinc-400 mb-6">
            You do not have permission to access the admin dashboard. Only editors and administrators can view this area.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D11] text-zinc-100 flex font-sans">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-[#111118] border-r border-zinc-800/80 transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/80">
          {!collapsed && (
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <span className="text-[#C9A84C] font-bold text-lg font-serif">OPUS</span>
              <span className="text-white font-bold text-lg font-serif">ADMIN</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  active
                    ? 'bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#C9A84C]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-zinc-800/80 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
          >
            <Home className="w-5 h-5 text-zinc-500" />
            {!collapsed && <span>View Site</span>}
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[#111118] border-r border-zinc-800 flex flex-col">
            <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
              <Link href="/admin/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <span className="text-[#C9A84C] font-bold text-lg font-serif">OPUS</span>
                <span className="text-white font-bold text-lg font-serif">ADMIN</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${active ? 'text-[#C9A84C]' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-zinc-800 space-y-2">
              <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60">
                <Home className="w-5 h-5 text-zinc-500" />
                <span>View Site</span>
              </Link>
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30">
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-[68px]' : 'lg:ml-64'}`}>
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-zinc-800/80 bg-[#0D0D11]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-zinc-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-1.5 w-64">
              <Search className="w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-sm text-zinc-300 placeholder-zinc-600 outline-none w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#8B1A1A] rounded-full" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center text-xs font-bold font-serif">
                {getInitials()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-white leading-tight">{profile?.full_name}</p>
                <p className="text-[10px] text-zinc-500 capitalize">{profile?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
