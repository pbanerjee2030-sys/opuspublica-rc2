'use client';

import Link from 'next/link';
import { Mail } from 'lucide-react';
import CookieSettingsButton from './CookieSettingsButton';

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/journals', label: 'Journals' },
  { href: '/books', label: 'Books' },
  { href: '/#about', label: 'About' },
  { href: '/#contact', label: 'Contact' },
];

const legalLinks = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/cookies', label: 'Cookie Policy' },
  { href: '/policies/corrections-and-retractions', label: 'Corrections Policy' },
  { href: '/policies/research-ethics', label: 'Research Ethics' },
  { href: '/policies/open-access-licensing', label: 'Open Access & Licensing' },
  { href: '/policies/instructions-for-authors', label: 'Instructions for Authors' },
];

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
