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

  // Helper to format authors to APA standard: "LastName, I. M."
  const formatAuthorAPA = (fullName: string) => {
    const name = fullName.trim();
    if (!name) return '';
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0];
    const lastName = parts[parts.length - 1];
    // Gather initials of all but the last name
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
    
    // Return citation string. Note: Journal title is typically italicised in APA.
    // For copyable text, we return plain text, but we render it nicely with italics in the UI.
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
    <div className="bg-white rounded-lg border border-[#1A1A2E]/10 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[#8B1A1A] font-serif font-semibold mb-3">
        <Info className="w-5 h-5" />
        <h4 className="text-lg">How to Cite</h4>
      </div>

      <div className="bg-[#F5F0E8]/50 border border-[#1A1A2E]/5 rounded p-4 text-[#1A1A2E]/80 text-sm font-mono leading-relaxed mb-4 select-all">
        {authorsStr} ({year}). {title.endsWith('.') ? title : title + '.'}{' '}
        <span className="italic">{journalTitle}</span>.
      </div>

      <button
        onClick={handleCopy}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A2E] hover:bg-[#8B1A1A] text-white font-medium text-sm rounded shadow transition-colors duration-200"
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
