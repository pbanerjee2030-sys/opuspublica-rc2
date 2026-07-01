import { Loader2 } from 'lucide-react';

export default function JournalLoading() {
  return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 text-[#C9A84C] animate-spin mx-auto" />
        <p className="text-white/60 text-sm">Loading journal...</p>
      </div>
    </div>
  );
}
