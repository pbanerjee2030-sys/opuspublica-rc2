'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { adminFetch } from '@/lib/admin-api';
import {
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  doi: string | null;
  status: string;
  doi_deposit_status: string | null;
  doi_deposited_at: string | null;
  doi_deposit_error: string | null;
  journals: { name: string; slug: string } | null;
  article_authors: { profiles: { full_name: string } | null }[] | null;
}

type Filter = 'all' | 'not_submitted' | 'submitted' | 'failed';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  not_submitted: { label: 'Not Submitted', color: 'text-zinc-400 bg-zinc-800/40 border-zinc-700/30', icon: Clock },
  submitted: { label: 'Submitted', color: 'text-green-400 bg-green-950/40 border-green-900/30', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-400 bg-red-950/40 border-red-900/30', icon: XCircle },
};

export default function DoiMonitorPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { data } = await adminFetch('articles');
      setArticles((data || []) as any);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to load articles');
    }
    setLoading(false);
  };

  const handleRetryDeposit = async (article: Article) => {
    if (!article.doi) {
      showToast('error', 'Article has no DOI assigned');
      return;
    }

    setRetryingId(article.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/doi/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ articleId: article.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Deposit failed');
      }

      showToast('success', `DOI deposit ${data.status} for "${article.title.substring(0, 40)}..."`);
      fetchArticles();
    } catch (e: any) {
      showToast('error', e.message || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const filteredArticles = articles.filter((a) => {
    const status = a.doi_deposit_status || 'not_submitted';
    if (filter !== 'all' && status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.doi?.toLowerCase().includes(q) ||
        a.journals?.name?.toLowerCase().includes(q) ||
        a.article_authors?.some(aa => aa.profiles?.full_name?.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filterCounts = {
    all: articles.length,
    not_submitted: articles.filter(a => !a.doi_deposit_status || a.doi_deposit_status === 'not_submitted').length,
    submitted: articles.filter(a => a.doi_deposit_status === 'submitted').length,
    failed: articles.filter(a => a.doi_deposit_status === 'failed').length,
  };

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: filterCounts.all },
    { key: 'not_submitted', label: 'Not Submitted', count: filterCounts.not_submitted },
    { key: 'submitted', label: 'Submitted', count: filterCounts.submitted },
    { key: 'failed', label: 'Failed', count: filterCounts.failed },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 shadow-xl ${
          toast.type === 'success' ? 'bg-green-900 text-green-200 border border-green-800' : 'bg-red-900 text-red-200 border border-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">DOI Monitor</h1>
          <p className="text-sm text-zinc-400 mt-1">Track and manage Crossref DOI deposits for published articles.</p>
        </div>
        <button
          onClick={fetchArticles}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 rounded-lg border border-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex gap-1 bg-[#111118] border border-zinc-800 rounded-xl p-1 flex-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                filter === f.key
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="hidden sm:inline">{f.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filter === f.key ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm text-zinc-300 placeholder-zinc-600 outline-none w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-16 text-center">
            <ExternalLink className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No articles found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Article</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden md:table-cell">DOI</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden lg:table-cell">Details</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredArticles.map((article) => {
                  const status = article.doi_deposit_status || 'not_submitted';
                  const config = statusConfig[status] || statusConfig.not_submitted;
                  const StatusIcon = config.icon;

                  return (
                    <tr key={article.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-sm text-white font-medium truncate max-w-[300px]">{article.title}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{article.journals?.name}</p>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        {article.doi ? (
                          <span className="text-xs text-[#C9A84C] font-mono">{article.doi}</span>
                        ) : (
                          <span className="text-xs text-zinc-600">Not assigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        {status === 'submitted' && article.doi_deposited_at && (
                          <span className="text-xs text-zinc-400">
                            {new Date(article.doi_deposited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                        {status === 'failed' && article.doi_deposit_error && (
                          <span className="text-xs text-red-400 truncate max-w-[200px] block" title={article.doi_deposit_error}>
                            {article.doi_deposit_error.substring(0, 60)}...
                          </span>
                        )}
                        {status === 'not_submitted' && (
                          <span className="text-xs text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {article.doi && (
                          <button
                            onClick={() => handleRetryDeposit(article)}
                            disabled={retryingId === article.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 rounded-lg border border-zinc-700 transition-colors disabled:opacity-50"
                          >
                            {retryingId === article.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
