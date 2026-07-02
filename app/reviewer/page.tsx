'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';

interface Assignment {
  id: string;
  status: 'pending' | 'completed' | 'declined';
  recommendation: string | null;
  comments: string | null;
  created_at: string;
  articles: {
    id: string;
    title: string;
    abstract: string | null;
    journals: { name: string; slug: string } | null;
  } | null;
}

export default function ReviewerDashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'declined'>('all');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from('reviewer_assignments')
        .select(`
          id,
          status,
          recommendation,
          comments,
          created_at,
          articles (
            id,
            title,
            abstract,
            journals ( name, slug )
          )
        `)
        .eq('reviewer_id', (profile as any).id)
        .order('created_at', { ascending: false });

      setAssignments((data || []) as any);
    } catch (e) {
      console.error('Error fetching assignments:', e);
    }
    setLoading(false);
  };

  const filtered = filter === 'all'
    ? assignments
    : assignments.filter(a => a.status === filter);

  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const completedCount = assignments.filter(a => a.status === 'completed').length;

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Pending' },
    completed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Completed' },
    declined: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Declined' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Reviewer Dashboard</h1>
        <p className="text-sm text-zinc-400">Manage your peer review assignments.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-[#111118] border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Total Assigned</p>
          <p className="text-2xl font-bold text-white mt-1">{assignments.length}</p>
        </div>
        <div className="bg-[#111118] border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Pending</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-[#111118] border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Completed</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{completedCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'completed', 'declined'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors capitalize ${
              filter === f
                ? 'bg-[#C9A84C] text-[#13131A]'
                : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Assignments List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((assignment) => {
            const status = statusConfig[assignment.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <Link
                key={assignment.id}
                href={`/reviewer/${assignment.id}`}
                className="block bg-[#111118] border border-zinc-800 rounded-xl p-5 hover:border-[#C9A84C]/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                      {assignment.articles?.journals?.name && (
                        <span className="text-[10px] text-zinc-600 font-mono">
                          {assignment.articles.journals.name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-serif font-bold text-white group-hover:text-[#C9A84C] transition-colors line-clamp-1">
                      {assignment.articles?.title || 'Untitled Article'}
                    </h3>
                    {assignment.articles?.abstract && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{assignment.articles.abstract}</p>
                    )}
                    <p className="text-[10px] text-zinc-600 mt-2">
                      Assigned {new Date(assignment.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-zinc-600 group-hover:text-[#C9A84C] transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#111118] border border-zinc-800 rounded-xl">
          <BookOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 font-bold">
            {filter === 'all' ? 'No assignments yet' : `No ${filter} assignments`}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            {filter === 'all' ? 'You will see review assignments here once editors assign you.' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
