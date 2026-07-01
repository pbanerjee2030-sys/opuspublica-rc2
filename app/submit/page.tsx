'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { submitArticle } from '@/app/actions/submitArticle';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Plus, 
  Trash2, 
  Upload, 
  BookOpen, 
  Users, 
  Mail,
  Lock,
  User,
  Check,
  Fingerprint
} from 'lucide-react';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { DatabaseJournal } from '@/lib/types';

export default function SubmitArticlePage() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orcid, setOrcid] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [journals, setJournals] = useState<DatabaseJournal[]>([]);
  const [selectedJournalId, setSelectedJournalId] = useState('');
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [coAuthors, setCoAuthors] = useState<{ name: string; orcid: string }[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
      setLoadingSession(false);
    });

    const fetchJournals = async () => {
      try {
        const { data, error } = await supabase.from('journals').select('*');
        if (!error && data && data.length > 0) {
          setJournals(data as any);
          setSelectedJournalId((data as any)[0].id);
        }
      } catch (err) {
        console.error('Error fetching journals:', err);
      }
    };

    fetchJournals();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: fullName,
              role: 'author',
              orcid: orcid || null
            }
          }
        });
        
        if (error) throw error;
        
        setAuthSuccess('Registration successful! Signing in...');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during authentication.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAddCoAuthor = () => {
    setCoAuthors([...coAuthors, { name: '', orcid: '' }]);
  };

  const handleCoAuthorChange = (index: number, value: string) => {
    const updated = [...coAuthors];
    updated[index] = { ...updated[index], name: value };
    setCoAuthors(updated);
  };

  const handleCoAuthorOrcidChange = (index: number, value: string) => {
    const updated = [...coAuthors];
    updated[index] = { ...updated[index], orcid: value };
    setCoAuthors(updated);
  };

  const handleRemoveCoAuthor = (index: number) => {
    const updated = coAuthors.filter((_, i) => i !== index);
    setCoAuthors(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert('File restriction warning: Manuscript upload must strictly be a PDF file.');
        e.target.value = '';
        return;
      }
      setPdfFile(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !abstract.trim() || !selectedJournalId || !pdfFile) {
      setSubmissionError('Validation Error: All form fields are required, including the PDF manuscript.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const resultStr = reader.result as string;
          const base64Data = resultStr.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = (err) => reject(err);
      });
      
      reader.readAsDataURL(pdfFile);
      const base64String = await base64Promise;

      const payload = {
        title,
        abstract,
        journalId: selectedJournalId,
        coAuthors: coAuthors.filter(a => a.name.trim() !== ''),
        pdfFile: {
          name: pdfFile.name,
          type: pdfFile.type,
          base64: base64String
        },
      };

      const token = session?.access_token || '';
      const result = await submitArticle(payload, token);

      if (result.success) {
        setSubmissionSuccess(true);
        setSubmittedId(result.articleId || '');
        setTitle('');
        setAbstract('');
        setCoAuthors([]);
        setPdfFile(null);
      } else {
        setSubmissionError(result.error || 'Submission failed.');
      }

    } catch (err: any) {
      console.error(err);
      setSubmissionError(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white flex flex-col">
      <div className="h-16"></div>

      <main className="flex-grow bg-[#1A1A2E] py-12 px-4 sm:px-6">
        
        {loadingSession && (
          <div className="max-w-md mx-auto py-24 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-[#C9A84C] animate-spin mx-auto" />
            <p className="text-white/80">Checking user session...</p>
          </div>
        )}

        {!loadingSession && !session && (
          <div className="max-w-2xl mx-auto py-6">
            {!showAuthForm ? (
              <div className="bg-[#F5F0E8] text-[#1A1A2E] rounded-lg p-10 text-center shadow-xl border-t-4 border-[#8B1A1A] space-y-6">
                <div className="w-16 h-16 bg-[#8B1A1A]/10 text-[#8B1A1A] rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-serif font-bold text-[#1A1A2E]">Manuscript Submission Restricted</h2>
                  <p className="text-sm text-[#1A1A2E]/70 max-w-md mx-auto leading-relaxed">
                    Access to the Author Submission Portal is restricted to registered researchers. You must be authenticated to submit abstracts and PDF manuscripts for editorial review.
                  </p>
                </div>
                
                <div className="pt-2">
                  <button
                    onClick={() => setShowAuthForm(true)}
                    className="px-6 py-3 bg-[#8B1A1A] hover:bg-[#1A1A2E] text-white font-bold text-sm rounded shadow hover:shadow-lg transition-all"
                  >
                    Log in or Register to Submit
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-8 text-[#1A1A2E] shadow-xl border-t-4 border-[#C9A84C] max-w-md mx-auto">
                <div className="text-center mb-6">
                  <BookOpen className="w-10 h-10 text-[#8B1A1A] mx-auto mb-2" />
                  <h2 className="text-2xl font-serif font-bold text-[#1A1A2E]">
                    {isRegistering ? 'Create Author Account' : 'Author Submission Portal'}
                  </h2>
                  <p className="text-sm text-[#1A1A2E]/70 mt-1">
                    {isRegistering 
                      ? 'Register to submit manuscripts for editorial review.' 
                      : 'Sign in to access secure manuscript uploads.'}
                  </p>
                </div>

                {authError && (
                  <div className="p-3 bg-red-100 text-red-700 text-sm rounded mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="leading-tight">{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="p-3 bg-green-100 text-green-700 text-sm rounded mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="leading-tight">{authSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {isRegistering && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/70 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-[#1A1A2E]/50" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-black/10 rounded text-sm focus:outline-none focus:border-[#8B1A1A]"
                          placeholder="e.g. Dr. Jane Smith"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/70 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[#1A1A2E]/50" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-black/10 rounded text-sm focus:outline-none focus:border-[#8B1A1A]"
                        placeholder="e.g. researcher@institution.edu"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/70 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#1A1A2E]/50" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-black/10 rounded text-sm focus:outline-none focus:border-[#8B1A1A]"
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>

                  {isRegistering && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/70 mb-1">
                        ORCID iD <span className="font-normal normal-case tracking-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3 top-2.5 w-4 h-4 text-[#1A1A2E]/50" />
                        <input
                          type="text"
                          value={orcid}
                          onChange={(e) => setOrcid(e.target.value)}
                          pattern="^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$"
                          className="w-full pl-9 pr-3 py-2 border border-black/10 rounded text-sm focus:outline-none focus:border-[#8B1A1A]"
                          placeholder="0000-0002-1234-5678"
                        />
                      </div>
                      <p className="text-[10px] text-[#1A1A2E]/40 mt-0.5">16-digit identifier from orcid.org</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-[#1A1A2E] hover:bg-[#8B1A1A] text-white font-semibold text-sm rounded shadow hover:shadow-md transition-colors"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      isRegistering ? 'Register & Initialize' : 'Sign In'
                    )}
                  </button>
                </form>

                <div className="mt-4 pt-4 border-t border-[#1A1A2E]/10 text-center">
                  <button
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setAuthError(null);
                      setOrcid('');
                    }}
                    className="text-xs text-[#8B1A1A] hover:underline font-semibold"
                  >
                    {isRegistering ? 'Already have an account? Sign In' : 'Need an author account? Register'}
                  </button>
                </div>

              </div>
            )}
          </div>
        )}

        {!loadingSession && session && submissionSuccess && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-[#F5F0E8] text-[#1A1A2E] rounded-lg p-8 shadow-xl border-t-4 border-green-600 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              
              <h2 className="text-3xl font-serif font-bold text-[#1A1A2E]">Submission Successful</h2>
              <p className="text-sm text-[#1A1A2E]/70 mt-2 max-w-md mx-auto">
                Thank you! Your academic manuscript has been securely uploaded and queued in our editorial pending reviews folder.
              </p>

              <div className="my-6 p-4 bg-white/60 border border-black/5 rounded text-left space-y-2 text-xs font-mono text-black/80 max-w-md mx-auto">
                <div><span className="font-semibold text-black">Article ID:</span> {submittedId}</div>
                <div><span className="font-semibold text-black">File Bucket:</span> publications</div>
                <div><span className="font-semibold text-black">Status:</span> pending_review</div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={() => setSubmissionSuccess(false)}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#1A1A2E] text-white text-sm font-semibold rounded transition-colors shadow"
                >
                  Submit Another Manuscript
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-5 py-2.5 border border-[#1A1A2E] hover:bg-[#1A1A2E] hover:text-white text-[#1A1A2E] text-sm font-semibold rounded transition-all"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        )}

        {!loadingSession && session && !submissionSuccess && (
          <div className="max-w-3xl mx-auto">
            
            <header className="border-b border-[#C9A84C]/20 pb-4 mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-serif text-[#C9A84C]">Submit Manuscript</h1>
                <p className="text-sm text-white/70 mt-1">
                  Upload abstracts, author listings, and PDF galleys to the editorial review folder.
                </p>
              </div>
              <button
                onClick={async () => { await supabase.auth.signOut(); setSession(null); }}
                className="text-xs text-red-400 hover:text-red-300 font-semibold uppercase tracking-wider"
              >
                Sign Out
              </button>
            </header>

            <form onSubmit={handleFormSubmit} className="bg-[#F5F0E8] text-[#1A1A2E] rounded-lg p-6 sm:p-8 shadow-xl space-y-6">
              
              {submissionError && (
                <div className="p-3 bg-red-100 text-red-700 text-sm rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submissionError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/70 mb-1">
                  Target Academic Journal
                </label>
                <select
                  required
                  value={selectedJournalId}
                  onChange={(e) => setSelectedJournalId(e.target.value)}
                  className="w-full px-3 py-2 border border-black/10 rounded text-sm bg-white focus:outline-none focus:border-[#8B1A1A]"
                >
                  {journals.map((journal) => (
                    <option key={journal.id} value={journal.id}>
                      {journal.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/70 mb-1">
                  Manuscript Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-black/10 rounded text-sm bg-white focus:outline-none focus:border-[#8B1A1A]"
                  placeholder="e.g. Theoretical Implications of SAARC Region Tariff Corridor Policies"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/70 mb-1">
                  Abstract
                </label>
                <textarea
                  required
                  rows={6}
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full px-3 py-2 border border-black/10 rounded text-sm bg-white focus:outline-none focus:border-[#8B1A1A] font-sans resize-y"
                  placeholder="Provide a comprehensive academic summary of the research study, findings, and methodologies."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/70">
                    Co-Authors Names (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCoAuthor}
                    className="inline-flex items-center gap-1 text-xs text-[#8B1A1A] hover:text-[#1A1A2E] font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Author
                  </button>
                </div>

                <div className="space-y-2 mt-2">
                  {coAuthors.map((author, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex gap-2 items-center">
                        <Users className="w-4 h-4 text-black/40 flex-shrink-0" />
                        <input
                          type="text"
                          value={author.name}
                          onChange={(e) => handleCoAuthorChange(index, e.target.value)}
                          className="flex-grow px-3 py-1.5 border border-black/10 rounded text-sm bg-white focus:outline-none focus:border-[#8B1A1A]"
                          placeholder="Co-author full name"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCoAuthor(index)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2 items-center ml-6">
                        <Fingerprint className="w-3 h-3 text-black/30 flex-shrink-0" />
                        <input
                          type="text"
                          value={author.orcid}
                          onChange={(e) => handleCoAuthorOrcidChange(index, e.target.value)}
                          pattern="^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$"
                          className="flex-grow px-3 py-1 border border-black/10 rounded text-xs bg-white focus:outline-none focus:border-[#8B1A1A]"
                          placeholder="ORCID iD (optional)"
                        />
                      </div>
                    </div>
                  ))}
                  {coAuthors.length === 0 && (
                    <p className="text-xs text-[#1A1A2E]/40 italic">No co-authors added yet.</p>
                  )}
                </div>
              </div>

              <div className="border border-dashed border-black/20 rounded-lg p-6 bg-white/40 text-center">
                <Upload className="w-10 h-10 text-[#8B1A1A] mx-auto mb-2" />
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/70 mb-2">
                  Manuscript Upload (.PDF format only)
                </label>
                
                <input
                  type="file"
                  required
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-manuscript-file-input"
                />

                <label
                  htmlFor="pdf-manuscript-file-input"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-white rounded text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <FileText className="w-4 h-4" />
                  {pdfFile ? 'Replace PDF Document' : 'Choose PDF File'}
                </label>

                {pdfFile && (
                  <div className="mt-3 text-xs font-semibold text-green-700 flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>File Selected: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-black/10 flex justify-end gap-3">
                <Link
                  href="/"
                  className="px-5 py-2.5 border border-[#1A1A2E] hover:bg-black/5 text-[#1A1A2E] text-sm font-semibold rounded transition-colors"
                >
                  Cancel
                </Link>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#1A1A2E] text-white font-semibold text-sm rounded shadow hover:shadow-md transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading Manuscript...
                    </>
                  ) : (
                    'Submit Manuscript'
                  )}
                </button>
              </div>

            </form>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
