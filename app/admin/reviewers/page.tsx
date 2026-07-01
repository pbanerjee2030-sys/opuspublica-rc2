'use client';

import { useState, useEffect } from 'react';
import { adminFetch, adminCreate, adminUpdate } from '@/lib/admin-api';
import {
  Shield,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Loader2,
  User,
  FileText,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

interface Assignment {
  id: string;
  status: string;
  recommendation: string | null;
  comments: string | null;
  created_at: string;
  articles: {
    id: string;
    title: string;
    journals: { name: string } | null;
  } | null;
  profiles: {
    full_name: string;
  } | null;
}

interface Article {
  id: string;
  title: string;
  journals: { name: string } | null;
}

interface Reviewer {
  id: string;
  full_name: string;
}

export default function ReviewersPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ articleId: '', reviewerId: '' });
  const [saving, setSaving] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingAssignment, setReviewingAssignment] = useState<Assignment | null>(null);
  const [reviewForm, setReviewForm] = useState({ recommendation: 'accept', comments: '' });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const { assignments, assignmentsError, articles, reviewers } = await adminFetch('reviewers');
      if (assignmentsError) setTableMissing(true);
      setAssignments(assignments || []);
      setArticles(articles || []);
      setReviewers(reviewers || []);
    } catch (e: any) {
      if (e.message?.includes('reviewer_assignments') || e.message?.includes('does not exist')) {
        setTableMissing(true);
      }
    }
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAssign = async () => {
    if (!assignForm.articleId || !assignForm.reviewerId) {
      showToast('error', 'Select both an article and a reviewer');
      return;
    }
    setSaving(true);
    try {
      await adminCreate('reviewer_assignments', {
        article_id: assignForm.articleId,
        reviewer_id: assignForm.reviewerId,
        status: 'pending',
      });

      // Notify reviewer
      const article = articles.find(a => a.id === assignForm.articleId);
      const reviewer = reviewers.find(r => r.id === assignForm.reviewerId);
      const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
      fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          type: 'review_assigned',
          recipientName: reviewer?.full_name || 'Reviewer',
          articleTitle: article?.title || 'Article',
          journalName: article?.journals?.name || 'Journal',
        }),
      }).catch(() => {});

      showToast('success', 'Reviewer assigned');
      setShowAssignModal(false);
      setAssignForm({ articleId: '', reviewerId: '' });
      fetchAll();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to assign reviewer');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewingAssignment) return;
    setSaving(true);
    try {
      await adminUpdate('reviewer_assignments', reviewingAssignment.id, {
        status: 'completed',
        recommendation: reviewForm.recommendation,
        comments: reviewForm.comments.trim() || null,
      });
      showToast('success', 'Review submitted');
      setShowReviewModal(false);
      setReviewingAssignment(null);
      setReviewForm({ recommendation: 'accept', comments: '' });
      fetchAll();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to submit review');
    } finally {
      setSaving(false);
    }
  };

  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 shadow-xl ${
          toast.type === 'success' ? 'bg-green-900 text-green-200 border border-green-800' : 'bg-red-900 text-red-200 border border-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">Reviewer Management</h1>
          <p className="text-sm text-zinc-400 mt-1">Assign reviewers and track peer review progress.</p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#13131A] text-xs font-bold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Assign Reviewer
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tableMissing ? (
        <div className="bg-[#111118] border border-amber-900/30 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Database Table Missing</h3>
          <p className="text-sm text-zinc-400 mb-4 max-w-md mx-auto">
            The <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-amber-400 font-mono text-xs">reviewer_assignments</code> table doesn&apos;t exist yet.
            Run the migration SQL in your Supabase Dashboard to create it.
          </p>
          <a
            href="https://supabase.com/dashboard/project/pnrmsxowlquoifhhfeom/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#13131A] text-xs font-bold rounded-lg transition-colors"
          >
            Open SQL Editor
          </a>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pending Reviews */}
          <div className="bg-[#111118] border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">Pending Reviews</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-900/30">{pendingAssignments.length}</span>
            </div>
            <div className="divide-y divide-zinc-800/60 max-h-[500px] overflow-y-auto">
              {pendingAssignments.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">No pending reviews</div>
              ) : (
                pendingAssignments.map((a) => (
                  <div key={a.id} className="px-5 py-4 hover:bg-zinc-800/20 transition-colors">
                    <p className="text-sm text-white font-medium truncate">{a.articles?.title || 'Unknown Article'}</p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {a.articles?.journals?.name} &middot; Reviewer: {a.profiles?.full_name || 'Unknown'}
                    </p>
                    <button
                      onClick={() => { setReviewingAssignment(a); setShowReviewModal(true); }}
                      className="mt-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Submit Review
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed Reviews */}
          <div className="bg-[#111118] border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <h2 className="text-sm font-bold text-white">Completed Reviews</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-950/40 text-green-400 border border-green-900/30">{completedAssignments.length}</span>
            </div>
            <div className="divide-y divide-zinc-800/60 max-h-[500px] overflow-y-auto">
              {completedAssignments.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">No completed reviews</div>
              ) : (
                completedAssignments.map((a) => (
                  <div key={a.id} className="px-5 py-4 hover:bg-zinc-800/20 transition-colors">
                    <p className="text-sm text-white font-medium truncate">{a.articles?.title || 'Unknown Article'}</p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {a.articles?.journals?.name} &middot; Reviewer: {a.profiles?.full_name || 'Unknown'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        a.recommendation === 'accept' ? 'bg-green-950/40 text-green-400' :
                        a.recommendation === 'revise' ? 'bg-amber-950/40 text-amber-400' :
                        'bg-red-950/40 text-red-400'
                      }`}>
                        {a.recommendation || 'No recommendation'}
                      </span>
                    </div>
                    {a.comments && (
                      <p className="text-[11px] text-zinc-400 mt-1.5 line-clamp-2 italic">&ldquo;{a.comments}&rdquo;</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAssignModal(false)} />
          <div className="relative bg-[#111118] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-serif font-bold text-white">Assign Reviewer</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Article *</label>
                <select
                  value={assignForm.articleId}
                  onChange={(e) => setAssignForm({ ...assignForm, articleId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#C9A84C]"
                >
                  <option value="">Select an article...</option>
                  {articles.map(a => (
                    <option key={a.id} value={a.id}>{a.title} ({a.journals?.name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Reviewer *</label>
                <select
                  value={assignForm.reviewerId}
                  onChange={(e) => setAssignForm({ ...assignForm, reviewerId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#C9A84C]"
                >
                  <option value="">Select a reviewer...</option>
                  {reviewers.map(r => (
                    <option key={r.id} value={r.id}>{r.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleAssign}
                disabled={saving}
                className="px-4 py-2 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#13131A] text-xs font-bold rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Submit Modal */}
      {showReviewModal && reviewingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowReviewModal(false)} />
          <div className="relative bg-[#111118] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-serif font-bold text-white">Submit Review</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-zinc-900/60 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Reviewing:</p>
                <p className="text-sm text-white font-medium mt-0.5">{reviewingAssignment.articles?.title}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Recommendation *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['accept', 'revise', 'reject'].map((rec) => (
                    <button
                      key={rec}
                      onClick={() => setReviewForm({ ...reviewForm, recommendation: rec })}
                      className={`p-2.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
                        reviewForm.recommendation === rec
                          ? rec === 'accept' ? 'border-green-800 bg-green-950/40 text-green-400'
                            : rec === 'revise' ? 'border-amber-800 bg-amber-950/40 text-amber-400'
                            : 'border-red-800 bg-red-950/40 text-red-400'
                          : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      {rec}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Comments</label>
                <textarea
                  value={reviewForm.comments}
                  onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] resize-none"
                  placeholder="Provide detailed feedback..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
              <button onClick={() => setShowReviewModal(false)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleReviewSubmit}
                disabled={saving}
                className="px-4 py-2 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#13131A] text-xs font-bold rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
