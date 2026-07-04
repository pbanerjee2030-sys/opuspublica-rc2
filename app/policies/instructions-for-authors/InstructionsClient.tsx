'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  FileText, 
  CheckSquare, 
  FileEdit, 
  Send, 
  Clock, 
  Coins, 
  HelpCircle,
  ArrowLeft
} from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

const policySections = [
  { id: 'before-submit', title: 'Before You Submit', icon: CheckSquare },
  { id: 'format', title: 'Manuscript Format', icon: FileEdit },
  { id: 'submission', title: 'Submission Process', icon: Send },
  { id: 'after-submission', title: 'What Happens After Submission', icon: Clock },
  { id: 'fees', title: 'Fees & APCs', icon: Coins },
  { id: 'questions', title: 'Questions', icon: HelpCircle }
];

export default function InstructionsClient() {
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
                    Instructions for Authors
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
                    
                    {/* Section 1: Before You Submit */}
                    <div id="before-submit" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckSquare className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          Before You Submit
                        </h2>
                      </div>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        Opus Publica welcomes original research articles, policy analyses, and scholarly
                        perspectives across our journals. Before submitting, please confirm:
                      </p>
                      <ul className="list-disc pl-6 space-y-2 text-[#1A1A2E]/80 font-serif">
                        <li>The manuscript has not been previously published, and is not under consideration elsewhere</li>
                        <li>All listed authors have approved the final version and agree to its submission</li>
                        <li>
                          The manuscript complies with our{' '}
                          <Link href="/policies/research-ethics" className="text-[#C9A84C] hover:underline font-semibold">
                            Research Ethics &amp; Misconduct Policy
                          </Link>
                        </li>
                        <li>Any funding sources and conflicts of interest are disclosed</li>
                      </ul>
                    </div>

                    {/* Section 2: Manuscript Format */}
                    <div id="format" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <FileEdit className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          Manuscript Format
                        </h2>
                      </div>
                      <ul className="list-disc pl-6 space-y-4 text-[#1A1A2E]/80 font-serif">
                        <li>
                          <strong>File format</strong>: Microsoft Word (.doc/.docx) or RTF
                        </li>
                        <li>
                          <strong>Length</strong>: Typically 4,000–8,000 words for research articles, excluding references;
                          contact the editorial office if your submission falls outside this range for a valid reason
                        </li>
                        <li>
                          <strong>Spacing and font</strong>: Single-spaced, 12-point standard font (e.g., Times New Roman or equivalent)
                        </li>
                        <li>
                          <strong>Structure</strong>: Title, abstract (200–250 words), 4–6 keywords, main text, references.
                          Include author name(s), affiliation(s), and ORCID iD(s) on a separate title page or
                          in the submission form — not in the main manuscript file, to support anonymous peer review
                        </li>
                        <li>
                          <strong>Citations</strong>: Use a consistent, recognized citation style (APA, Chicago, or Harvard)
                          throughout; ensure all in-text citations correspond to a full reference list entry and vice versa
                        </li>
                        <li>
                          <strong>Figures and tables</strong>: Numbered sequentially, referenced in the text, with clear
                          captions; place at the appropriate point in the text or at the end with clear placement markers
                        </li>
                      </ul>
                    </div>

                    {/* Section 3: Submission Process */}
                    <div id="submission" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Send className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          Submission Process
                        </h2>
                      </div>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        Manuscripts are submitted directly through the relevant journal's page on this site, via
                        the "Submit" function, which requires a free author account. The submission form will
                        ask for:
                      </p>
                      <ul className="list-disc pl-6 space-y-2 text-[#1A1A2E]/80 font-serif">
                        <li>Manuscript file (PDF or Word)</li>
                        <li>Title, abstract, and keywords</li>
                        <li>All author names, affiliations, and ORCID iDs (where available)</li>
                        <li>Co-author details, if applicable</li>
                        <li>Funding information, if applicable</li>
                        <li>A brief cover note to the editor (optional but encouraged)</li>
                      </ul>
                    </div>

                    {/* Section 4: What Happens After Submission */}
                    <div id="after-submission" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Clock className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          What Happens After Submission
                        </h2>
                      </div>
                      <ol className="list-decimal pl-6 space-y-4 text-[#1A1A2E]/80 font-serif">
                        <li>
                          <strong>Initial editorial check</strong> — the handling editor reviews the submission for scope fit and basic completeness
                        </li>
                        <li>
                          <strong>Peer review</strong> — manuscripts that pass initial check are sent for peer review, as
                          described in our{' '}
                          <Link href="/#journals" className="text-[#C9A84C] hover:underline font-semibold">
                            Peer Review Policy
                          </Link>, typically taking 4–6 weeks
                        </li>
                        <li>
                          <strong>Decision</strong> — accept, minor revisions, major revisions, or reject, communicated to the corresponding author
                        </li>
                        <li>
                          <strong>Revision (if applicable)</strong> — authors are given a reasonable period to address reviewer and editor feedback
                        </li>
                        <li>
                          <strong>Production and publication</strong> — accepted manuscripts are copyedited, assigned a
                          DOI, and published under our{' '}
                          <Link href="/policies/open-access-licensing" className="text-[#C9A84C] hover:underline font-semibold">
                            Open Access &amp; Licensing Policy
                          </Link>
                        </li>
                      </ol>
                    </div>

                    {/* Section 5: Fees */}
                    <div id="fees" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Coins className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          Fees
                        </h2>
                      </div>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        Opus Publica is a Diamond Open Access publisher. There are no submission fees, no
                        article processing charges, and no publication fees at any stage.
                      </p>
                    </div>

                    {/* Section 6: Questions */}
                    <div id="questions" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <HelpCircle className="w-6 h-6 text-[#8B1A1A]" />
                        <h2 className="text-xl sm:text-2xl font-serif text-[#8B1A1A] font-bold !m-0">
                          Questions
                        </h2>
                      </div>
                      <p className="text-base sm:text-lg text-[#1A1A2E]/80 leading-relaxed font-serif">
                        For questions about a submission, formatting, or the review process, please contact the
                        relevant journal's editorial team, or write to us at{' '}
                        <a href="mailto:editorial@opuspublica.com" className="text-[#C9A84C] hover:underline font-semibold">
                          editorial@opuspublica.com
                        </a>.
                      </p>
                      <hr className="my-8 border-[#1A1A2E]/10" />
                      <p className="text-sm text-[#1A1A2E]/60 italic font-serif leading-normal">
                        These instructions apply across all Opus Publica journals. A specific journal's page may
                        note additional or different requirements where applicable.
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
