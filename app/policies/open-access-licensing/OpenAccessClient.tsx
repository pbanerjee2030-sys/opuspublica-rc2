'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Shield, 
  FileText, 
  Share2, 
  Users, 
  Coins, 
  Bookmark, 
  Archive,
  ArrowLeft
} from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

const policySections = [
  { id: 'commitment', title: 'Commitment to Open Access', icon: Shield },
  { id: 'license', title: 'Creative Commons License', icon: FileText },
  { id: 'permits', title: 'What CC BY 4.0 Permits', icon: Share2 },
  { id: 'author-rights', title: 'Author Rights & Copyright', icon: Users },
  { id: 'apc', title: 'Article Processing Charges', icon: Coins },
  { id: 'per-journal', title: 'Per-Journal Licensing', icon: Bookmark },
  { id: 'archiving', title: 'Archiving & Repository Deposit', icon: Archive }
];

export default function OpenAccessClient() {
  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white flex flex-col">
      <div className="h-16"></div>

      <main className="flex-grow bg-[#1A1A2E]">
        {/* Header Section */}
        <section className="py-12 sm:py-16 bg-[#1A1A2E] border-b border-[#C9A84C]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-[#C9A84C] hover:text-[#D4AF37] mb-6 text-sm transition-colors group font-medium"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4">
                <FileText className="w-12 h-12 text-[#C9A84C]" />
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#C9A84C] font-bold">
                    Open Access & Licensing Policy
                  </h1>
                  <p className="text-white/60 text-sm mt-1">
                    Opus Publica — the publishing arm of Advocacy Unified Network
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12 bg-[#F5F0E8] text-[#1A1A2E]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar Navigation */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 bg-white rounded-lg p-6 shadow-sm border-l-4 border-[#C9A84C] max-h-[calc(100vh-120px)] overflow-y-auto">
                  <h3 className="text-[#8B1A1A] font-serif text-lg font-semibold mb-4">
                    On This Page
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {policySections.map((section) => (
                      <li key={section.id}>
                        <Link
                          href={`#${section.id}`}
                          className="text-[#1A1A2E]/70 hover:text-[#8B1A1A] transition-colors block py-1 border-b border-[#1A1A2E]/5"
                        >
                          {section.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-lg p-8 shadow-sm"
                >
                  <div className="prose prose-lg max-w-none prose-headings:text-[#8B1A1A] prose-headings:font-serif prose-a:text-[#C9A84C] prose-a:no-underline hover:prose-a:underline">
                    
                    {/* Section 1: Our Commitment to Open Access */}
                    <div id="commitment" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          Our Commitment to Open Access
                        </h2>
                      </div>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        All research articles published by Opus Publica are immediately, freely, and permanently
                        available to read, without subscription, paywall, or registration. We believe public policy
                        research is most valuable when it can be read, shared, and built upon by the widest
                        possible audience — including the policymakers, advocates, and communities it
                        concerns.
                      </p>
                    </div>

                    {/* Section 2: License */}
                    <div id="license" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          License
                        </h2>
                      </div>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        Unless otherwise stated on a specific journal's page, all articles published by Opus
                        Publica are distributed under the <strong>Creative Commons Attribution 4.0 International
                        License (CC BY 4.0)</strong>.
                      </p>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        The full legal text of this license is available at:{' '}
                        <a 
                          href="https://creativecommons.org/licenses/by/4.0/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#C9A84C] hover:underline"
                        >
                          https://creativecommons.org/licenses/by/4.0/
                        </a>
                      </p>
                    </div>

                    {/* Section 3: What CC BY 4.0 Permits */}
                    <div id="permits" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Share2 className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          What CC BY 4.0 Permits
                        </h2>
                      </div>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        Under this license, anyone is free to:
                      </p>
                      <ul className="list-disc pl-6 space-y-2 text-[#1A1A2E]/80 font-serif">
                        <li>
                          <strong>Share</strong> — copy and redistribute the material in any medium or format
                        </li>
                        <li>
                          <strong>Adapt</strong> — remix, transform, and build upon the material for any purpose, including commercially
                        </li>
                      </ul>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif mt-4">
                        The only requirement is <strong>attribution</strong>: you must give appropriate credit to the original
                        author(s), provide a link to the license, and indicate if changes were made. This can be
                        done in any reasonable manner, but not in any way that suggests the author or Opus
                        Publica endorses you or your use.
                      </p>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        No additional restrictions may be applied that would prevent others from exercising the
                        rights the license grants.
                      </p>
                    </div>

                    {/* Section 4: Author Rights */}
                    <div id="author-rights" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Users className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          Author Rights
                        </h2>
                      </div>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        Authors who publish with Opus Publica retain full copyright of their work. By
                        submitting, authors grant Opus Publica a non-exclusive license to publish the work
                        under the terms above; authors remain free to also publish their own work elsewhere,
                        deposit it in institutional or subject repositories, or share it freely, provided the published
                        version and its DOI are appropriately cited.
                      </p>
                    </div>

                    {/* Section 5: Article Processing Charges */}
                    <div id="apc" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Coins className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          Article Processing Charges
                        </h2>
                      </div>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        Opus Publica is a Diamond Open Access publisher. We charge no fees to 
                        authors at any stage of the publication process — no submission fee, no 
                        article processing charge (APC), and no fee upon acceptance or 
                        publication. Readers likewise access all published content free of 
                        charge, with no subscription or paywall. Publication costs are covered 
                        by Advocacy Unified Network, not by authors or readers.
                      </p>
                    </div>

                    {/* Section 6: Per-Journal Licensing */}
                    <div id="per-journal" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Bookmark className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          Per-Journal Licensing
                        </h2>
                      </div>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        Each Opus Publica journal displays its specific license and this policy on its own "Aims &
                        Scope" page. In the rare case a journal uses different licensing terms than CC BY 4.0, that
                        journal's own page will state so explicitly; this page reflects the standard, default policy
                        across the publishing house.
                      </p>
                    </div>

                    {/* Section 7: Archiving */}
                    <div id="archiving" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Archive className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          Archiving
                        </h2>
                      </div>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        Authors are encouraged to deposit the published version of their article (with DOI) in
                        their institution's repository or a subject-specific repository such as SSRN, immediately
                        upon publication, consistent with the terms of the CC BY license.
                      </p>
                      <hr className="my-8 border-[#1A1A2E]/10" />
                      <p className="text-sm text-[#1A1A2E]/60 italic font-serif leading-normal">
                        This policy is provided to comply with DOAJ, Crossref, and other indexing bodies'
                        requirements for a clear, stable statement of licensing terms.
                      </p>
                    </div>

                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
