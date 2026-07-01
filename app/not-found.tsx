import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0D0D11] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-6">
        <FileQuestion className="w-16 h-16 text-zinc-600 mx-auto" />
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-bold text-white">Page Not Found</h2>
          <p className="text-sm text-zinc-400">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#0D0D11] font-bold text-sm rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
