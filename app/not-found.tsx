import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-6">
        <FileQuestion className="w-16 h-16 text-text-secondary/60 mx-auto" />
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-bold text-primary">Page Not Found</h2>
          <p className="text-sm text-text-secondary">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 text-accent hover:underline font-bold text-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
