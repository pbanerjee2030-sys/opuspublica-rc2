'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { submitReview, declineReview } from '@/app/actions/submitReview';
import {
  ArrowLeft,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertCircle,
} from 'lucide-react';

interface Assignment {
  id: string;
  status: 'pending' | 'completed' | 'declined';
  recommendation: string | null;
  comments: string | null;
  scores: {
    originality: number | null;
    rigor: number | null;
    clarity: number | null;
    significance: number | null;
  } | null;
  created_at: string;
  articles: {
    id: string;
    title: string;
    abstract: string | null;
    pdf_url: string | null;
    journals: { name: string; slug: string } | null;
    article_authors: {
      profiles: { full_name: string } | null;
      co_author_name: string | null;
    }[];
  } | null;
}

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.assignmentId as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [recommendation, setRecommendation] = useState<string>('');
  const [comments, setComments] = useState('');
  const [scores, setScores] = useState<{
    originality: number | null;
    rigor: number | null;
    clarity: number | null;
    significance: number | null;
  }>({ originality: null, rigor: null, clarity: null, significance: null });

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

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
          scores,
          created_at,
          articles (
            id,
            title,
            abstract,
            pdf_url,
            journals ( name, slug ),
            article_authors (
              profiles ( full_name ),
              co_author_name
            )
          )
        `)
        .eq('id', assignmentId)
        .eq('reviewer_id', (profile as any).id)
        .single();

      if (!data) {
        router.push('/reviewer');
        return;
      }

      setAssignment(data as any);
      setRecommendation((data as any).recommendation || '');
      setComments((data as any).comments || '');
    } catch (e) {
      console.error('Error fetching assignment:', e);
    }
    setLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!recommendation) {
      setToast({ type: 'error', message: 'Please select a recommendation.' });
      return;
    }

    setSaving(true);
    try {
      const token = await getAccessToken();
      const result = await submitReview({
        assignmentId,
        recommendation,
        comments,
        scores,
      }, token);

      if (!result.success) {
        throw new Error(result.error);
      }

      setToast({ type: 'success', message: 'Review submitted successfully!' });
      setTimeout(() => router.push('/reviewer'), 1500);
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || 'Failed to submit review' });
    }
    setSaving(false);
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this review assignment?')) return;

    setSaving(true);
    try {
      const token = await getAccessToken();
      const result = await declineReview({ assignmentId }, token);

      if (!result.success) {
        throw new Error(result.error);
      }

      setToast({ type: 'success', message: 'Review declined.' });
      setTimeout(() => router.push('/reviewer'), 1500);
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || 'Failed to decline' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-24">
        <p className="text-zinc-500">Assignment not found.</p>
      </div>
    );
  }

  const article = assignment.articles;
  const authors = article?.article_authors?.map((aa: any) => aa.profiles?.full_name || aa.co_author_name).filter(Boolean) || [];
  const isCompleted = assignment.status === 'completed';
  const isDeclined = assignment.status === 'declined';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-950/40 border border-green-900/40 text-green-400' : 'bg-red-950/40 border border-red-900/40 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Back */}
      <Link href="/reviewer" className="inline-flex items-center gap-2 text-sm text-[#C9A84C] hover:text-[#D4AF37] transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Status Banner */}
      {isCompleted && (
        <div className="bg-green-950/30 border border-green-900/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-sm font-bold text-green-400">Review Completed</p>
            <p className="text-xs text-green-400/70">Your recommendation has been submitted.</p>
          </div>
        </div>
      )}

      {isDeclined && (
        <div className="bg-red-950/30 border border-red-900/30 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-sm font-bold text-red-400">Review Declined</p>
            <p className="text-xs text-red-400/70">You have declined this review assignment.</p>
          </div>
        </div>
      )}

      {/* Article Info */}
      <div className="bg-[#111118] border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-0.5 rounded-full">
            Peer Review
          </span>
          {article?.journals?.name && (
            <span className="text-[10px] text-zinc-600 font-mono">{article.journals.name}</span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-serif font-bold text-white mb-3">
          {article?.title || 'Untitled Article'}
        </h1>
        {authors.length > 0 && (
          <p className="text-sm text-zinc-400 mb-4">
            <span className="font-semibold text-zinc-300">Authors:</span> {authors.join(', ')}
          </p>
        )}
        {article?.abstract && (
          <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Abstract</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">{article.abstract}</p>
          </div>
        )}
        {article?.pdf_url && (
          <a
            href={`/api/pdf?id=${article.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Manuscript PDF
          </a>
        )}
      </div>

      {/* Review Form */}
      {!isCompleted && !isDeclined && (
        <div className="bg-[#111118] border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-serif font-bold text-white border-b border-zinc-800 pb-3">
            Submit Your Review
          </h2>

          {/* Recommendation */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-3">
              Recommendation *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'accept', label: 'Accept', icon: CheckCircle2, color: 'border-green-500/50 hover:bg-green-500/10 text-green-400' },
                { value: 'revise', label: 'Revise', icon: Clock, color: 'border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-400' },
                { value: 'reject', label: 'Reject', icon: XCircle, color: 'border-red-500/50 hover:bg-red-500/10 text-red-400' },
              ].map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRecommendation(value)}
                  className={`flex items-center justify-center gap-2 p-3 border rounded-lg text-sm font-bold transition-all ${
                    recommendation === value
                      ? `${color} border-current bg-current/10`
                      : 'border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-3">
              Ratings <span className="text-zinc-600 normal-case">(optional, 1-5)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { key: 'originality', label: 'Originality' },
                { key: 'rigor', label: 'Rigor' },
                { key: 'clarity', label: 'Clarity' },
                { key: 'significance', label: 'Significance' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs text-zinc-400 mb-1.5">{label}</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setScores((prev) => ({ ...prev, [key]: prev[key as keyof typeof prev] === n ? null : n }))}
                        className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                          scores[key as keyof typeof scores] === n
                            ? 'bg-[#C9A84C] text-[#13131A]'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-[#C9A84C]/50 hover:text-[#C9A84C]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2">
              Review Comments
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={8}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] resize-none"
              placeholder="Provide detailed feedback on methodology, originality, significance, clarity, and suggestions for improvement..."
            />
            <p className="text-[10px] text-zinc-600 mt-1">These comments will be shared with the authors (anonymously if single-blind).</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              onClick={handleDecline}
              disabled={saving}
              className="px-4 py-2 text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
            >
              Decline Assignment
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={saving || !recommendation}
              className="px-6 py-2.5 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#13131A] text-sm font-bold rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Review
            </button>
          </div>
        </div>
      )}

      {/* Completed Review Display */}
      {isCompleted && (
        <div className="bg-[#111118] border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-serif font-bold text-white border-b border-zinc-800 pb-3">
            Your Review
          </h2>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Recommendation</p>
            <p className={`text-sm font-bold capitalize ${
              assignment.recommendation === 'accept' ? 'text-green-400' :
              assignment.recommendation === 'revise' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {assignment.recommendation}
            </p>
          </div>
          {assignment.comments && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Comments</p>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{assignment.comments}</p>
            </div>
          )}
          {assignment.scores && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Ratings</p>
              <div className="flex flex-wrap gap-4">
                {(['originality', 'rigor', 'clarity', 'significance'] as const).map((key) => (
                  assignment.scores?.[key] != null && (
                    <div key={key} className="text-center">
                      <p className="text-[10px] text-zinc-500 capitalize">{key}</p>
                      <p className="text-sm font-bold text-[#C9A84C]">{assignment.scores[key]}/5</p>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
