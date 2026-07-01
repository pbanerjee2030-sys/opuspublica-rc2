'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/admin-api';
import Link from 'next/link';
import {
  FileText,
  BookOpen,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
  AlertCircle,
  Settings,
} from 'lucide-react';

interface Stats {
  totalArticles: number;
  pendingArticles: number;
  publishedArticles: number;
  rejectedArticles: number;
  totalJournals: number;
  totalUsers: number;
  recentArticles: any[];
  articlesByJournal: { name: string; count: number }[];
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { articles, journals, users } = await adminFetch('stats');

      const byJournal: Record<string, number> = {};
      articles.forEach((a: any) => {
        const jName = a.journals?.name || 'Unknown';
        byJournal[jName] = (byJournal[jName] || 0) + 1;
      });

      setStats({
        totalArticles: articles.length,
        pendingArticles: articles.filter((a: any) => a.status === 'pending_review').length,
        publishedArticles: articles.filter((a: any) => a.status === 'published').length,
        rejectedArticles: articles.filter((a: any) => a.status === 'rejected').length,
        totalJournals: journals.length,
        totalUsers: users.length,
        recentArticles: articles
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5),
        articlesByJournal: Object.entries(byJournal)
          .map(([name, count]) => ({ name, count: count as number }))
          .sort((a, b) => b.count - a.count),
      });
    } catch (e) {
      console.error('Error fetching stats:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Failed to load dashboard</h3>
        <p className="text-sm text-zinc-400 mb-4">Could not fetch statistics. You may not have permission.</p>
        <button onClick={fetchStats} className="px-4 py-2 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#13131A] text-xs font-bold rounded-lg transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Articles', value: stats.totalArticles, icon: FileText, color: '#C9A84C', href: '/admin/articles' },
    { label: 'Pending Review', value: stats.pendingArticles, icon: Clock, color: '#F59E0B', href: '/admin/articles?tab=pending' },
    { label: 'Published', value: stats.publishedArticles, icon: CheckCircle2, color: '#10B981', href: '/admin/articles?tab=published' },
    { label: 'Rejected', value: stats.rejectedArticles, icon: XCircle, color: '#EF4444', href: '/admin/articles?tab=rejected' },
    { label: 'Active Journals', value: stats.totalJournals, icon: BookOpen, color: '#8B5CF6', href: '/admin/journals' },
    { label: 'Registered Users', value: stats.totalUsers, icon: Users, color: '#06B6D4', href: '/admin/users' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-white">Dashboard Overview</h1>
        <p className="text-sm text-zinc-400 mt-1">Welcome back. Here&apos;s your platform at a glance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-[#111118] border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 group transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                <card.icon className="w-4.5 h-4.5" style={{ color: card.color }} />
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
            <div className="text-2xl font-bold text-white font-serif">{card.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1 font-bold">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Articles */}
        <div className="lg:col-span-2 bg-[#111118] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-bold text-white">Recent Submissions</h2>
            <Link href="/admin/articles" className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] hover:text-white transition-colors">
              View All
            </Link>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {stats.recentArticles.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">No articles yet</div>
            ) : (
              stats.recentArticles.map((article: any) => (
                <div key={article.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{article.title}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {article.journals?.name || 'Unknown Journal'} &middot; {article.article_authors?.[0]?.profiles?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                    article.status === 'published' ? 'bg-green-950/40 text-green-400 border border-green-900/30' :
                    article.status === 'rejected' ? 'bg-red-950/40 text-red-400 border border-red-900/30' :
                    'bg-amber-950/40 text-amber-400 border border-amber-900/30'
                  }`}>
                    {article.status === 'pending_review' ? 'Pending' : article.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Articles by Journal */}
        <div className="bg-[#111118] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-bold text-white">Articles by Journal</h2>
          </div>
          <div className="p-5 space-y-3">
            {stats.articlesByJournal.length === 0 ? (
              <p className="text-zinc-500 text-sm">No data yet</p>
            ) : (
              stats.articlesByJournal.map((j) => {
                const pct = stats.totalArticles > 0 ? (j.count / stats.totalArticles) * 100 : 0;
                return (
                  <div key={j.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-300 truncate max-w-[180px]">{j.name}</span>
                      <span className="text-xs font-bold text-zinc-400">{j.count}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#111118] border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Review Pending Articles', href: '/admin/articles?tab=pending', icon: AlertCircle, color: '#F59E0B' },
            { label: 'Manage Journals', href: '/admin/journals', icon: BookOpen, color: '#8B5CF6' },
            { label: 'Manage Users', href: '/admin/users', icon: Users, color: '#06B6D4' },
            { label: 'Platform Settings', href: '/admin/settings', icon: Settings, color: '#10B981' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-800/30 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${action.color}15` }}>
                <action.icon className="w-4 h-4" style={{ color: action.color }} />
              </div>
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
