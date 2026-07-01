'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { adminFetch, adminCreate, adminUpdate, adminDelete } from '@/lib/admin-api';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';

interface Journal {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  issn: string | null;
  publisher: string | null;
  editorial_board: string | null;
  aims_and_scope: string | null;
  peer_review_policy: string | null;
  license_type: string | null;
  license_url: string | null;
  frequency: string | null;
  subject_areas: string[] | null;
  created_at: string;
}

export default function JournalsPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJournal, setEditingJournal] = useState<Journal | null>(null);
  const [form, setForm] = useState({
    name: '', slug: '', description: '', cover_image: '',
    issn: '', publisher: 'Advocacy Unified Network', editorial_board: '',
    aims_and_scope: '', peer_review_policy: '', license_type: 'CC BY 4.0',
    license_url: '', frequency: '', subject_areas: '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [userRole, setUserRole] = useState<string>('author');

  useEffect(() => {
    fetchJournals();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
          if (data) setUserRole((data as any).role);
        });
      }
    });
  }, []);

  const fetchJournals = async () => {
    try {
      const { data } = await adminFetch('journals');
      setJournals((data || []) as any);
    } catch (e) {
      console.error('Error fetching journals:', e);
    }
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreate = () => {
    setEditingJournal(null);
    setForm({
      name: '', slug: '', description: '', cover_image: '',
      issn: '', publisher: 'Advocacy Unified Network', editorial_board: '',
      aims_and_scope: '', peer_review_policy: '', license_type: 'CC BY 4.0',
      license_url: '', frequency: '', subject_areas: '',
    });
    setShowModal(true);
  };

  const openEdit = (journal: Journal) => {
    setEditingJournal(journal);
    setForm({
      name: journal.name,
      slug: journal.slug,
      description: journal.description || '',
      cover_image: journal.cover_image || '',
      issn: journal.issn || '',
      publisher: journal.publisher || 'Advocacy Unified Network',
      editorial_board: journal.editorial_board || '',
      aims_and_scope: journal.aims_and_scope || '',
      peer_review_policy: journal.peer_review_policy || '',
      license_type: journal.license_type || 'CC BY 4.0',
      license_url: journal.license_url || '',
      frequency: journal.frequency || '',
      subject_areas: journal.subject_areas?.join(', ') || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      showToast('error', 'Name and slug are required');
      return;
    }
    setSaving(true);
    try {
      const slug = form.slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const payload = {
        name: form.name.trim(),
        slug,
        description: form.description.trim() || null,
        cover_image: form.cover_image.trim() || null,
        issn: form.issn.trim() || null,
        publisher: form.publisher.trim() || null,
        editorial_board: form.editorial_board.trim() || null,
        aims_and_scope: form.aims_and_scope.trim() || null,
        peer_review_policy: form.peer_review_policy.trim() || null,
        license_type: form.license_type.trim() || null,
        license_url: form.license_url.trim() || null,
        frequency: form.frequency.trim() || null,
        subject_areas: form.subject_areas ? form.subject_areas.split(',').map(s => s.trim()).filter(Boolean) : null,
      };
      if (editingJournal) {
        await adminUpdate('journals', editingJournal.id, payload);
        showToast('success', 'Journal updated');
      } else {
        await adminCreate('journals', payload);
        showToast('success', 'Journal created');
      }
      setShowModal(false);
      fetchJournals();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to save journal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (journal: Journal) => {
    if (!confirm(`Delete "${journal.name}"? This cannot be undone.`)) return;
    try {
      await adminDelete('journals', journal.id);
      showToast('success', 'Journal deleted');
      fetchJournals();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to delete journal');
    }
  };

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
          <h1 className="text-2xl font-serif font-bold text-white">Journal Management</h1>
          <p className="text-sm text-zinc-400 mt-1">Create, edit, and manage your academic journals.</p>
        </div>
        {userRole === 'admin' && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#13131A] text-xs font-bold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Journal
          </button>
        )}
      </div>

      {/* Journals Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : journals.length === 0 ? (
        <div className="bg-[#111118] border border-zinc-800 rounded-xl py-16 text-center">
          <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">No journals yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {journals.map((journal) => (
            <div key={journal.id} className="bg-[#111118] border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors">
              {journal.cover_image && (
                <div className="h-32 bg-zinc-900 relative overflow-hidden">
                  <img src={journal.cover_image} alt={journal.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111118] to-transparent" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-serif font-bold text-white truncate">{journal.name}</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">/{journal.slug}</p>
                  </div>
                  {userRole === 'admin' && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(journal)} className="p-1.5 rounded-lg text-zinc-500 hover:text-[#C9A84C] hover:bg-zinc-800 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(journal)} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {journal.description && (
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">{journal.description}</p>
                )}
                <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <a href={`/${journal.slug}`} target="_blank" className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] hover:text-white flex items-center gap-1 transition-colors">
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#111118] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-serif font-bold text-white">{editingJournal ? 'Edit Journal' : 'New Journal'}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Journal Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                  placeholder="e.g. CyberSec Journal"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">URL Slug *</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] font-mono"
                  placeholder="e.g. cybersec-journal"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] resize-none"
                  placeholder="Brief description of the journal..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Cover Image URL</label>
                <input
                  type="text"
                  value={form.cover_image}
                  onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] font-mono"
                  placeholder="/CoverImage.jpg"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] mb-3">DOAJ / COPE Metadata</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">ISSN</label>
                  <input
                    type="text"
                    value={form.issn}
                    onChange={(e) => setForm({ ...form, issn: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] font-mono"
                    placeholder="1234-5678"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Publisher</label>
                  <input
                    type="text"
                    value={form.publisher}
                    onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                    placeholder="Advocacy Unified Network"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">License</label>
                  <input
                    type="text"
                    value={form.license_type}
                    onChange={(e) => setForm({ ...form, license_type: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                    placeholder="CC BY 4.0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Frequency</label>
                  <input
                    type="text"
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                    placeholder="Quarterly"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Subject Areas (comma-separated)</label>
                <input
                  type="text"
                  value={form.subject_areas}
                  onChange={(e) => setForm({ ...form, subject_areas: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                  placeholder="Computer Science, Cybersecurity"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Editorial Board</label>
                <textarea
                  value={form.editorial_board}
                  onChange={(e) => setForm({ ...form, editorial_board: e.target.value })}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] resize-none"
                  placeholder="List editors and affiliations..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Aims & Scope</label>
                <textarea
                  value={form.aims_and_scope}
                  onChange={(e) => setForm({ ...form, aims_and_scope: e.target.value })}
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] resize-none"
                  placeholder="What the journal covers, methodology preferences..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Peer Review Policy</label>
                <textarea
                  value={form.peer_review_policy}
                  onChange={(e) => setForm({ ...form, peer_review_policy: e.target.value })}
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] resize-none"
                  placeholder="Double-blind, single-blind, open review..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">License URL</label>
                <input
                  type="text"
                  value={form.license_url}
                  onChange={(e) => setForm({ ...form, license_url: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] font-mono"
                  placeholder="https://creativecommons.org/licenses/by/4.0/"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#13131A] text-xs font-bold rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingJournal ? 'Save Changes' : 'Create Journal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
