'use client';

import { useState, useEffect, useRef } from 'react';
import { adminFetch } from '@/lib/admin-api';
import {
  History,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
  User,
  BookOpen,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  profiles: { full_name: string } | null;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  role_change: { label: 'Role Change', color: 'text-purple-400 bg-purple-950/40 border-purple-900/30' },
  article_published: { label: 'Article Published', color: 'text-green-400 bg-green-950/40 border-green-900/30' },
  article_rejected: { label: 'Article Rejected', color: 'text-red-400 bg-red-950/40 border-red-900/30' },
  article_deleted: { label: 'Article Deleted', color: 'text-red-400 bg-red-950/40 border-red-900/30' },
  article_updated: { label: 'Article Updated', color: 'text-zinc-400 bg-zinc-800/40 border-zinc-700/30' },
  journal_deleted: { label: 'Journal Deleted', color: 'text-red-400 bg-red-950/40 border-red-900/30' },
  user_deleted: { label: 'User Deleted', color: 'text-red-400 bg-red-950/40 border-red-900/30' },
  admin_login: { label: 'Admin Login', color: 'text-blue-400 bg-blue-950/40 border-blue-900/30' },
  reviewer_assigned: { label: 'Reviewer Assigned', color: 'text-amber-400 bg-amber-950/40 border-amber-900/30' },
  review_submitted: { label: 'Review Submitted', color: 'text-[#C9A84C] bg-[#C9A84C]/10 border-[#C9A84C]/20' },
  review_declined: { label: 'Review Declined', color: 'text-orange-400 bg-orange-950/40 border-orange-900/30' },
};

const targetIcons: Record<string, any> = {
  article: FileText,
  user: User,
  journal: BookOpen,
  reviewer_assignment: Shield,
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data } = await adminFetch('audit_log&limit=200');
      setEntries((data || []) as any);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to load audit log');
    }
    setLoading(false);
  };

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.action.toLowerCase().includes(q) ||
      e.target_type.toLowerCase().includes(q) ||
      e.profiles?.full_name?.toLowerCase().includes(q) ||
      e.target_id?.toLowerCase().includes(q)
    );
  });

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
          <h1 className="text-2xl font-serif font-bold text-white">Audit Log</h1>
          <p className="text-sm text-zinc-400 mt-1">Track all administrative actions and system events.</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search audit log..."
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
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center">
            <History className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No audit entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Timestamp</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Actor</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Action</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden md:table-cell">Target</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredEntries.map((entry) => {
                  const actionInfo = actionLabels[entry.action] || { label: entry.action, color: 'text-zinc-400 bg-zinc-800/40 border-zinc-700/30' };
                  const TargetIcon = targetIcons[entry.target_type] || FileText;
                  const isExpanded = expandedId === entry.id;

                  return (
                    <tr key={entry.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-xs text-zinc-400">
                          {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-[11px] text-zinc-600">
                          {new Date(entry.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-zinc-300">{entry.profiles?.full_name || 'System'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <TargetIcon className="w-3.5 h-3.5 text-zinc-500" />
                          <div>
                            <p className="text-xs text-zinc-400 capitalize">{entry.target_type}</p>
                            {entry.target_id && (
                              <p className="text-[10px] text-zinc-600 font-mono truncate max-w-[200px]">{entry.target_id}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {entry.metadata && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
