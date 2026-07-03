'use client';

import Link from 'next/link';
import { Mail } from 'lucide-react';
import CookieSettingsButton from './CookieSettingsButton';

const quickLinks = [
  { href: '/#home', label: 'Home' },
  { href: '/#journals', label: 'Journals' },
  { href: '/#books', label: 'Books' },
  { href: '/#about', label: 'About' },
  { href: '/#contact', label: 'Contact' },
];

const legalLinks = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/cookies', label: 'Cookie Policy' },
  { href: '/policies/corrections-and-retractions', label: 'Corrections Policy' },
  { href: '/policies/research-ethics', label: 'Research Ethics' },
];

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
    <polygon points="10 15 15 12 10 9" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-[#1A1A2E] border-t-2 border-[#C9A84C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1 - Logo */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[#C9A84C] font-bold text-2xl font-serif">OPUS</span>
              <span className="text-white font-bold text-2xl font-serif">PUBLICA</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Advancing knowledge through public policy research and publishing.
            </p>
            <p className="text-white/40 text-xs mt-2">
              An affiliate of Advocacy Unified Network
            </p>
          </div>

          {/* Column 2 - Quick Links */}
          <div>
            <h4 className="text-[#C9A84C] font-serif text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-white/60 hover:text-[#C9A84C] transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Connect */}
          <div>
            <h4 className="text-[#C9A84C] font-serif text-lg mb-4">Connect</h4>
            <a href="mailto:info@opuspublica.com" className="flex items-center gap-2 text-white/60 hover:text-[#C9A84C] transition-colors text-sm">
              <Mail className="w-4 h-4" />
              info@opuspublica.com
            </a>
            <div className="flex gap-4 mt-4">
              <a href="#" className="text-white/40 hover:text-[#C9A84C] transition-colors">
                <TwitterIcon className="w-5 h-5" />
              </a>
              <a href="#" className="text-white/40 hover:text-[#C9A84C] transition-colors">
                <LinkedinIcon className="w-5 h-5" />
              </a>
              <a href="#" className="text-white/40 hover:text-[#C9A84C] transition-colors">
                <YoutubeIcon className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} Opus Publica. All rights reserved.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-white/40 hover:text-[#C9A84C] transition-colors text-sm">
                {link.label}
              </Link>
            ))}
            <span className="text-white/20 hidden sm:inline">|</span>
            <CookieSettingsButton />
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-white/20 text-xs leading-relaxed max-w-3xl mx-auto">
            Opus Publica is a platform for academic publishing and research. All content is provided 
            for informational and educational purposes only. By using this website, you agree to our 
            <Link href="/terms" className="text-[#C9A84C]/40 hover:text-[#C9A84C] transition-colors mx-1">
              Terms of Service
            </Link>
            and
            <Link href="/privacy" className="text-[#C9A84C]/40 hover:text-[#C9A84C] transition-colors mx-1">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
