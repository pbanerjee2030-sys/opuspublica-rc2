'use client';

import { Settings } from 'lucide-react';

export default function CookieSettingsButton() {
  const handleClick = () => {
    const event = new CustomEvent('open-cookie-settings');
    window.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 text-white/40 hover:text-[#C9A84C] transition-colors text-sm cursor-pointer border-none bg-transparent p-0 font-sans"
    >
      <Settings className="w-4 h-4" />
      Cookie Settings
    </button>
  );
}
