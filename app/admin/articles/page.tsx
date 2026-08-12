'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { adminFetch, adminUpdate } from '@/lib/admin-api';
import { submitDecision } from '@/app/actions/submitDecision';
import { useSearchParams } from 'next/navigation';
import { CompositionWorkspace } from '@/components/opce/CompositionWorkspace';
import { AdminMetadataEditorModal } from '@/components/admin/AdminMetadataEditorModal';
import { canEditArticleMetadata } from '@/lib/permissions';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  Search,
  Mail,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  Layers,
  Edit3,
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  abstract: string;
  status: string;
  doi: string | null;
  pdf_url: string | null;
  canonical_package_url: string | null;
  published_pdf_url: string | null;
  published_at: string | null;
  created_at: string;
  rejection_reason: string | null;
  content_needs_review?: boolean;
  journals: { name: string; slug: string } | null;
  article_authors: { co_author_name: string | null; profiles: { id: string; full_name: string; email?: string } | null }[] | null;
  use_author_pdf_as_final?: boolean;
}

type Tab = 'pending' | 'accepted' | 'published' | 'rejected';

export default function ArticlesPage() {
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [opceArticle, setOpceArticle] = useState<Article | null>(null);
  const [adminEditArticle, setAdminEditArticle] = useState<Article | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('editor');

  useEffect(() => {
    fetchArticles();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (p?.role) setCurrentUserRole(p.role);
      }
    });
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { data } = await adminFetch('articles');
      const newArticles = (data || []) as any;
      setArticles(newArticles);
      if (selectedArticle) {
        const updated = newArticles.find((a: any) => a.id === selectedArticle.id);
        if (updated) setSelectedArticle(updated);
      }
    } catch (e) {
      console.error('Error fetching articles:', e);
    }
    setLoading(false);
  };

  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = async (article: Article) => {
    setApprovingId(article.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Accept article + generate house-styled PDF via the new proof route action
      const proofRes = await fetch('/api/admin/articles/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ articleId: article.id, action: 'proof' }),
      });

      const proofData = await proofRes.json();
      if (!proofRes.ok) throw new Error(proofData.error || 'Failed to accept and generate proof');

      const pdfNote = proofData.warning ? ' (PDF generation pending)' : ' with proof PDF generated';
      showToast('success', `Article accepted for proofing${pdfNote}`);
      fetchArticles();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to approve article');
    } finally {
      setApprovingId(null);
    }
  };

  const handlePublish = async (article: Article) => {
    setPublishingId(article.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // If no DOI, generate one
      let doi = article.doi;
      if (!doi) {
        const slug = article.journals?.slug || 'journal';
        const prefix = slug.replace(/-/g, '').substring(0, 15);
        const suffix = article.id.replace(/-/g, '').substring(0, 8);
        doi = `10.62692/${prefix}.v1i1.${suffix}`;

        await adminUpdate('articles', article.id, { doi });
      }

      // Try to mint DOI via Crossref
      const mintRes = await fetch('/api/doi/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ articleId: article.id }),
      });

      const mintData = await mintRes.json();

      // Publish article via the publish route action
      const publishRes = await fetch('/api/admin/articles/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ articleId: article.id, action: 'publish' }),
      });

      const publishData = await publishRes.json();
      if (!publishRes.ok) throw new Error(publishData.error || 'Failed to publish');

      // Send notification
      const author = article.article_authors?.[0]?.profiles;
      if (author) {
        fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type: 'article_published',
            articleId: article.id,
            recipientEmail: author.email || 'author@opuspublica.org',
            recipientName: author.full_name || 'Author',
            articleTitle: article.title,
            journalName: article.journals?.name || 'Journal',
          }),
        }).catch(() => {});
      }

      const pdfNote = publishData.warning ? ' (PDF generation pending)' : ' with house PDF';
      showToast('success', `Article published${mintData.status === 'submitted' ? ' and DOI minted' : ''}${pdfNote}`);
      fetchArticles();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to publish article');
    } finally {
      setPublishingId(null);
    }
  };

  const handleRegeneratePdf = async (article: Article) => {
    setRegeneratingId(article.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/admin/articles/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ articleId: article.id, action: 'regenerate' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate PDF');

      showToast('success', 'Published PDF regenerated successfully');
      fetchArticles();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to regenerate PDF');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    try {
      const res = await submitDecision({
        submissionId: rejectingId,
        decision: 'Reject',
        commentsToAuthor: rejectReason.trim(),
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to queue rejection decision');
      }

      // Optimistically update local state
      setArticles(prev => prev.map(a => a.id === rejectingId ? { ...a, status: 'rejected', rejection_reason: rejectReason.trim() } : a));
      if (selectedArticle?.id === rejectingId) {
        setSelectedArticle(prev => prev ? { ...prev, status: 'rejected', rejection_reason: rejectReason.trim() } : null);
      }

      showToast('success', 'Article rejection queued successfully');
      setShowRejectModal(false);
      setRejectReason('');
      setRejectingId(null);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to reject article');
    }
  };

  const statusMap: Record<Tab, string> = {
    pending: 'pending_review',
    accepted: 'accepted',
    published: 'published',
    rejected: 'rejected',
  };

  const filteredArticles = articles.filter(a => {
    if (a.status !== statusMap[activeTab]) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.journals?.name?.toLowerCase().includes(q) ||
        a.article_authors?.some(aa => (aa.profiles?.full_name || aa.co_author_name || '').toLowerCase().includes(q))
      );
    }
    return true;
  });

  const tabCounts = {
    pending: articles.filter(a => a.status === 'pending_review').length,
    accepted: articles.filter(a => a.status === 'accepted').length,
    published: articles.filter(a => a.status === 'published').length,
    rejected: articles.filter(a => a.status === 'rejected').length,
  };

  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: 'pending', label: 'Pending Review', icon: Clock, count: tabCounts.pending },
    { key: 'accepted', label: 'Proof Review', icon: Layers, count: tabCounts.accepted },
    { key: 'published', label: 'Published', icon: CheckCircle2, count: tabCounts.published },
    { key: 'rejected', label: 'Rejected', icon: XCircle, count: tabCounts.rejected },
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
          <h1 className="text-2xl font-serif font-bold text-white">Article Management</h1>
          <p className="text-sm text-zinc-400 mt-1">Review, approve, and manage all manuscript submissions.</p>
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

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111118] border border-zinc-800 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab.key
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === tab.key ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Articles Table */}
      <div className="bg-[#111118] border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No {activeTab} articles found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Article</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden md:table-cell">Journal</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden lg:table-cell">Author</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden lg:table-cell">Date</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <p className="text-sm text-white font-medium truncate max-w-[300px]" title={article.title}>{article.title}</p>
                        {article.content_needs_review && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 text-[10px] font-semibold border border-amber-900/30">
                            Draft content — pending editorial review
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 md:hidden">{article.journals?.name}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-xs text-zinc-400">{article.journals?.name}</span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell whitespace-nowrap max-w-[300px] truncate" title={article.article_authors?.map((a: any) => a.profiles?.full_name || a.co_author_name).filter(Boolean).join(', ') || 'Unknown'}>
                      <span className="text-xs text-zinc-400">{article.article_authors?.map((a: any) => a.profiles?.full_name || a.co_author_name).filter(Boolean).join(', ') || 'Unknown'}</span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell whitespace-nowrap">
                      <span className="text-xs text-zinc-500">
                        {new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        article.status === 'published' ? 'bg-green-950/40 text-green-400 border border-green-900/30' :
                        article.status === 'rejected' ? 'bg-red-950/40 text-red-400 border border-red-900/30' :
                        'bg-amber-950/40 text-amber-400 border border-amber-900/30'
                      }`}>
                        {article.status === 'pending_review' ? 'Pending' : article.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setSelectedArticle(article); setShowDetailModal(true); }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setOpceArticle(article)}
                          className="p-1.5 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                          title="OPCE Composition Workspace"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                        {canEditArticleMetadata(currentUserRole) && (
                          <button
                            onClick={() => setAdminEditArticle(article)}
                            className="p-1.5 rounded-lg text-[#C9A84C] hover:text-[#b0913b] hover:bg-zinc-800 transition-colors"
                            title="Administrator Metadata & Timeline Editor"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {(article.status === 'published' ? (article.canonical_package_url ? `${article.canonical_package_url}/publisher.pdf` : null) : article.pdf_url) && (
                          <a
                            href={`/api/pdf?id=${article.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                            title="View PDF"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {article.status === 'pending_review' && (
                          <>
                            <button
                              onClick={() => handleApprove(article)}
                              disabled={approvingId === article.id}
                              className="px-3 py-1.5 bg-green-900/40 hover:bg-green-900/60 text-green-400 text-xs font-bold rounded-lg border border-green-900/30 transition-colors disabled:opacity-50"
                            >
                              {approvingId === article.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                'Approve'
                              )}
                            </button>
                            <button
                              onClick={() => { setRejectingId(article.id); setShowRejectModal(true); }}
                              className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-400 text-xs font-bold rounded-lg border border-red-900/30 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {article.status === 'accepted' && (
                          <button
                            onClick={() => handlePublish(article)}
                            disabled={publishingId === article.id}
                            className="px-3 py-1.5 bg-green-900/40 hover:bg-green-900/60 text-green-400 text-xs font-bold rounded-lg border border-green-900/30 transition-colors disabled:opacity-50"
                          >
                            {publishingId === article.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              'Publish & Mint DOI'
                            )}
                          </button>
                        )}
                        {article.status === 'published' && (
                          <button
                            onClick={() => handleRegeneratePdf(article)}
                            disabled={regeneratingId === article.id}
                            className="px-3 py-1.5 bg-[#C9A84C]/10 hover:bg-[#C9A84C]/20 text-[#C9A84C] text-xs font-bold rounded-lg border border-[#C9A84C]/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            title="Regenerate Published PDF"
                          >
                            {regeneratingId === article.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden xl:inline">Regen PDF</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-[#111118] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-serif font-bold text-white">Article Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Title</label>
                <p className="text-sm text-white mt-1">{selectedArticle.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Journal</label>
                  <p className="text-sm text-zinc-300 mt-1">{selectedArticle.journals?.name}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</label>
                  <p className="text-sm mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedArticle.status === 'published' ? 'bg-green-950/40 text-green-400' :
                      selectedArticle.status === 'rejected' ? 'bg-red-950/40 text-red-400' :
                      'bg-amber-950/40 text-amber-400'
                    }`}>
                      {selectedArticle.status === 'pending_review' ? 'Pending Review' : selectedArticle.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">DOI</label>
                  <p className="text-sm text-zinc-300 mt-1">{selectedArticle.doi || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Author</label>
                  <p className="text-sm text-zinc-300 mt-1">{selectedArticle.article_authors?.map((a: any) => a.profiles?.full_name || a.co_author_name).filter(Boolean).join(', ') || 'Unknown'}</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Abstract</label>
                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{selectedArticle.abstract || 'No abstract available.'}</p>
              </div>
              <div className="flex items-center gap-2 py-3 border-t border-b border-zinc-800/60 my-2">
                <input
                  type="checkbox"
                  id="use_author_pdf_as_final_toggle"
                  checked={selectedArticle.use_author_pdf_as_final || false}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    try {
                      await adminUpdate('articles', selectedArticle.id, { use_author_pdf_as_final: checked });
                      // Update local state
                      setArticles(prev => prev.map(a => a.id === selectedArticle.id ? { ...a, use_author_pdf_as_final: checked } : a));
                      setSelectedArticle(prev => prev ? { ...prev, use_author_pdf_as_final: checked } : null);
                      showToast('success', `Toggle updated: ${checked ? 'using author PDF as final' : 'using generated house PDF'}`);
                    } catch (err: any) {
                      showToast('error', err.message || 'Failed to update toggle');
                    }
                  }}
                  className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-[#C9A84C] focus:ring-[#C9A84C]"
                />
                <label htmlFor="use_author_pdf_as_final_toggle" className="text-xs font-semibold text-zinc-300 cursor-pointer">
                  Use author's original PDF upload as the final published version (skips layout generation)
                </label>
              </div>
              {selectedArticle.rejection_reason && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-red-500">Rejection Reason</label>
                  <p className="text-sm text-red-400 mt-1">{selectedArticle.rejection_reason}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors">Close</button>
              {selectedArticle.status === 'pending_review' && (
                <>
                  <button
                    onClick={() => { setShowDetailModal(false); handleApprove(selectedArticle); }}
                    className="px-4 py-2 bg-green-900/40 hover:bg-green-900/60 text-green-400 text-xs font-bold rounded-lg border border-green-900/30"
                  >
                    Accept & Generate Proof
                  </button>
                  <button
                    onClick={() => { setShowDetailModal(false); setRejectingId(selectedArticle.id); setShowRejectModal(true); }}
                    className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-400 text-xs font-bold rounded-lg border border-red-900/30"
                  >
                    Reject
                  </button>
                </>
              )}
              {selectedArticle.status === 'accepted' && (
                <button
                  onClick={() => { setShowDetailModal(false); handlePublish(selectedArticle); }}
                  className="px-4 py-2 bg-green-900/40 hover:bg-green-900/60 text-green-400 text-xs font-bold rounded-lg border border-green-900/30"
                >
                  Publish & Mint DOI
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => { setShowRejectModal(false); setRejectReason(''); setRejectingId(null); }} />
          <div className="relative bg-[#111118] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-serif font-bold text-white">Reject Article</h3>
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); setRejectingId(null); }} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-red-800 resize-none"
                placeholder="Provide a reason for rejection..."
              />
            </div>
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); setRejectingId(null); }} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-400 text-xs font-bold rounded-lg border border-red-900/30 disabled:opacity-40"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPCE Workspace Modal */}
      {opceArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative bg-[#FCFAF4] border border-[#E0D7C2] rounded-2xl w-full max-w-6xl shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between border-b border-[#E0D7C2] pb-4 mb-4">
              <h3 className="text-lg font-bold text-[#0F2C4A]">OPCE Composition Engine Workspace</h3>
              <button onClick={() => setOpceArticle(null)} className="p-1 rounded text-[#5A5245] hover:bg-[#F4EFE2]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CompositionWorkspace
              articleId={opceArticle.id}
              articleTitle={opceArticle.title}
              journalSlug={opceArticle.journals?.slug || 'journal'}
            />
          </div>
        </div>
      )}

      {/* Administrator Metadata Editor Modal */}
      {adminEditArticle && (
        <AdminMetadataEditorModal
          article={adminEditArticle as any}
          userRole={currentUserRole}
          onClose={() => setAdminEditArticle(null)}
          onSuccess={fetchArticles}
        />
      )}
    </div>
  );
}
