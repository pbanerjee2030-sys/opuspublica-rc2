'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Shield, 
  Users, 
  FileText, 
  BookOpen, 
  Scale, 
  Mail,
  ArrowLeft
} from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

const ethicsSections = [
  { id: 'purpose', title: 'Purpose', icon: Shield },
  { id: 'authorship', title: 'Authorship', icon: Users },
  { id: 'originality', title: 'Originality and Plagiarism', icon: FileText },
  { id: 'duplicate', title: 'Duplicate Submission and Publication', icon: BookOpen },
  { id: 'integrity', title: 'Data Integrity', icon: Shield },
  { id: 'conflict', title: 'Conflicts of Interest', icon: Scale },
  { id: 'human', title: 'Human Subjects and Sensitive Data', icon: Users },
  { id: 'review', title: 'Peer Review Integrity', icon: BookOpen },
  { id: 'handled', title: 'How Concerns Are Handled', icon: Shield },
  { id: 'reporting', title: 'Reporting a Concern', icon: Mail }
];

export default function ResearchEthicsClient() {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <div className="h-16"></div>

      <main className="flex-grow bg-bg">
        {/* Header Section */}
        <section className="py-12 sm:py-16 bg-bg border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-accent hover:text-accent mb-6 text-sm transition-colors group font-medium"
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
                <Shield className="w-12 h-12 text-accent" />
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-primary font-bold">
                    Research Ethics &amp; Misconduct Policy
                  </h1>
                  <p className="text-text-secondary/70 text-sm mt-1">
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
                <div className="sticky top-24 bg-white rounded-lg p-6 shadow-sm border-l-4 border-accent max-h-[calc(100vh-120px)] overflow-y-auto">
                  <h3 className="text-primary font-serif text-lg font-semibold mb-4">
                    On This Page
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {ethicsSections.map((section) => (
                      <li key={section.id}>
                        <Link
                          href={`#${section.id}`}
                          className="text-[#1A1A2E]/70 hover:text-primary transition-colors block py-1 border-b border-[#1A1A2E]/5"
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
                  <div className="prose prose-lg max-w-none prose-headings:text-primary prose-headings:font-serif prose-a:text-accent prose-a:no-underline hover:prose-a:underline">
                    
                    {/* Section 1: Purpose */}
                    <div id="purpose" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-6 h-6 text-accent flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-primary m-0 font-semibold">
                          Purpose
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-accent/30">
                          This policy sets out the standards of research and publication ethics that Opus Publica
                          expects of authors, reviewers, and editors across all of our journals, and the process we
                          follow when concerns are raised. It is aligned with the guidelines of the Committee on
                          Publication Ethics (COPE).
                        </p>
                      </div>
                    </div>

                    {/* Section 2: Authorship */}
                    <div id="authorship" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Users className="w-6 h-6 text-accent flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-primary m-0 font-semibold">
                          Authorship
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-accent/30">
                          Authorship should be limited to those who have made a significant intellectual
                          contribution to the conception, design, execution, or interpretation of the work. All listed
                          authors must agree to be listed and must have approved the final submitted version.
                          Anyone who contributed to the work but does not meet authorship criteria should be
                          named in an acknowledgements section instead. Changes to authorship after
                          submission (adding, removing, or reordering authors) must be approved in writing by all
                          original authors and by the handling editor.
                        </p>
                      </div>
                    </div>

                    {/* Section 3: Originality and Plagiarism */}
                    <div id="originality" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-6 h-6 text-accent flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-primary m-0 font-semibold">
                          Originality and Plagiarism
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-accent/30">
                          Submitted work must be original and must not be substantially reproduced from the
                          author's own prior publications (self-plagiarism) or from the work of others without full,
                          clear attribution. Direct quotation must be clearly marked and cited. Authors are
                          responsible for securing any necessary permissions for material reproduced from other
                          copyrighted sources.
                        </p>
                      </div>
                    </div>

                    {/* Section 4: Duplicate Submission and Publication */}
                    <div id="duplicate" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <BookOpen className="w-6 h-6 text-accent flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-primary m-0 font-semibold">
                          Duplicate Submission and Publication
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-accent/30">
                          Manuscripts submitted to an Opus Publica journal must not be under simultaneous
                          consideration elsewhere, and must not have been previously published in substantially
                          the same form. Authors who wish to build on their own previously published work must
                          disclose this at submission and clearly differentiate the new contribution.
                        </p>
                      </div>
                    </div>

                    {/* Section 5: Data Integrity */}
                    <div id="integrity" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-6 h-6 text-accent flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-primary m-0 font-semibold">
                          Data Integrity
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-accent/30">
                          Authors are responsible for the accuracy of the data, sources, and evidence presented in
                          their work. Fabrication (reporting data or results that were not actually obtained) and
                          falsification (manipulating data or results to misrepresent findings) are serious
                          violations of research integrity and will result in rejection or, if discovered post-publication, retraction.
                        </p>
                      </div>
                    </div>

                    {/* Section 6: Conflicts of Interest */}
                    <div id="conflict" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Scale className="w-6 h-6 text-accent flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-primary m-0 font-semibold">
                          Conflicts of Interest
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-accent/30">
                          Authors, reviewers, and editors must disclose any financial, institutional, personal, or
                          political relationships that could reasonably be perceived to influence the work or its
                          evaluation. This includes funding sources, consulting relationships, and affiliations with
                          organizations that have a direct interest in the subject matter, which is of particular
                          relevance to policy-focused research and advocacy-adjacent scholarship. Undisclosed
                          material conflicts of interest, once identified, may result in a correction, an added
                          disclosure statement, or in serious cases a retraction.
                        </p>
                      </div>
                    </div>

                    {/* Section 7: Human Subjects and Sensitive Data */}
                    <div id="human" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Users className="w-6 h-6 text-accent flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-primary m-0 font-semibold">
                          Human Subjects and Sensitive Data
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-accent/30">
                          Where a submission involves research with human participants (for example, surveys,
                          interviews, or fieldwork), authors must confirm that appropriate informed consent was
                          obtained and that the research complied with applicable ethical review requirements in
                          the jurisdiction where it was conducted. Authors working with sensitive political,
                          security, or personally identifiable data are expected to take reasonable steps to protect
                          the safety and privacy of research subjects, particularly where publication could expose
                          individuals to risk.
                        </p>
                      </div>
                    </div>

                    {/* Section 8: Peer Review Integrity */}
                    <div id="review" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <BookOpen className="w-6 h-6 text-accent flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-primary m-0 font-semibold">
                          Peer Review Integrity
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-accent/30">
                          Reviewers are expected to evaluate submissions objectively, disclose any conflicts of
                          interest before accepting a review assignment, maintain the confidentiality of
                          unpublished work, and decline to use information obtained through review for personal
                          advantage. Editors are expected to make publication decisions based on the intellectual
                          merit of the work, independent of the authors' race, gender, nationality, religion, political
                          belief, or institutional affiliation.
                        </p>
                      </div>
                    </div>

                    {/* Section 9: How Concerns Are Handled */}
                    <div id="handled" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-6 h-6 text-accent flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-primary m-0 font-semibold">
                          How Concerns Are Handled
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-accent/30">
                          Concerns about a submitted or published work — including suspected plagiarism, data
                          fabrication, undisclosed conflicts of interest, authorship disputes, or other misconduct —
                          may be raised by readers, reviewers, editors, or authors themselves at any time, including
                          after publication.
                        </p>
                        <p className="pl-4 border-l-2 border-accent/30 font-semibold">
                          When a concern is raised:
                        </p>
                        <ol className="list-decimal space-y-3 pl-8 border-l-2 border-accent/30 m-0">
                          <li className="pl-2">
                            The relevant journal's Editor-in-Chief reviews the concern and determines
                            whether it warrants investigation
                          </li>
                          <li className="pl-2">
                            Where appropriate, the author(s) are given the opportunity to respond
                          </li>
                          <li className="pl-2">
                            The editorial board may consult COPE's guidance and flowcharts for the relevant
                            type of concern
                          </li>
                          <li className="pl-2">
                            Depending on the outcome, the result may be no action, a correction, an expression
                            of concern, or a retraction, in line with our <Link href="/policies/corrections-and-retractions" className="text-accent font-semibold hover:underline">Corrections, Retractions &amp; Updates Policy</Link>
                          </li>
                          <li className="pl-2">
                            In cases involving suspected serious misconduct, we may also contact the author's
                            institution, in line with COPE guidance
                          </li>
                        </ol>
                        <p className="pl-4 border-l-2 border-accent/30 pt-2">
                          We aim to handle all concerns fairly, confidentially where appropriate, and without
                          retaliation against those who raise them in good faith.
                        </p>
                      </div>
                    </div>

                    {/* Section 10: Reporting a Concern */}
                    <div id="reporting" className="mb-12 scroll-mt-24">
                      <div className="flex items-center gap-3 mb-4">
                        <Mail className="w-6 h-6 text-accent flex-shrink-0" />
                        <h2 className="text-2xl font-serif text-primary m-0 font-semibold">
                          Reporting a Concern
                        </h2>
                      </div>
                      <div className="space-y-4 text-[#1A1A2E]/80 leading-relaxed text-base">
                        <p className="pl-4 border-l-2 border-accent/30">
                          To raise a research integrity concern about an Opus Publica publication, please contact
                          the relevant journal's editorial team, or write to us directly at <a href="mailto:editorial@opuspublica.com" className="text-accent font-semibold hover:underline">editorial@opuspublica.com</a>.
                        </p>
                        <p className="pl-4 border-l-2 border-accent/30 italic text-sm text-[#1A1A2E]/60 pt-4">
                          This policy works alongside our <Link href="/policies/corrections-and-retractions" className="text-accent font-semibold hover:underline">Corrections, Retractions &amp; Updates Policy</Link>, our Peer
                          Review Policy (published per journal), and our Author Agreement &amp; Copyright/Licensing Policy.
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
