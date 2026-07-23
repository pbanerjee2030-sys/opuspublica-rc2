'use client';

import React, { useState, useEffect } from 'react';
import { Edit3, Check, Loader2, X, BookOpen, Fingerprint } from 'lucide-react';

interface ProfileEditModalProps {
  profile: {
    id: string;
    full_name: string;
    bio: string;
    affiliation: string;
    ror_id: string | null;
  };
  onSave: (data: { full_name: string; bio: string; affiliation: string; ror_id: string }) => Promise<void>;
}

export default function ProfileEditModal({ profile, onSave }: ProfileEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name);
  const [bio, setBio] = useState(profile.bio);
  const [affiliation, setAffiliation] = useState(profile.affiliation);
  const [rorId, setRorId] = useState(profile.ror_id || '');
  
  const [rorSuggestions, setRorSuggestions] = useState<any[]>([]);
  const [showRorSuggestions, setShowRorSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRorSearchChange = async (val: string) => {
    setAffiliation(val);
    if (!val.trim()) {
      setRorSuggestions([]);
      setShowRorSuggestions(false);
      return;
    }
    try {
      const res = await fetch(`https://api.ror.org/organizations?query=${encodeURIComponent(val)}`);
      const data = await res.json();
      setRorSuggestions(data.items || []);
      setShowRorSuggestions(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSave({
        full_name: fullName,
        bio,
        affiliation,
        ror_id: rorId
      });
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface border border-border hover:bg-bg-alt rounded text-xs font-bold transition-all text-accent"
      >
        <Edit3 className="w-3.5 h-3.5" />
        Edit Profile
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border rounded-lg p-6 text-text shadow-2xl max-w-md w-full border-t-4 border-accent relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-black/5 rounded text-zinc-400 hover:text-zinc-650"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-primary mb-4">Edit Profile Details</h3>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 text-xs rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text placeholder:text-text-secondary/40 focus:outline-none focus:border-accent"
                  placeholder="e.g. Dr. Jane Smith"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                  Biography
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text placeholder:text-text-secondary/40 focus:outline-none focus:border-accent font-sans resize-y"
                  placeholder="Tell us about your research experience..."
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                  Institutional Affiliation
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary/50" />
                  <input
                    type="text"
                    value={affiliation}
                    onChange={(e) => handleRorSearchChange(e.target.value)}
                    onFocus={() => setShowRorSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowRorSuggestions(false), 200)}
                    className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded text-sm text-text placeholder:text-text-secondary/40 focus:outline-none focus:border-accent"
                    placeholder="Search institution name..."
                  />
                  {showRorSuggestions && rorSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto bg-surface border border-border rounded shadow-lg text-xs text-text">
                      {rorSuggestions.map((item) => (
                        <div
                          key={item.id}
                          className="p-2 hover:bg-black/5 cursor-pointer border-b border-black/5 last:border-0 text-left"
                          onMouseDown={() => {
                            setAffiliation(item.name);
                            setRorId(item.id);
                            setShowRorSuggestions(false);
                          }}
                        >
                          <strong>{item.name}</strong>
                          <span className="block text-[8px] text-zinc-500 font-mono">{item.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                  ROR ID
                </label>
                <div className="relative">
                  <Fingerprint className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary/50" />
                  <input
                    type="text"
                    readOnly
                    value={rorId}
                    className="w-full pl-9 pr-3 py-2 border border-border text-text-secondary rounded text-sm bg-bg-alt cursor-not-allowed focus:outline-none"
                    placeholder="Selected institution's ROR ID"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-bg-alt text-text-secondary border border-border text-xs font-semibold rounded hover:bg-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-semibold rounded shadow transition-colors hover:bg-primary-hover"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
