import Image from 'next/image';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0F2C4A] flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <Image
          src="/opus-publica-logo.png"
          alt="Opus Publica Logo"
          width={1024}
          height={682}
          className="object-contain rounded-2xl shadow-2xl"
          style={{ width: 'auto', height: '72px' }}
        />
        <div className="font-serif font-bold text-2xl tracking-widest">
          <span className="text-[#C9A84C]">OPUS</span> PUBLICA
        </div>
        <p className="text-[11px] font-semibold tracking-widest text-[#C9A84C] uppercase border-t border-b border-[#C9A84C]/30 py-1 px-4">
          Knowledge. Published. Impact. Enduring.
        </p>
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-white/60">
        <div className="w-2 h-2 rounded-full bg-[#C9A84C] animate-ping" />
        <span>Initializing Opus Publica Platform...</span>
      </div>
    </div>
  );
}
