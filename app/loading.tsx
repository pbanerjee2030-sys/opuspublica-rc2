import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto" />
        <p className="text-text-secondary text-sm">Loading...</p>
      </div>
    </div>
  );
}
