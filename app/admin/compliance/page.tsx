'use client';

import { useState, useEffect, useRef } from 'react';
import { adminFetch } from '@/lib/admin-api';
import {
  CheckCircle2,
  XCircle,
  Search,
  Shield,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface ComplianceRow {
  journal_id: string;
  name: string;
  slug: string;
  has_issn: boolean;
  has_editorial_board: boolean;
  has_aims_scope: boolean;
  has_peer_review_policy: boolean;
  has_license: boolean;
  published_article_count: number;
  doaj_ready: boolean;
}

const checklistItems = [
  { key: 'has_issn', label: 'ISSN' },
  { key: 'has_editorial_board', label: 'Editorial Board' },
  { key: 'has_aims_scope', label: 'Aims & Scope' },
  { key: 'has_peer_review_policy', label: 'Peer Review Policy' },
  { key: 'has_license', label: 'License' },
] as const;

export default function CompliancePage() {
  const [data, setData] = useState<ComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await adminFetch('compliance');
      setData((data || []) as any);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to load compliance data');
    }
    setLoading(false);
  };

  const filtered = data.filter((j) => {
    if (!searchQuery) return true;
    return j.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const readyCount = data.filter((j) => j.doaj_ready).length;

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
          <h1 className="text-2xl font-serif font-bold text-white">DOAJ Compliance</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {readyCount} of {data.length} journals are DOAJ-ready
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search journals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm text-zinc-300 placeholder-zinc-600 outline-none w-full"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {checklistItems.map((item) => {
          const count = data.filter((j) => j[item.key]).length;
          return (
            <div key={item.key} className="bg-[#111118] border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{count}<span className="text-sm text-zinc-500">/{data.length}</span></p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-1">{item.label}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No journals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Journal</th>
                  {checklistItems.map((item) => (
                    <th key={item.key} className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden md:table-cell">{item.label}</th>
                  ))}
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Articles</th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">DOAJ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((j) => (
                  <tr key={j.journal_id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm text-white font-medium">{j.name}</p>
                    </td>
                    {checklistItems.map((item) => (
                      <td key={item.key} className="text-center px-3 py-4 hidden md:table-cell">
                        {j[item.key] ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-zinc-600 mx-auto" />
                        )}
                      </td>
                    ))}
                    <td className="text-center px-3 py-4">
                      <span className={`text-sm font-bold ${j.published_article_count >= 10 ? 'text-green-400' : 'text-zinc-400'}`}>
                        {j.published_article_count}
                      </span>
                    </td>
                    <td className="text-center px-3 py-4">
                      {j.doaj_ready ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-950/40 text-green-400 border border-green-900/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700/30">
                          <XCircle className="w-3 h-3" />
                          Not Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
