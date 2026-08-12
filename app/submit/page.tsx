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
  const [affiliation, setAffiliation] = useState('');
  const [rorId, setRorId] = useState('');
  const [rorSuggestions, setRorSuggestions] = useState<any[]>([]);
  const [showRorSuggestions, setShowRorSuggestions] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [journals, setJournals] = useState<DatabaseJournal[]>([]);
  const [selectedJournalId, setSelectedJournalId] = useState('');
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [coAuthors, setCoAuthors] = useState<{ name: string; orcid: string; affiliationName: string; rorId: string; suggestions?: any[]; showSuggestions?: boolean }[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [funderName, setFunderName] = useState('');
  const [funderAwardNumber, setFunderAwardNumber] = useState('');
  const [funderId, setFunderId] = useState('');
  const [funderSuggestions, setFunderSuggestions] = useState<any[]>([]);
  const [showFunderSuggestions, setShowFunderSuggestions] = useState(false);

  const [keywords, setKeywords] = useState('');
  const [conflictOfInterest, setConflictOfInterest] = useState('The author(s) declare no conflicts of interest.');
  const [dataAvailability, setDataAvailability] = useState('');
  const [ethicsApproval, setEthicsApproval] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionId] = useState(() => crypto.randomUUID());

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
              orcid: orcid || null,
              affiliation: affiliation || null,
              ror_id: rorId || null
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
    setCoAuthors([...coAuthors, { name: '', orcid: '', affiliationName: '', rorId: '' }]);
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

  const handleCoAuthorAffiliationChange = async (index: number, val: string) => {
    const updated = [...coAuthors];
    updated[index] = { ...updated[index], affiliationName: val };
    setCoAuthors(updated);

    if (!val.trim()) {
      const nextUpdated = [...coAuthors];
      nextUpdated[index] = { ...nextUpdated[index], affiliationName: val, suggestions: [], showSuggestions: false };
      setCoAuthors(nextUpdated);
      return;
    }

    try {
      const res = await fetch(`/api/ror/search?query=${encodeURIComponent(val)}`);
      const data = await res.json();
      const nextUpdated = [...coAuthors];
      nextUpdated[index] = { ...nextUpdated[index], suggestions: data.items || [], showSuggestions: true };
      setCoAuthors(nextUpdated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveCoAuthor = (index: number) => {
    const updated = coAuthors.filter((_, i) => i !== index);
    setCoAuthors(updated);
  };

  const handleRorSearchChange = async (val: string) => {
    setAffiliation(val);
    if (!val.trim()) {
      setRorSuggestions([]);
      setShowRorSuggestions(false);
      return;
    }
    try {
      const res = await fetch(`/api/ror/search?query=${encodeURIComponent(val)}`);
      const data = await res.json();
      setRorSuggestions(data.items || []);
      setShowRorSuggestions(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFunderSearchChange = async (val: string) => {
    setFunderName(val);
    if (!val.trim()) {
      setFunderSuggestions([]);
      setShowFunderSuggestions(false);
      return;
    }
    try {
      const res = await fetch(`https://api.crossref.org/funders?query=${encodeURIComponent(val)}`);
      const data = await res.json();
      setFunderSuggestions(data.message?.items || []);
      setShowFunderSuggestions(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc') && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && file.type !== 'application/msword') {
        alert('File restriction warning: Manuscript upload must strictly be a DOCX or DOC file.');
        e.target.value = '';
        return;
      }
      setPdfFile(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !abstract.trim() || !selectedJournalId || !pdfFile || !keywords.trim() || !conflictOfInterest.trim()) {
      setSubmissionError('Validation Error: All required form fields must be filled out, including the DOCX manuscript, keywords, and conflict declaration.');
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
        idempotencyKey: submissionId, // Using the generated UUID as the idempotency key
        title,
        abstract,
        content: '', // Replaced by DOCX processing on the backend
        journalId: selectedJournalId,
        coAuthors: coAuthors.map(a => ({
          name: a.name,
          orcid: a.orcid,
          rorId: a.rorId
        })).filter(a => a.name.trim() !== ''),
        pdfFile: {
          name: pdfFile.name,
          type: pdfFile.type,
          base64: base64String
        },
        funderName: funderName || undefined,
        funderAwardNumber: funderAwardNumber || undefined,
        funderId: funderId || undefined,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        conflictOfInterestStatement: conflictOfInterest.trim() || undefined,
        dataAvailabilityStatement: dataAvailability.trim() || undefined,
        ethicsApprovalStatement: ethicsApproval.trim() || undefined
      };

      const token = session?.access_token || '';
      const result = await submitArticle(payload, token);

      if (result.success) {
        setSubmissionSuccess(true);
        setSubmittedId(result.articleId || '');
        setTitle('');
        setAbstract('');
        setAbstract('');
        setCoAuthors([]);
        setPdfFile(null);
        setKeywords('');
        setConflictOfInterest('The author(s) declare no conflicts of interest.');
        setDataAvailability('');
        setEthicsApproval('');
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
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <style>{`
        .ProseMirror {
          min-height: 300px;
          outline: none;
          padding: 12px;
        }
        .ProseMirror p {
          margin-bottom: 1em;
        }
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 1.2em;
          margin-bottom: 0.6em;
        }
        .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-top: 1.2em;
          margin-bottom: 0.6em;
        }
        .ProseMirror h4 {
          font-size: 1.1em;
          font-weight: bold;
          margin-top: 1.2em;
          margin-bottom: 0.6em;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin-bottom: 1em;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin-bottom: 1em;
        }
        .ProseMirror blockquote {
          border-left: 4px solid var(--color-primary);
          padding-left: 1em;
          font-style: italic;
          color: var(--color-text-secondary);
          margin: 1em 0;
        }
        .ProseMirror a:hover {
          color: var(--color-accent);
        }
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1.5em 0;
          overflow: hidden;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          min-width: 1em;
          border: 1px solid var(--color-border);
          padding: 8px 12px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror table th {
          font-weight: bold;
          text-align: left;
          background-color: var(--color-bg-alt);
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1.5em auto;
          border-radius: 6px;
        }
      `}</style>
      <div className="h-16"></div>

      <main className="flex-grow bg-bg py-12 px-4 sm:px-6">
        
        {loadingSession && (
          <div className="max-w-md mx-auto py-24 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto" />
            <p className="text-text-secondary">Checking user session...</p>
          </div>
        )}

        {!loadingSession && !session && (
          <div className="max-w-2xl mx-auto py-6">
            {!showAuthForm ? (
              <div className="bg-surface text-text rounded-xl p-10 text-center shadow-sm border border-border border-t-4 border-t-primary space-y-6">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-serif font-bold text-primary">Manuscript Submission Restricted</h2>
                  <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                    Access to the Author Submission Portal is restricted to registered researchers. You must be authenticated to submit abstracts and PDF manuscripts for editorial review.
                  </p>
                </div>
                
                <div className="pt-2">
                  <button
                    onClick={() => setShowAuthForm(true)}
                    className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-lg transition-all"
                  >
                    Log in or Register to Submit
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-surface rounded-xl p-8 text-text shadow-sm border border-border border-t-4 border-t-accent max-w-md mx-auto">
                <div className="text-center mb-6">
                  <BookOpen className="w-10 h-10 text-primary mx-auto mb-2" />
                  <h2 className="text-2xl font-serif font-bold text-primary">
                    {isRegistering ? 'Create Author Account' : 'Author Submission Portal'}
                  </h2>
                  <p className="text-sm text-text-secondary mt-1">
                    {isRegistering 
                      ? 'Register to submit manuscripts for editorial review.' 
                      : 'Sign in to access secure manuscript uploads.'}
                  </p>
                </div>

                {authError && (
                  <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="leading-tight">{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="p-3 bg-green-100 text-green-700 text-sm rounded-lg mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="leading-tight">{authSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {isRegistering && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary/70" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                          placeholder="e.g. Dr. Jane Smith"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary/70" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                        placeholder="e.g. researcher@institution.edu"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary/70" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>

                  {isRegistering && (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                          ORCID iD <span className="font-normal normal-case tracking-normal">(Optional)</span>
                        </label>
                        <div className="relative">
                          <Fingerprint className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary/70" />
                          <input
                            type="text"
                            value={orcid}
                            onChange={(e) => setOrcid(e.target.value)}
                            pattern="^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$"
                            className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                            placeholder="0000-0002-1234-5678"
                          />
                        </div>
                        <p className="text-[10px] text-text-secondary/60 mt-1">16-digit identifier from orcid.org</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                          Institutional Affiliation <span className="font-normal normal-case tracking-normal">(Optional)</span>
                        </label>
                        <div className="relative">
                          <BookOpen className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary/70" />
                          <input
                            type="text"
                            value={affiliation || ''}
                            onChange={(e) => handleRorSearchChange(e.target.value)}
                            onFocus={() => setShowRorSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowRorSuggestions(false), 200)}
                            className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                            placeholder="Type to search institution..."
                          />
                          {showRorSuggestions && rorSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-surface border border-border rounded-lg shadow-sm text-xs text-text">
                              {rorSuggestions.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-2 hover:bg-accent/5 cursor-pointer border-b border-border last:border-0 text-left"
                                  onMouseDown={() => {
                                    setAffiliation(item.name || '');
                                    setRorId(item.id || '');
                                    setShowRorSuggestions(false);
                                  }}
                                >
                                  <strong>{item.name}</strong>
                                  <span className="block text-[9px] text-text-secondary/60 font-mono">{item.id}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                          ROR ID
                        </label>
                        <div className="relative">
                          <Fingerprint className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary/70" />
                          <input
                            type="text"
                            readOnly
                            value={rorId}
                            className="w-full pl-9 pr-3 py-2 border border-border text-text-secondary/70 rounded-lg text-sm bg-bg-alt cursor-not-allowed outline-none"
                            placeholder="Selected institution's ROR ID"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-lg transition-colors"
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

                <div className="mt-4 pt-4 border-t border-border text-center">
                  <button
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setAuthError(null);
                      setOrcid('');
                    }}
                    className="text-xs text-accent hover:underline font-semibold"
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
            <div className="bg-surface text-text rounded-xl p-8 shadow-sm border border-border border-t-4 border-t-green-600 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              
              <h2 className="text-3xl font-serif font-bold text-primary">Submission Successful</h2>
              <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
                Thank you! Your academic manuscript has been securely uploaded and queued in our editorial pending reviews folder.
              </p>

              <div className="my-6 p-4 bg-bg-alt border border-border rounded-lg text-left space-y-2 text-xs font-mono text-text-secondary max-w-md mx-auto">
                <div><span className="font-semibold text-primary">Article ID:</span> {submittedId}</div>
                <div><span className="font-semibold text-primary">File Bucket:</span> publications</div>
                <div><span className="font-semibold text-primary">Status:</span> pending_review</div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={() => setSubmissionSuccess(false)}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Submit Another Manuscript
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-5 py-2.5 border border-border bg-bg-alt text-text-secondary hover:bg-primary hover:text-white text-sm font-semibold rounded-lg transition-all"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        )}

        {!loadingSession && session && !submissionSuccess && (
          <div className="max-w-3xl mx-auto">
            
            <header className="border-b border-accent/20 pb-4 mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-serif text-primary">Submit Manuscript</h1>
                <p className="text-sm text-text-secondary mt-1">
                  Upload abstracts, author listings, and PDF galleys to the editorial review folder.
                </p>
              </div>
              <button
                onClick={async () => { await supabase.auth.signOut(); setSession(null); }}
                className="text-xs text-red-500 hover:text-red-700 font-semibold uppercase tracking-wider"
              >
                Sign Out
              </button>
            </header>

            <form onSubmit={handleFormSubmit} className="bg-surface text-text rounded-xl p-6 sm:p-8 shadow-sm border border-border space-y-6">
              
              {submissionError && (
                <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submissionError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                  Target Academic Journal
                </label>
                <select
                  required
                  value={selectedJournalId}
                  onChange={(e) => setSelectedJournalId(e.target.value)}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent transition-colors"
                >
                  {journals.map((journal) => (
                    <option key={journal.id} value={journal.id}>
                      {journal.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                  Manuscript Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                  placeholder="e.g. Theoretical Implications of SAARC Region Tariff Corridor Policies"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                  Abstract
                </label>
                <textarea
                  required
                  rows={6}
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors font-sans resize-y"
                  placeholder="Provide a comprehensive academic summary of the research study, findings, and methodologies."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Co-Authors Names (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCoAuthor}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:text-primary font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Author
                  </button>
                </div>

                <div className="space-y-2 mt-2">
                  {coAuthors.map((author, index) => (
                    <div key={index} className="space-y-2 bg-bg-alt p-4 rounded-lg border border-border">
                      <div className="flex gap-2 items-center">
                        <Users className="w-4 h-4 text-text-secondary/70 flex-shrink-0" />
                        <input
                          type="text"
                          value={author.name}
                          onChange={(e) => handleCoAuthorChange(index, e.target.value)}
                          className="flex-grow px-3 py-1.5 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                          placeholder="Co-author full name"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCoAuthor(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2 items-center ml-6">
                        <Fingerprint className="w-3.5 h-3.5 text-text-secondary/60 flex-shrink-0" />
                        <input
                          type="text"
                          value={author.orcid}
                          onChange={(e) => handleCoAuthorOrcidChange(index, e.target.value)}
                          pattern="^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$"
                          className="flex-grow px-3 py-1 bg-bg border border-border rounded-lg text-xs text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                          placeholder="ORCID iD (optional)"
                        />
                      </div>
                      <div className="flex gap-2 items-center ml-6 relative">
                        <BookOpen className="w-3.5 h-3.5 text-text-secondary/60 flex-shrink-0" />
                        <div className="flex-grow relative">
                          <input
                            type="text"
                            value={author.affiliationName || ''}
                            onChange={(e) => handleCoAuthorAffiliationChange(index, e.target.value)}
                            onFocus={() => {
                              const updated = [...coAuthors];
                              updated[index].showSuggestions = true;
                              setCoAuthors(updated);
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                const updated = [...coAuthors];
                                if (updated[index]) {
                                  updated[index].showSuggestions = false;
                                  setCoAuthors(updated);
                                }
                              }, 200);
                            }}
                            className="w-full px-3 py-1 bg-bg border border-border rounded-lg text-xs text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                            placeholder="Type to search institution (ROR ID)..."
                          />
                          {author.showSuggestions && author.suggestions && author.suggestions.length > 0 && (
                            <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto bg-surface border border-border rounded-lg shadow-sm text-xs text-text">
                              {author.suggestions.map((item: any) => (
                                <div
                                  key={item.id}
                                  className="p-2 hover:bg-accent/5 cursor-pointer border-b border-border last:border-0 text-left"
                                  onMouseDown={() => {
                                    const updated = [...coAuthors];
                                    updated[index].affiliationName = item.name || '';
                                    updated[index].rorId = item.id || '';
                                    updated[index].showSuggestions = false;
                                    setCoAuthors(updated);
                                  }}
                                >
                                  <strong>{item.name}</strong>
                                  <span className="block text-[8px] text-text-secondary/60 font-mono">{item.id}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {author.rorId && (
                        <div className="text-[10px] text-green-700 font-mono font-bold ml-12">
                          ROR ID: {author.rorId}
                        </div>
                      )}
                    </div>
                  ))}
                  {coAuthors.length === 0 && (
                    <p className="text-xs text-text-secondary/50 italic">No co-authors added yet.</p>
                  )}
                </div>
              </div>

              {/* Funding Section */}
              <div className="bg-bg-alt border border-border rounded-lg p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-1">
                  Funding & Grant Details (Optional)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                      Funder Name
                    </label>
                    <input
                      type="text"
                      value={funderName || ''}
                      onChange={(e) => handleFunderSearchChange(e.target.value)}
                      onFocus={() => setShowFunderSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowFunderSuggestions(false), 200)}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                      placeholder="Search Funder Registry (e.g. Wellcome)..."
                    />
                    {showFunderSuggestions && funderSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto bg-surface border border-border rounded-lg shadow-sm text-xs text-text">
                        {funderSuggestions.map((item) => (
                          <div
                            key={item.uri}
                            className="p-2 hover:bg-accent/5 cursor-pointer border-b border-border last:border-0 text-left"
                            onMouseDown={() => {
                              setFunderName(item.name || '');
                              setFunderId(item.uri);
                              setShowFunderSuggestions(false);
                            }}
                          >
                            <strong>{item.name}</strong>
                            <span className="block text-[9px] text-text-secondary/60 font-mono">{item.uri}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {funderId && (
                      <div className="mt-1 text-[10px] text-green-700 font-mono font-bold">
                        Funder ID: {funderId}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                      Grant/Award Number
                    </label>
                    <input
                      type="text"
                      value={funderAwardNumber}
                      onChange={(e) => setFunderAwardNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                      placeholder="e.g. WT-12345"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Academic Declarations & Metadata */}
              <div className="bg-bg-alt border border-border rounded-lg p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-1">
                  Academic Declarations &amp; Metadata
                </h3>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Keywords * (Specify 4-6 keywords)
                  </label>
                  <input
                    type="text"
                    required
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                    placeholder="Comma-separated (e.g. public policy, ancient legacy, governance). Minimum 4-6 keywords."
                  />
                  <p className="text-[10px] text-text-secondary/60 mt-1">Specify 4 to 6 keywords separated by commas as requested by the Instructions for Authors.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Conflict of Interest Declaration *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={conflictOfInterest}
                    onChange={(e) => setConflictOfInterest(e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors font-sans resize-y"
                    placeholder="Declare any potential conflict of interest."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Data Availability Statement (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={dataAvailability}
                    onChange={(e) => setDataAvailability(e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors font-sans resize-y"
                    placeholder="Describe where the data supporting the research can be accessed."
                  />
                  <p className="text-[10px] text-text-secondary/60 mt-1">Provide details on the availability of datasets, code, or other research materials.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Ethics Approval Statement (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={ethicsApproval}
                    onChange={(e) => setEthicsApproval(e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors font-sans resize-y"
                    placeholder="Required if research involved human subjects, animal testing, surveys, or interviews."
                  />
                  <p className="text-[10px] text-text-secondary/60 mt-1">Provide approval details from your Institutional Review Board (IRB) or Ethics Committee.</p>
                </div>
              </div>

              <div className="border border-dashed border-border rounded-lg p-6 bg-bg-alt text-center">
                <Upload className="w-10 h-10 text-primary mx-auto mb-2" />
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                  Manuscript Upload (.DOCX format only)
                </label>
                
                <input
                  type="file"
                  required
                  accept=".docx,.doc"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-manuscript-file-input"
                />

                <label
                  htmlFor="pdf-manuscript-file-input"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
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

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <Link
                  href="/"
                  className="px-5 py-2.5 border border-border bg-bg-alt text-text-secondary hover:bg-primary hover:text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </Link>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-lg transition-colors"
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