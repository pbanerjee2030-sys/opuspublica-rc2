'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function JournalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-6">
        <AlertTriangle className="w-16 h-16 text-primary mx-auto" />
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-bold text-primary">Journal Error</h2>
          <p className="text-sm text-text-secondary/70">
            Unable to load this journal. Please try again.
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 bg-accent hover:bg-accent-hover text-text font-bold text-sm rounded-lg transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-border hover:border-accent/50 text-text-secondary hover:text-text text-sm font-semibold rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
