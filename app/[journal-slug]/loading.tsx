import { Loader2 } from 'lucide-react';

export default function JournalLoading() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto" />
        <p className="text-text-secondary/70 text-sm">Loading journal...</p>
      </div>
    </div>
  );
}
