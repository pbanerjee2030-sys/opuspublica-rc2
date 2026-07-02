'use client';

import { useState, useEffect, useRef } from 'react';
import { adminFetch } from '@/lib/admin-api';
import {
  Users,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';

interface ReviewerWorkload {
  reviewer_id: string;
  reviewer_name: string;
  total: number;
  pending: number;
  completed: number;
  declined: number;
  avg_turnaround_days: number | null;
}

type SortKey = 'pending' | 'total' | 'completed' | 'avg_turnaround_days';

export default function ReviewerWorkloadPage() {
  const [data, setData] = useState<ReviewerWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('pending');
  const [sortAsc, setSortAsc] = useState(false);
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
      const { data } = await adminFetch('reviewer_workload');
      setData((data || []) as any);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to load reviewer workload');
    }
    setLoading(false);
  };

  const filtered = data
    .filter((r) => {
      if (!searchQuery) return true;
      return r.reviewer_name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      const aVal = a[sortKey] ?? (sortKey === 'avg_turnaround_days' ? Infinity : 0);
      const bVal = b[sortKey] ?? (sortKey === 'avg_turnaround_days' ? Infinity : 0);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortHeader = ({ label, sortField }: { label: string; sortField: SortKey }) => (
    <th
      className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors select-none"
      onClick={() => handleSort(sortField)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === sortField ? 'text-[#C9A84C]' : 'text-zinc-700'}`} />
      </span>
    </th>
  );

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
          <h1 className="text-2xl font-serif font-bold text-white">Reviewer Workload</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {data.length} reviewers &middot; {data.reduce((s, r) => s + r.pending, 0)} pending assignments
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search reviewers..."
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
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No reviewers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Reviewer</th>
                  <SortHeader label="Pending" sortField="pending" />
                  <SortHeader label="Completed" sortField="completed" />
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Declined</th>
                  <SortHeader label="Total" sortField="total" />
                  <SortHeader label="Avg Turnaround" sortField="avg_turnaround_days" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((r) => (
                  <tr key={r.reviewer_id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm text-white font-medium">{r.reviewer_name}</p>
                    </td>
                    <td className="px-5 py-4">
                      {r.pending > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-900/30">
                          <Clock className="w-3 h-3" />
                          {r.pending}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">0</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-green-400">{r.completed}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-zinc-400">{r.declined}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-zinc-300 font-medium">{r.total}</span>
                    </td>
                    <td className="px-5 py-4">
                      {r.avg_turnaround_days != null ? (
                        <span className="text-sm text-zinc-300">{r.avg_turnaround_days}d</span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
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
