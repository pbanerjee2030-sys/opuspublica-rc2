'use client';

/**
 * Opus Publica — Administrator Metadata Editor & Historical Publication Control
 *
 * Administrator-only modal providing full control over scholarly publication metadata,
 * author details, bibliographic fields, and retrospective publication chronology.
 */

import React, { useState } from 'react';
import { X, Calendar, User, BookOpen, Shield, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { adminUpdate } from '@/lib/admin-api';
import { canEditArticleMetadata } from '@/lib/permissions';

export interface AuthorMetadata {
  id?: string;
  co_author_name: string;
  co_author_orcid: string;
  co_author_ror_id: string;
}

export interface ArticleAdminData {
  id: string;
  title: string;
  abstract: string | null;
  status: string;
  doi: string | null;


  published_at?: string | null;

  keywords?: string | null;
  funder_name?: string | null;
  funder_award_number?: string | null;
  funder_id?: string | null;
  created_at: string;
  journals?: { name: string; slug: string } | null;
  article_authors?: AuthorMetadata[] | null;
}

export interface AdminMetadataEditorModalProps {
  article: ArticleAdminData;
  userRole: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminMetadataEditorModal: React.FC<AdminMetadataEditorModalProps> = ({
  article,
  userRole,
  onClose,
  onSuccess,
}) => {
  const isAdmin = canEditArticleMetadata(userRole);

  const [activeTab, setActiveTab] = useState<'timeline' | 'bibliographic' | 'authors'>('timeline');

  // Timeline / Historical Control State
  const [isHistorical, setIsHistorical] = useState<boolean>(
    article.published_at && article.created_at 
      ? new Date(article.published_at) < new Date(article.created_at)
      : false
  );
  const [submittedAt, setSubmittedAt] = useState<string>(
    article.created_at ? new Date(article.created_at).toISOString().slice(0, 16) : ''
  );

  const [publishedAt, setPublishedAt] = useState<string>(
    article.published_at ? new Date(article.published_at).toISOString().slice(0, 16) : ''
  );

  // Bibliographic Metadata State
  const [abstract, setAbstract] = useState<string>(article.abstract || '');
  const [keywords, setKeywords] = useState<string>(article.keywords || '');
  const [funderName, setFunderName] = useState<string>(article.funder_name || '');
  const [funderAwardNumber, setFunderAwardNumber] = useState<string>(article.funder_award_number || '');
  const [funderId, setFunderId] = useState<string>(article.funder_id || '');

  // Author Metadata State
  const [authors, setAuthors] = useState<AuthorMetadata[]>(
    article.article_authors && article.article_authors.length > 0
      ? article.article_authors.map((a) => ({
          co_author_name: a.co_author_name || '',
          co_author_orcid: a.co_author_orcid || '',
          co_author_ror_id: a.co_author_ror_id || '',
        }))
      : [
          {
            co_author_name: '',
            co_author_orcid: '',
            co_author_ror_id: '',
          },
        ]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="bg-[#111118] border border-red-900/40 rounded-xl p-6 max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">Permission Denied</h3>
          <p className="text-xs text-zinc-400">
            Historical Publication Control and Metadata Editing are strictly reserved for Administrator roles.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleAuthorChange = (index: number, field: keyof AuthorMetadata, value: any) => {
    const updated = [...authors];
    updated[index] = { ...updated[index], [field]: value };
    setAuthors(updated);
  };

  const handleAddAuthor = () => {
    setAuthors([
      ...authors,
      {
        co_author_name: '',
        co_author_orcid: '',
        co_author_ror_id: ''
      }
    ]);
  };

  const removeAuthor = (index: number) => {
    setAuthors(authors.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates: Record<string, any> = {
        abstract,
        keywords,
        funder_name: funderName,
        funder_award_number: funderAwardNumber,
        funder_id: funderId,
        authors_metadata: authors,
      };

      if (isHistorical) {
        updates.created_at = submittedAt ? new Date(submittedAt).toISOString() : null;
        updates.published_at = publishedAt ? new Date(publishedAt).toISOString() : null;
      } else {
        updates.created_at = article.created_at || null;
        updates.published_at = article.published_at || null;
      }

      await adminUpdate('articles', article.id, updates);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update article metadata.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
      <div className="relative bg-[#111118] border border-[#C9A84C]/30 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#161622] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-lg text-[#C9A84C]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#C9A84C] text-[#0F2C4A] rounded uppercase">
                  Administrator Restricted
                </span>
                <h3 className="text-lg font-serif font-bold text-white">Metadata & Timeline Editor</h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-lg">{article.title}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-[#0D0D11] px-6 text-xs font-semibold space-x-6">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-[#C9A84C] text-[#C9A84C]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Historical Publication Control
          </button>
          <button
            onClick={() => setActiveTab('bibliographic')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'bibliographic'
                ? 'border-[#C9A84C] text-[#C9A84C]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Scholarly Bibliographic Metadata
          </button>
          <button
            onClick={() => setActiveTab('authors')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'authors'
                ? 'border-[#C9A84C] text-[#C9A84C]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Author & Affiliation Details ({authors.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/40 text-red-400 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-950/40 border border-green-900/40 text-green-400 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Metadata and timeline changes successfully saved!</span>
            </div>
          )}

          {/* TAB 1: Timeline & Historical Control */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#161622] border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Historical Publication Control</h4>
                    <p className="text-xs text-zinc-400">
                      Enable to retrospectively set publication chronology for back-catalog articles.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHistorical}
                      onChange={(e) => setIsHistorical(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C9A84C]"></div>
                  </label>
                </div>

                <div className="p-3 bg-zinc-900/80 rounded-lg text-[11px] text-amber-400 border border-amber-900/30">
                  <strong>Notice:</strong> Internal system timestamps (<code>created_at</code>: {new Date(article.created_at).toLocaleString()}) and immutable audit logs are strictly preserved. Only scholarly display & citation timeline dates are updated.
                </div>
              </div>

              {isHistorical && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Submission Date
                    </label>
                    <input
                      type="datetime-local"
                      value={submittedAt}
                      onChange={(e) => setSubmittedAt(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                    />
                  </div>


                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Publication Date
                    </label>
                    <input
                      type="datetime-local"
                      value={publishedAt}
                      onChange={(e) => setPublishedAt(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Bibliographic Metadata */}
          {activeTab === 'bibliographic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Keywords (comma separated)
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Public Policy, Economics, Governance"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Abstract
                </label>
                <textarea
                  rows={4}
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Funder Name
                    </label>
                    <input
                      value={funderName}
                      onChange={(e) => setFunderName(e.target.value)}
                      placeholder="e.g. National Science Foundation"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Award Number
                    </label>
                    <input
                      value={funderAwardNumber}
                      onChange={(e) => setFunderAwardNumber(e.target.value)}
                      placeholder="e.g. 1234567"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Funder ID (DOI/Crossref)
                    </label>
                    <input
                      value={funderId}
                      onChange={(e) => setFunderId(e.target.value)}
                      placeholder="e.g. 10.13039/100000001"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Author Metadata */}
          {activeTab === 'authors' && (
            <div className="space-y-6">
              {authors.map((auth, idx) => (
                <div key={idx} className="p-4 bg-[#161622] border border-zinc-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-bold text-[#C9A84C]">Author #{idx + 1}</span>
                    {authors.length > 1 && (
                      <button
                        onClick={() => removeAuthor(idx)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove Author
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={auth.co_author_name}
                        onChange={(e) => handleAuthorChange(idx, 'co_author_name', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>


                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        ORCID
                      </label>
                      <input
                        type="text"
                        value={auth.co_author_orcid}
                        onChange={(e) => handleAuthorChange(idx, 'co_author_orcid', e.target.value)}
                        placeholder="0000-0002-1825-0097"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        ROR ID
                      </label>
                      <input
                        type="text"
                        value={auth.co_author_ror_id}
                        onChange={(e) => handleAuthorChange(idx, 'co_author_ror_id', e.target.value)}
                        placeholder="https://ror.org/0524sp257"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddAuthor}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-[#C9A84C] rounded-xl transition-colors"
              >
                + Add Co-Author
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#161622] border-t border-zinc-800 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white">
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-[#C9A84C] hover:bg-[#b0913b] text-[#0F2C4A] text-xs font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Metadata & Timeline'}
          </button>
        </div>
      </div>
    </div>
  );
};
