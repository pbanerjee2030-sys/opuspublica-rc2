import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import Navbar from '@/components/Navbar';
import { getServerUserAndProfile } from '@/lib/supabaseServer';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Opus Publica | Global Public Policy Research & Publishing',
  description: 'Leading global platform for public policy research, academic journals, and book publishing.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getServerUserAndProfile();

  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        <Navbar initialUser={user} initialProfile={profile} />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
