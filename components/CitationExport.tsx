'use client';

import { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { toBibTeX, toRIS, toEndNote, type CitationData } from '@/lib/citation-export';

interface CitationExportProps {
  title: string;
  authors: string[];
  journalTitle: string;
  publishDate: string;
  doi?: string | null;
  abstract?: string | null;
}

export default function CitationExport({ title, authors, journalTitle, publishDate, doi, abstract }: CitationExportProps) {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const citationData: CitationData = {
    title,
    authors,
    journalName: journalTitle,
    publishDate,
    doi,
    abstract,
  };

  const formatAPA = () => {
    const year = new Date(publishDate).getFullYear();
    const authorStr = authors.map(a => {
      const parts = a.split(' ');
      const last = parts.pop() || '';
      const initials = parts.map(p => p[0] + '.').join(' ');
      return `${last}, ${initials}`;
    }).join(', ');
    return `${authorStr} (${year}). ${title}. *${journalTitle}*. ${doi ? `https://doi.org/${doi}` : ''}`.trim();
  };

  const handleCopy = async (format: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (err) {
      console.error('Failed to copy citation:', err);
    }
  };

  const formats = [
    { name: 'APA', content: formatAPA() },
    { name: 'BibTeX', content: toBibTeX(citationData) },
    { name: 'RIS', content: toRIS(citationData) },
    { name: 'EndNote', content: toEndNote(citationData) },
  ];

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm border border-black/5">
      <h3 className="text-[#1A1A2E] font-serif text-lg font-semibold mb-3">
        Cite this article
      </h3>
      <div className="space-y-2">
        {formats.map((fmt) => (
          <div key={fmt.name} className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#1A1A2E]/60 w-14">{fmt.name}</span>
            <button
              onClick={() => handleCopy(fmt.name, fmt.content)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-[#8B1A1A]/20 text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
            >
              {copiedFormat === fmt.name ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy {fmt.name}
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
