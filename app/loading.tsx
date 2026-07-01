import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0D0D11] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 text-[#C9A84C] animate-spin mx-auto" />
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}
