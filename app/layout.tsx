import type { Metadata } from 'next';
import { Newsreader, Source_Serif_4, Inter } from 'next/font/google';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import Navbar from '@/components/Navbar';
import { getServerUserAndProfile } from '@/lib/supabaseServer';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  weight: ['400', '600'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://opuspublica.com'),
  title: 'Opus Publica | Global Public Policy Research & Publishing',
  description: 'Knowledge. Published. Impact. Enduring. Leading global platform for public policy research, academic journals, and book publishing.',
  icons: {
    icon: "/opus-publica-new-favicon.ico",
    shortcut: "/opus-publica-new-favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: 'Opus Publica | Global Public Policy Research & Publishing',
    description: 'Knowledge. Published. Impact. Enduring. Leading global platform for public policy research, academic journals, and book publishing.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Opus Publica Logo' }],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getServerUserAndProfile();

  return (
    <html lang="en" className={`${newsreader.variable} ${sourceSerif.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        <Navbar initialUser={user} initialProfile={profile} />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
