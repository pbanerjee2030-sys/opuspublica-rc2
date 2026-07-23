'use client';

import { useState, useEffect } from 'react';
import { adminFetch, adminUpdate } from '@/lib/admin-api';
import { MessageSquare, Search, CheckCircle2, AlertCircle, Loader2, Eye, ChevronDown, ChevronUp, Mail, User, Clock } from 'lucide-react';

interface ContactQuery {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  created_at: string;
}

export default function AdminContactQueriesPage() {
  const [queries, setQueries] = useState<ContactQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'read' | 'replied'>('all');

  useEffect(() => {
    loadQueries();
  }, []);

  async function loadQueries() {
    setLoading(true);
    try {
      const res = await adminFetch('contact_queries');
      if (res && res.data) {
        setQueries(res.data);
      }
    } catch (e) {
      console.error('Failed to load contact queries:', e);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await adminUpdate('contact_queries', id, { status: 'read' });
      setQueries((prev) => prev.map((q) => (q.id === id ? { ...q, status: 'read' } : q)));
      showToast('success', 'Marked as read.');
    } catch {
      showToast('error', 'Failed to update status.');
    }
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = queries.filter((q) => {
    const matchesSearch =
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.email.toLowerCase().includes(search.toLowerCase()) ||
      q.subject.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const newCount = queries.filter((q) => q.status === 'new').length;

  return (
    <div className="min-h-screen bg-[#0D0D11] text-zinc-100">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-serif font-bold text-white">Contact Queries</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Messages from the contact form.
              {newCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-[#C9A84C]/20 text-[#C9A84C] text-[10px] font-bold rounded-full">
                  {newCount} new
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, email, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-[#C9A84C] transition-colors"
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'new', 'read', 'replied'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                  statusFilter === filter
                    ? 'bg-[#C9A84C] text-[#13131A]'
                    : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm ${
            toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700/50' : 'bg-red-900/90 text-red-200 border border-red-700/50'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-[#111118] border border-zinc-800 rounded-xl">
            <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-zinc-300">No queries found</h2>
            <p className="text-xs text-zinc-500 mt-2">
              {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'No contact form submissions yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((query) => (
              <div
                key={query.id}
                className={`bg-[#111118] border rounded-xl overflow-hidden transition-all ${
                  query.status === 'new' ? 'border-[#C9A84C]/30' : 'border-zinc-800'
                }`}
              >
                <button
                  onClick={() => {
                    setExpandedId(expandedId === query.id ? null : query.id);
                    if (query.status === 'new') markAsRead(query.id);
                  }}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      query.status === 'new' ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {query.status === 'new' ? <Mail className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-white truncate">{query.subject}</span>
                        {query.status === 'new' && (
                          <span className="px-1.5 py-0.5 bg-[#C9A84C]/20 text-[#C9A84C] text-[8px] font-bold uppercase rounded">New</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{query.name}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(query.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {query.status === 'new' && <span className="w-2 h-2 rounded-full bg-[#C9A84C]" />}
                    {expandedId === query.id ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </div>
                </button>

                {expandedId === query.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-zinc-800/60">
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <User className="w-3.5 h-3.5 text-[#C9A84C]" />
                        <span>{query.name}</span>
                      </div>
                      <a href={`mailto:${query.email}`} className="flex items-center gap-2 text-[#C9A84C] hover:underline">
                        <Mail className="w-3.5 h-3.5" />
                        {query.email}
                      </a>
                      <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800/60">
                        <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{query.message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
