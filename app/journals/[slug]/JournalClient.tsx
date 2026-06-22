'use client';

import { Journal } from '@/lib/data';
import Link from 'next/link';
import { ArrowLeft, FileDown, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

interface Props {
  journal: Journal;
}

export default function JournalClient({ journal }: Props) {
  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white flex flex-col">
      <Navbar />
      
      {/* Spacer for Fixed Navbar */}
      <div className="h-16"></div>

      <main className="flex-grow bg-[#1A1A2E]">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <Link
            href="/#journals"
            className="inline-flex items-center gap-2 text-[#C9A84C] hover:text-[#D4AF37] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Journals
          </Link>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1A1A2E] via-[#8B1A1A]/30 to-[#1A1A2E] py-20">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-10 right-20 w-96 h-96 rounded-full border-2 border-[#C9A84C]"></div>
            <div className="absolute bottom-10 left-20 w-64 h-64 rounded-full border-2 border-[#C9A84C]"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#C9A84C] mb-4">
                {journal.title}
              </h1>
              <p className="text-white/80 text-xl md:text-2xl max-w-3xl leading-relaxed">
                {journal.desc}
              </p>
              {journal.issn && (
                <p className="text-[#C9A84C]/70 text-sm mt-3 font-mono">
                  ISSN: {journal.issn}
                </p>
              )}
            </motion.div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 bg-[#F5F0E8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Description - 2/3 on desktop */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-2xl font-serif text-[#8B1A1A] mb-4 font-semibold">About This Journal</h2>
                  <div className="text-[#1A1A2E]/80 leading-relaxed space-y-4 text-base sm:text-lg">
                    <p>{journal.fullDescription}</p>
                  </div>
                </motion.div>
              </div>

              {/* Focus Areas - 1/3 on desktop */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-[#C9A84C]"
                >
                  <h3 className="text-[#8B1A1A] font-serif text-xl mb-4 font-semibold">Focus Areas</h3>
                  <ul className="space-y-3">
                    {journal.focusAreas.map((area, index) => (
                      <li key={index} className="flex items-start gap-3 text-[#1A1A2E]/80">
                        <CheckCircle className="w-5 h-5 text-[#C9A84C] flex-shrink-0 mt-0.5" />
                        <span className="text-sm sm:text-base">{area}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>

            {/* PDF Download Section (Conditional) */}
            {journal.hasPDF && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-12 p-6 bg-[#1A1A2E] rounded-lg border border-[#C9A84C]/30 shadow-lg"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[#C9A84C] font-serif text-xl mb-2">Featured Content</h3>
                    <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                      {journal.featuredContent}
                    </p>
                  </div>
                  <a
                    href={journal.pdfPath}
                    download
                    className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#1A1A2E] font-semibold rounded-lg transition-all transform hover:scale-105 shadow-md shadow-[#C9A84C]/10"
                  >
                    <FileDown className="w-5 h-5" />
                    Download Full Journal (PDF)
                  </a>
                </div>
              </motion.div>
            )}

            {/* Call to Action */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-12 text-center"
            >
              <a
                href="#"
                className="inline-block px-8 py-3 border-2 border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#1A1A2E] font-semibold rounded-lg transition-all transform hover:scale-105"
              >
                {journal.callToAction || 'Explore This Journal'}
              </a>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
