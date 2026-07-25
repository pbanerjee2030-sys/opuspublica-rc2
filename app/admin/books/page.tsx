'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { adminFetch, adminCreate, adminUpdate, adminDelete } from '@/lib/admin-api';
import {
  Book as BookIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Upload,
} from 'lucide-react';

interface BookAuthor {
  name: string;
  role: string;
}

interface BookTestimonial {
  quote: string;
  author: string;
  title: string;
}

interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image: string | null;
  authors: BookAuthor[];
  isbn: string | null;
  isbn_ebook: string | null;
  publication_date: string | null;
  pages: number | null;
  language: string | null;
  format: string | null;
  price: string | null;
  ebook_price: string | null;
  description: string;
  long_description: string | null;
  table_of_contents: string[] | null;
  testimonials: BookTestimonial[] | null;
  categories: string[];
  tags: string[];
  status: string;
  is_available: boolean;
  doi?: string | null;
  doi_deposit_status?: string | null;
  doi_deposited_at?: string | null;
  doi_deposit_error?: string | null;
}

export default function AdminBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  
  // Simple inputs
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    slug: '',
    cover_image: '',
    isbn: '',
    isbn_ebook: '',
    publication_date: '',
    pages: '',
    language: 'English',
    format: 'Paperback, E-book',
    price: '',
    ebook_price: '',
    status: 'Available Now',
    is_available: true,
    description: '',
    long_description: '',
    // Array textareas (newline-separated)
    table_of_contents: '',
    categories: '',
    tags: '',
    doi: '',
  });

  const [coverUploading, setCoverUploading] = useState(false);

  // Repeatable array rows
  const [authors, setAuthors] = useState<BookAuthor[]>([{ name: '', role: '' }]);
  const [testimonials, setTestimonials] = useState<BookTestimonial[]>([{ quote: '', author: '', title: '' }]);

  const ensureSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return;
    await supabase.auth.refreshSession();
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverUploading(true);
    try {
      await ensureSession();

      const fileExt = file.name.split('.').pop();
      const fileName = `covers/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('covers')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrl } = supabase.storage
        .from('covers')
        .getPublicUrl(fileName);

      setForm({ ...form, cover_image: publicUrl.publicUrl });
    } catch (e: any) {
      showToast('error', e.message || 'Cover upload failed');
    } finally {
      setCoverUploading(false);
    }
  };

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [userRole, setUserRole] = useState<string>('author');
  const [minting, setMinting] = useState(false);

  const handleMintDoi = async () => {
    if (!editingBook) return;
    if (!form.doi.trim()) {
      showToast('error', 'A DOI must be assigned first.');
      return;
    }
    if (form.doi.trim() !== (editingBook.doi || '')) {
      showToast('error', 'Please save the new DOI first by clicking "Save Changes" before minting.');
      return;
    }

    setMinting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/doi/mint?type=book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookId: editingBook.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'DOI deposit failed');
      }

      showToast('success', 'DOI deposit successfully submitted to Crossref.');
      
      setEditingBook({
        ...editingBook,
        doi: form.doi.trim(),
        doi_deposit_status: data.status,
        doi_deposited_at: new Date().toISOString(),
        doi_deposit_error: null,
      });

      fetchBooks();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to mint DOI');
      
      setEditingBook({
        ...editingBook,
        doi_deposit_status: 'failed',
        doi_deposit_error: e.message || 'Deposit failed',
      });
      fetchBooks();
    } finally {
      setMinting(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setUserRole((data as any).role);
          });
      }
    });
  }, []);

  const fetchBooks = async () => {
    try {
      const { data } = await adminFetch('books');
      setBooks((data || []) as Book[]);
    } catch (e) {
      console.error('Error fetching books:', e);
    }
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreate = () => {
    setEditingBook(null);
    setForm({
      title: '',
      subtitle: '',
      slug: '',
      cover_image: '',
      isbn: '',
      isbn_ebook: '',
      publication_date: '',
      pages: '',
      language: 'English',
      format: 'Paperback, E-book',
      price: '',
      ebook_price: '',
      status: 'Available Now',
      is_available: true,
      description: '',
      long_description: '',
      table_of_contents: '',
      categories: '',
      tags: '',
      doi: '',
    });
    setAuthors([{ name: '', role: 'Author' }]);
    setTestimonials([]);
    setShowModal(true);
  };

  const openEdit = (book: Book) => {
    setEditingBook(book);
    setForm({
      title: book.title || '',
      subtitle: book.subtitle || '',
      slug: book.slug || '',
      cover_image: book.cover_image || '',
      isbn: book.isbn || '',
      isbn_ebook: book.isbn_ebook || '',
      publication_date: book.publication_date || '',
      pages: book.pages ? book.pages.toString() : '',
      language: book.language || 'English',
      format: book.format || 'Paperback, E-book',
      price: book.price || '',
      ebook_price: book.ebook_price || '',
      status: book.status || 'Available Now',
      is_available: book.is_available ?? true,
      description: book.description || '',
      long_description: book.long_description || '',
      table_of_contents: book.table_of_contents ? book.table_of_contents.join('\n') : '',
      categories: book.categories ? book.categories.join('\n') : '',
      tags: book.tags ? book.tags.join('\n') : '',
      doi: book.doi || '',
    });
    setAuthors(book.authors && book.authors.length > 0 ? book.authors : [{ name: '', role: 'Author' }]);
    setTestimonials(book.testimonials && book.testimonials.length > 0 ? book.testimonials : []);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim() || !form.description.trim()) {
      showToast('error', 'Title, slug, and synopsis description are required.');
      return;
    }

    setSaving(true);
    try {
      const cleanAuthors = authors.filter((a) => a.name.trim() !== '');
      const cleanTestimonials = testimonials.filter((t) => t.quote.trim() !== '');
      
      const parseArray = (text: string) =>
        text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line !== '');

      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        slug: form.slug.trim(),
        cover_image: form.cover_image.trim() || null,
        isbn: form.isbn.trim() || null,
        isbn_ebook: form.isbn_ebook.trim() || null,
        publication_date: form.publication_date.trim() || null,
        pages: form.pages ? parseInt(form.pages, 10) : null,
        language: form.language.trim() || null,
        format: form.format.trim() || null,
        price: form.price.trim() || null,
        ebook_price: form.ebook_price.trim() || null,
        status: form.status.trim() || 'Available Now',
        is_available: form.is_available,
        description: form.description.trim(),
        long_description: form.long_description.trim() || null,
        authors: cleanAuthors,
        testimonials: cleanTestimonials,
        table_of_contents: parseArray(form.table_of_contents),
        categories: parseArray(form.categories),
        tags: parseArray(form.tags),
        doi: form.doi.trim() || null,
      };

      if (editingBook) {
        await adminUpdate('books', editingBook.id, payload);
        showToast('success', 'Book updated successfully');
      } else {
        await adminCreate('books', payload);
        showToast('success', 'Book created successfully');
      }
      setShowModal(false);
      fetchBooks();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to save book');
    }
    setSaving(false);
  };

  const handleDelete = async (book: Book) => {
    if (!confirm(`Delete book "${book.title}"? This cannot be undone.`)) return;
    try {
      await adminDelete('books', book.id);
      showToast('success', 'Book deleted successfully');
      fetchBooks();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to delete book');
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 shadow-xl ${
            toast.type === 'success'
              ? 'bg-green-900 text-green-200 border border-green-800'
              : 'bg-red-900 text-red-200 border border-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">Book Management</h1>
          <p className="text-sm text-zinc-400 mt-1">Create, edit, and manage policy volumes and monographs.</p>
        </div>
        {(userRole === 'admin' || userRole === 'editor') && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#13131A] text-xs font-bold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Book
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : books.length === 0 ? (
        <div className="bg-[#111118] border border-zinc-800 rounded-xl py-16 text-center">
          <BookIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">No books in catalog yet</p>
        </div>
      ) : (
        <div className="bg-[#111118] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900/40">
                  <th className="px-6 py-4">Cover</th>
                  <th className="px-6 py-4">Title / Subtitle</th>
                  <th className="px-6 py-4">ISBN</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-zinc-900/20 group transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-10 h-14 bg-zinc-900 rounded border border-zinc-800 relative overflow-hidden flex items-center justify-center">
                        {book.cover_image ? (
                          <img
                            src={book.cover_image}
                            alt={`${book.title} cover`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookIcon className="w-5 h-5 text-zinc-700" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <p className="text-sm font-semibold text-white truncate">{book.title}</p>
                        {book.subtitle && (
                          <p className="text-xs text-zinc-500 truncate mt-0.5">{book.subtitle}</p>
                        )}
                        <p className="text-[10px] text-zinc-600 font-mono mt-1">/{book.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400 font-mono">
                      {book.isbn || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        book.is_available
                          ? 'bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {book.status || 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`/books/${book.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="View live page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {(userRole === 'admin' || userRole === 'editor') && (
                          <>
                            <button
                              onClick={() => openEdit(book)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-[#C9A84C] hover:bg-zinc-800 transition-colors"
                              title="Edit book details"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(book)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                              title="Delete book"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#111118] border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
              <h3 className="text-lg font-serif font-bold text-white">
                {editingBook ? 'Edit Book Details' : 'Add New Book'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Section 1: General Info */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] border-b border-zinc-800 pb-1.5">
                  General Info
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Book Title *
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                      placeholder="e.g. GRACE: Timekeepers of Ancient Cultural Legacy"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={form.subtitle}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                      placeholder="e.g. Preserving the World's Ancient Cultural Traditions"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      URL Slug *
                    </label>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] font-mono"
                      placeholder="grace-timekeepers"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Cover Image
                    </label>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-20 h-28 bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden flex items-center justify-center">
                        {form.cover_image ? (
                          <img
                            src={form.cover_image}
                            alt="Cover preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Upload className="w-6 h-6 text-zinc-700" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="relative cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleCoverUpload}
                              disabled={coverUploading}
                              className="sr-only"
                            />
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors disabled:opacity-50">
                              {coverUploading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              {coverUploading ? 'Uploading...' : 'Upload'}
                            </span>
                          </label>
                          {form.cover_image && (
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, cover_image: '' })}
                              className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={form.cover_image}
                          onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] font-mono"
                          placeholder="Or enter URL manually..."
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Publication Status
                    </label>
                    <input
                      type="text"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                      placeholder="Available Now"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_available"
                    checked={form.is_available}
                    onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                    className="w-4 h-4 bg-zinc-900 border-zinc-800 rounded text-[#C9A84C] focus:ring-0 outline-none"
                  />
                  <label htmlFor="is_available" className="text-xs text-zinc-300 font-medium select-none cursor-pointer">
                    Display as Available for Purchase / View
                  </label>
                </div>
              </div>

              {/* Section 2: Catalog Details */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] border-b border-zinc-800 pb-1.5">
                  Specifications &amp; Catalog Details
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      ISBN
                    </label>
                    <input
                      type="text"
                      value={form.isbn}
                      onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] font-mono"
                      placeholder="9798227366276"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Ebook ISBN
                    </label>
                    <input
                      type="text"
                      value={form.isbn_ebook}
                      onChange={(e) => setForm({ ...form, isbn_ebook: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] font-mono"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Published Date
                    </label>
                    <input
                      type="text"
                      value={form.publication_date}
                      onChange={(e) => setForm({ ...form, publication_date: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                      placeholder="e.g. 2024"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Pages
                    </label>
                    <input
                      type="number"
                      value={form.pages}
                      onChange={(e) => setForm({ ...form, pages: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                      placeholder="e.g. 240"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Language
                    </label>
                    <input
                      type="text"
                      value={form.language}
                      onChange={(e) => setForm({ ...form, language: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Format
                    </label>
                    <input
                      type="text"
                      value={form.format}
                      onChange={(e) => setForm({ ...form, format: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Price (Paperback)
                    </label>
                    <input
                      type="text"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                      placeholder="$25.99"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Price (E-book)
                    </label>
                    <input
                      type="text"
                      value={form.ebook_price}
                      onChange={(e) => setForm({ ...form, ebook_price: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                      placeholder="$9.99"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      DOI Prefix/Identifier
                    </label>
                    <input
                      type="text"
                      value={form.doi}
                      onChange={(e) => setForm({ ...form, doi: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C] font-mono"
                      placeholder="e.g. 10.5555/grace-timekeepers"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2.5: DOI Registration Status (Only when editing and DOI is set) */}
              {editingBook && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] border-b border-zinc-800 pb-1.5">
                    DOI Registration Status
                  </p>
                  <div className="p-4 bg-zinc-950/40 border border-zinc-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 font-medium">Status:</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          editingBook.doi_deposit_status === 'submitted'
                            ? 'bg-green-950/40 text-green-400 border border-green-900/30'
                            : editingBook.doi_deposit_status === 'failed'
                            ? 'bg-red-950/40 text-red-400 border border-red-900/30'
                            : 'bg-zinc-800/40 text-zinc-400 border border-zinc-700/30'
                        }`}>
                          {editingBook.doi_deposit_status || 'not_submitted'}
                        </span>
                      </div>
                      {editingBook.doi_deposit_status === 'failed' && editingBook.doi_deposit_error && (
                        <p className="text-[10px] text-red-400 font-mono mt-1 max-w-xl truncate">
                          {editingBook.doi_deposit_error}
                        </p>
                      )}
                      {editingBook.doi_deposit_status === 'submitted' && editingBook.doi_deposited_at && (
                        <p className="text-[10px] text-zinc-500 mt-1 font-sans">
                          Deposited at: {new Date(editingBook.doi_deposited_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div>
                      {editingBook.doi_deposit_status !== 'submitted' ? (
                        editingBook.doi ? (
                          <button
                            type="button"
                            onClick={handleMintDoi}
                            disabled={minting}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C9A84C] hover:bg-[#D4AF37] disabled:opacity-50 text-[#13131A] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            {minting ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Minting...
                              </>
                            ) : (
                              'Mint DOI via Crossref'
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-500 italic">Save a DOI first to enable deposition.</span>
                        )
                      ) : (
                        <span className="text-xs text-green-400 font-medium">DOI successfully minted.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Synopsis & Description */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] border-b border-zinc-800 pb-1.5">
                  Synopsis Description
                </p>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                    Short Description / Intro (Text) *
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                    placeholder="Short description displayed on cards and details header..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                    Long Detailed Description (Body Text)
                  </label>
                  <textarea
                    value={form.long_description}
                    onChange={(e) => setForm({ ...form, long_description: e.target.value })}
                    rows={4}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                    placeholder="Full book synopsis, background history, or detailed description..."
                  />
                </div>
              </div>

              {/* Section 4: Authors Repeatable Section */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] border-b border-zinc-800 pb-1.5">
                  Authors &amp; Contributors
                </p>
                <div className="space-y-3">
                  {authors.map((author, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Author Name"
                          value={author.name}
                          onChange={(e) => {
                            const newAuthors = [...authors];
                            newAuthors[index].name = e.target.value;
                            setAuthors(newAuthors);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#C9A84C]"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Role (e.g. Lead Author, Contributor)"
                          value={author.role}
                          onChange={(e) => {
                            const newAuthors = [...authors];
                            newAuthors[index].role = e.target.value;
                            setAuthors(newAuthors);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#C9A84C]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (authors.length > 1) {
                            setAuthors(authors.filter((_, i) => i !== index));
                          } else {
                            setAuthors([{ name: '', role: 'Author' }]);
                          }
                        }}
                        className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAuthors([...authors, { name: '', role: 'Author' }])}
                    className="inline-flex items-center gap-1 text-xs text-[#C9A84C] hover:text-[#D4AF37]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Author
                  </button>
                </div>
              </div>

              {/* Section 5: Praise & Testimonials Repeatable Section */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] border-b border-zinc-800 pb-1.5">
                  Praise &amp; Testimonials
                </p>
                <div className="space-y-4">
                  {testimonials.map((test, index) => (
                    <div
                      key={index}
                      className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl relative space-y-3"
                    >
                      <button
                        type="button"
                        onClick={() => setTestimonials(testimonials.filter((_, i) => i !== index))}
                        className="absolute top-3 right-3 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">
                            Reviewer / Author
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Dr. Mathieu Martin"
                            value={test.author}
                            onChange={(e) => {
                              const newTest = [...testimonials];
                              newTest[index].author = e.target.value;
                              setTestimonials(newTest);
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#C9A84C]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">
                            Role / Affiliation
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Social Anthropologist, Switzerland"
                            value={test.title}
                            onChange={(e) => {
                              const newTest = [...testimonials];
                              newTest[index].title = e.target.value;
                              setTestimonials(newTest);
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#C9A84C]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">
                          Quote / Testimonial Quote *
                        </label>
                        <textarea
                          placeholder="Quote content..."
                          value={test.quote}
                          onChange={(e) => {
                            const newTest = [...testimonials];
                            newTest[index].quote = e.target.value;
                            setTestimonials(newTest);
                          }}
                          rows={2}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#C9A84C] resize-none"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTestimonials([...testimonials, { quote: '', author: '', title: '' }])}
                    className="inline-flex items-center gap-1 text-xs text-[#C9A84C] hover:text-[#D4AF37]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Praise/Testimonial
                  </button>
                </div>
              </div>

              {/* Section 6: Meta Lists */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] border-b border-zinc-800 pb-1.5">
                  Metadata Lists (One entry per line)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Table of Contents
                    </label>
                    <textarea
                      value={form.table_of_contents}
                      onChange={(e) => setForm({ ...form, table_of_contents: e.target.value })}
                      rows={5}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                      placeholder="e.g.&#13;The Genesis of GRACE&#13;The Global Threat to Ancient Cultures"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Categories
                    </label>
                    <textarea
                      value={form.categories}
                      onChange={(e) => setForm({ ...form, categories: e.target.value })}
                      rows={5}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                      placeholder="e.g.&#13;Cultural Heritage&#13;Technology&#13;Global Affairs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Tags
                    </label>
                    <textarea
                      value={form.tags}
                      onChange={(e) => setForm({ ...form, tags: e.target.value })}
                      rows={5}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#C9A84C]"
                      placeholder="e.g.&#13;cultural preservation&#13;ancient heritage"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#C9A84C] hover:bg-[#D4AF37] disabled:opacity-50 text-[#0D0D11] text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingBook ? 'Save Changes' : 'Create Book'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
