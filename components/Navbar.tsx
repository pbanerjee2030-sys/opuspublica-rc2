'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const navLinks = [
  { href: '/#home', label: 'Home' },
  { href: '/#journals', label: 'Journals' },
  { href: '/#books', label: 'Books' },
  { href: '/#about', label: 'About' },
  { href: '/#contact', label: 'Contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed w-full z-50 bg-[#1A1A2E]/90 backdrop-blur-md border-b border-[#C9A84C]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/#home" className="flex items-center gap-2 group">
            <Image
              src="/OpusPublica%20icon.png"
              alt="Opus Publica Icon"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="text-[#C9A84C] font-bold text-2xl font-serif tracking-wider group-hover:text-white transition-colors">OPUS</span>
            <span className="text-white font-bold text-2xl font-serif tracking-wider group-hover:text-[#C9A84C] transition-colors">PUBLICA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/80 hover:text-[#C9A84C] transition-colors text-sm uppercase tracking-wider"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white hover:text-[#C9A84C] transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#1A1A2E] border-b border-[#C9A84C]/20">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-white/80 hover:text-[#C9A84C] transition-colors text-sm uppercase tracking-wider py-2"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
