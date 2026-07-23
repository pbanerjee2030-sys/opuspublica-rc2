'use client';

import React, { useState } from 'react';
import { Copy, Check, Info } from 'lucide-react';

interface CitationBoxProps {
  title: string;
  authors: string[];
  journalTitle: string;
  publishDate: string;
}

export default function CitationBox({ title, authors, journalTitle, publishDate }: CitationBoxProps) {
  const [copied, setCopied] = useState(false);

  const formatAuthorAPA = (fullName: string) => {
    const name = fullName.trim();
    if (!name) return '';
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0];
    const lastName = parts[parts.length - 1];
    const initials = parts
      .slice(0, parts.length - 1)
      .map((p) => `${p[0] || ''}.`)
      .join(' ');
    return `${lastName}, ${initials}`;
  };

  const getAPACitation = () => {
    if (authors.length === 0) {
      authors = ['Anonymous'];
    }
    const formattedAuthors = authors.map(formatAuthorAPA);
    let authorsStr = '';

    if (formattedAuthors.length === 1) {
      authorsStr = formattedAuthors[0];
    } else if (formattedAuthors.length === 2) {
      authorsStr = `${formattedAuthors[0]} & ${formattedAuthors[1]}`;
    } else if (formattedAuthors.length > 2) {
      authorsStr = `${formattedAuthors.slice(0, -1).join(', ')}, & ${formattedAuthors[formattedAuthors.length - 1]}`;
    }

    const year = publishDate ? new Date(publishDate).getFullYear() : new Date().getFullYear();

    return `${authorsStr} (${year}). ${title.endsWith('.') ? title : title + '.'} ${journalTitle}.`;
  };

  const handleCopy = async () => {
    try {
      const citationText = getAPACitation();
      await navigator.clipboard.writeText(citationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const year = publishDate ? new Date(publishDate).getFullYear() : new Date().getFullYear();
  const formattedAuthors = authors.map(formatAuthorAPA);
  let authorsStr = '';
  if (formattedAuthors.length === 1) {
    authorsStr = formattedAuthors[0];
  } else if (formattedAuthors.length === 2) {
    authorsStr = `${formattedAuthors[0]} & ${formattedAuthors[1]}`;
  } else if (formattedAuthors.length > 2) {
    authorsStr = `${formattedAuthors.slice(0, -1).join(', ')}, & ${formattedAuthors[formattedAuthors.length - 1]}`;
  }

  return (
    <div className="bg-surface rounded-lg border border-border p-5">
      <div className="flex items-center gap-2 text-accent font-serif font-semibold mb-3">
        <Info className="w-5 h-5" />
        <h4 className="text-lg">How to Cite</h4>
      </div>

      <div className="bg-bg-alt border border-border rounded p-4 text-text-secondary text-sm font-mono leading-relaxed mb-4 select-all">
        {authorsStr} ({year}). {title.endsWith('.') ? title : title + '.'}{' '}
        <span className="italic">{journalTitle}</span>.
      </div>

      <button
        onClick={handleCopy}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium text-sm rounded transition-colors duration-200"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-400" />
            Copied to Clipboard!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy APA Citation
          </>
        )}
      </button>
    </div>
  );
}
