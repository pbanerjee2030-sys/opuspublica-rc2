'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Shield, 
  FileText, 
  Users, 
  BookOpen, 
  Scale, 
  Mail,
  ArrowLeft
} from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

const correctionsSections = [
  { id: 'commitment', title: 'Our Commitment', icon: Shield },
  { id: 'types', title: 'Types of Updates', icon: FileText },
  { id: 'handle', title: 'How We Handle Updates', icon: Users },
  { id: 'notified', title: 'How Readers Are Notified', icon: BookOpen },
  { id: 'policies', title: 'Related Policies', icon: Scale },
  { id: 'reporting', title: 'Reporting a Concern', icon: Mail }
];

export default function CorrectionsClient() {
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
                    Corrections, Retractions & Updates Policy
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
                    {correctionsSections.map((section) => (
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
                    
                    {/* Section 1: Our Commitment */}
                    <div id="commitment" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-6 h-6 text-[#C9A84C] flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-[#8B1A1A] m-0 font-semibold">
                          Our Commitment
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-[#C9A84C]/30">
                          Opus Publica is committed to maintaining the accuracy, integrity, and completeness of
                          the scholarly and editorial record across all of our journals and books. Research and
                          policy analysis do not stand still: after publication, new evidence, identified errors, or
                          ethical concerns can require us to correct, update, or in rare cases retract published
                          content. This page explains how we handle these situations and how readers can
                          determine whether a piece of content they are viewing — including a previously
                          downloaded copy — has changed since its original publication.
                        </p>
                        <p className="pl-4 border-l-2 border-[#C9A84C]/30">
                          Opus Publica participates in Crossmark, a service from Crossref that provides a standard
                          way for readers to check the current status of a piece of content. By applying the
                          Crossmark logo to our published articles, Opus Publica commits to maintaining the
                          content we publish and to alerting readers to changes if and when they occur. Clicking
                          the Crossmark logo on any article will show its current status and additional publication
                          record information.
                        </p>
                      </div>
                    </div>

                    {/* Section 2: Types of Updates */}
                    <div id="types" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-6 h-6 text-[#C9A84C] flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-[#8B1A1A] m-0 font-semibold">
                          Types of Updates
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-[#C9A84C]/30">
                          We classify post-publication updates using the following categories, consistent with
                          Committee on Publication Ethics (COPE) guidelines:
                        </p>
                        <div className="pl-4 border-l-2 border-[#C9A84C]/30 space-y-4 pt-2">
                          <p>
                            <strong>Correction (Erratum/Corrigendum)</strong> A correction is issued when an error has been
                            identified in a published work that does not undermine the overall validity or
                            conclusions of the piece, but that should nonetheless be fixed in the scholarly record —
                            for example, an author affiliation error, a data transcription error, or a citation error.
                            Corrections are published as a separate, linked notice; the original article remains
                            available alongside it.
                          </p>
                          <p>
                            <strong>Retraction</strong> A retraction is issued when the integrity of a published work is seriously
                            compromised — for example, due to research misconduct, plagiarism, duplicate
                            publication, major undisclosed conflicts of interest, or fundamental errors that invalidate
                            the work's conclusions. A retraction notice is published, clearly linked to the original
                            article, and the original article's title and record are updated to indicate its retracted
                            status. The original article is not deleted; the scholarly record is preserved with its status
                            clearly marked.
                          </p>
                          <p>
                            <strong>Expression of Concern</strong> An expression of concern is issued when credible concerns have
                            been raised about a published work — for example, a pending institutional investigation —
                            but the matter has not yet been fully resolved. This signals to readers that caution is
                            warranted while the concern is investigated, without prejudging the outcome.
                          </p>
                          <p>
                            <strong>Withdrawal</strong> A withdrawal applies to content removed prior to formal publication in a
                            journal issue — for example, an article withdrawn during the production process due to a
                            serious error discovered before it reaches its final published state.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: How We Handle Updates */}
                    <div id="handle" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Users className="w-6 h-6 text-[#C9A84C] flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-[#8B1A1A] m-0 font-semibold">
                          How We Handle Updates
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-[#C9A84C]/30">
                          In keeping with best practice, and in order to preserve a clear and complete scholarly
                          record, Opus Publica does not silently edit published content (&quot;in situ&quot; changes). Instead:
                        </p>
                        <ul className="list-none space-y-3 pl-4 border-l-2 border-[#C9A84C]/30 m-0">
                          <li className="relative pl-6 before:content-['•'] before:absolute before:left-0 before:text-[#C9A84C] before:font-bold">
                            A separate notice (correction, retraction, expression of concern, or withdrawal) is
                            published, with its own persistent identifier
                          </li>
                          <li className="relative pl-6 before:content-['•'] before:absolute before:left-0 before:text-[#C9A84C] before:font-bold">
                            The notice is explicitly linked to the original article, and the original article's record
                            is updated to reference the notice
                          </li>
                          <li className="relative pl-6 before:content-['•'] before:absolute before:left-0 before:text-[#C9A84C] before:font-bold">
                            The decision to issue any of the above is made by the relevant journal's Editor-in-Chief, in consultation with the editorial board and, where appropriate, the
                            author(s), following our <Link href="/policies/research-ethics" className="text-[#C9A84C] font-semibold hover:underline">Research Ethics &amp; Misconduct Policy</Link> and COPE
                            guidelines
                          </li>
                          <li className="relative pl-6 before:content-['•'] before:absolute before:left-0 before:text-[#C9A84C] before:font-bold">
                            Minor, non-substantive corrections that do not affect interpretation, crediting, or
                            conclusions (for example, a formatting fix or a typographical correction that
                            changes no data or meaning) may be corrected directly without a separate notice,
                            consistent with standard practice
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Section 4: How Readers Are Notified */}
                    <div id="notified" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <BookOpen className="w-6 h-6 text-[#C9A84C] flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-[#8B1A1A] m-0 font-semibold">
                          How Readers Are Notified
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-[#C9A84C]/30">
                          Every article we publish displays a Crossmark badge. Clicking it will show whether the
                          article has been updated since original publication, and will link directly to any
                          correction, retraction, or expression of concern notice associated with it. We apply this to
                          all published content, not only content that has since been updated, so that a reader can
                          always check current status regardless of when or how they accessed the article.
                        </p>
                      </div>
                    </div>

                    {/* Section 5: Related Policies */}
                    <div id="policies" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Scale className="w-6 h-6 text-[#C9A84C] flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-[#8B1A1A] m-0 font-semibold">
                          Related Policies
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-[#C9A84C]/30">
                          This page works alongside our other editorial policies, which govern the standards this
                          policy exists to protect:
                        </p>
                        <ul className="list-none space-y-3 pl-4 border-l-2 border-[#C9A84C]/30 m-0">
                          <li className="relative pl-6 before:content-['•'] before:absolute before:left-0 before:text-[#C9A84C] before:font-bold">
                            Peer Review Policy (per journal — see each journal's &quot;Aims &amp; Scope&quot; page)
                          </li>
                          <li className="relative pl-6 before:content-['•'] before:absolute before:left-0 before:text-[#C9A84C] before:font-bold">
                            <Link href="/policies/research-ethics" className="text-[#C9A84C] font-semibold hover:underline">Research Ethics &amp; Misconduct Policy</Link>
                          </li>
                          <li className="relative pl-6 before:content-['•'] before:absolute before:left-0 before:text-[#C9A84C] before:font-bold">
                            Author Agreement &amp; Copyright/Licensing Policy
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Section 6: Reporting a Concern */}
                    <div id="reporting" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Mail className="w-6 h-6 text-[#C9A84C] flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-[#8B1A1A] m-0 font-semibold">
                          Reporting a Concern
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-[#C9A84C]/30">
                          If you believe a published Opus Publica article, book, or chapter requires correction or
                          raises an integrity concern, please contact the relevant journal's editorial team, or write
                          to us directly at <a href="mailto:editorial@opuspublica.com" className="text-[#C9A84C] font-semibold hover:underline">editorial@opuspublica.com</a>. All concerns are reviewed following our <Link href="/policies/research-ethics" className="text-[#C9A84C] font-semibold hover:underline">Research Ethics &amp; Misconduct Policy</Link>.
                        </p>
                        <p className="pl-4 border-l-2 border-[#C9A84C]/30 italic text-sm text-[#1A1A2E]/60 pt-4">
                          This policy is maintained by Opus Publica and registered with Crossref as our Crossmark
                          update policy statement.
                        </p>
                      </div>
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
