'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  FileText, 
  Shield, 
  Users, 
  BookOpen, 
  Scale, 
  Gavel, 
  Mail, 
  Lock,
  AlertCircle
} from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

const termSections = [
  {
    id: 'definitions',
    title: '1. Definitions',
    icon: BookOpen,
    content: [
      '"Opus Publica" refers to the academic publishing platform, its website, publications, and affiliated services.',
      '"Services" includes, but is not limited to, website access, journal access, manuscript submission, peer review, publication services, event registration, and related academic services.',
      '"Content" refers to all articles, research papers, journals, books, reports, data, images, graphics, videos, and other materials published or made available through Opus Publica.',
      '"User" or "you" refers to any individual or entity accessing or using our Services.',
      '"Author" refers to any individual who submits manuscripts, articles, or other content for publication through Opus Publica.',
      '"Reader" refers to any individual who accesses, views, reads, or downloads Content from Opus Publica.',
      '"Institution" refers to any academic or research institution that subscribes to or partners with Opus Publica.',
      '"AUN" refers to Advocacy Unified Network, the affiliated parent organization.'
    ]
  },
  {
    id: 'acceptance',
    title: '2. Acceptance of Terms',
    icon: Shield,
    content: [
      'You have read, understood, and agree to be bound by these Terms.',
      'You are of legal age to form a binding contract in your jurisdiction.',
      'You have the authority to enter into these Terms on behalf of any organization you represent.',
      'Your use of our Services complies with applicable laws and regulations.'
    ]
  },
  {
    id: 'changes',
    title: '3. Changes to Terms',
    icon: FileText,
    content: [
      'Posting the updated Terms on our website',
      'Sending email notifications to registered users',
      'Displaying a notice on our platform',
      'Your continued use of our Services after the effective date of such changes constitutes acceptance of the modified Terms.',
      'If you do not agree to the modified Terms, you must discontinue use of our Services.'
    ]
  },
  {
    id: 'accounts',
    title: '4. User Accounts',
    icon: Users,
    subsections: [
      {
        title: '4.1 Account Registration',
        content: [
          'Provide accurate, current, and complete information',
          'Maintain and promptly update your information to keep it accurate',
          'Keep your password and account credentials confidential',
          'Notify us immediately of any unauthorized use of your account',
          'Accept responsibility for all activities that occur under your account'
        ]
      },
      {
        title: '4.2 Account Types',
        content: [
          'Reader Account - For accessing and reading content, saving articles, and receiving alerts',
          'Author Account - For submitting manuscripts, tracking submissions, and managing publications',
          'Reviewer Account - For conducting peer reviews and managing review assignments',
          'Editor Account - For managing editorial workflows, assignments, and editorial decisions',
          'Institutional Account - For managing institutional subscriptions and access'
        ]
      },
      {
        title: '4.3 Account Suspension and Termination',
        content: [
          'You violate these Terms',
          'You provide false or misleading information',
          'Your account is inactive for an extended period',
          'We reasonably believe your account has been compromised',
          'We are required to do so by law'
        ]
      }
    ]
  },
  {
    id: 'intellectual-property',
    title: '5. Intellectual Property Rights',
    icon: Scale,
    subsections: [
      {
        title: '5.1 Our Intellectual Property',
        content: [
          'Journal articles, research papers, reviews, and editorial content',
          'Website design, layout, and graphics',
          'Software, code, and databases',
          'Logos, trademarks, and branding materials',
          'Educational materials and resources'
        ]
      },
      {
        title: 'Prohibited Uses',
        content: [
          'Republish, redistribute, or sell our Content',
          'Use our Content for commercial purposes',
          'Modify, create derivative works from, or reverse engineer our Content',
          'Remove or alter any copyright, trademark, or other proprietary notices',
          'Use our trademarks, logos, or branding without authorization'
        ]
      },
      {
        title: '5.2 Author Intellectual Property',
        content: [
          'Authors retain the copyright to their submitted works subject to the terms of our publishing agreement.',
          'Publish, distribute, and promote the work',
          'Include the work in our databases and archives',
          'License the work to third parties for indexing, abstracting, and distribution',
          'Make the work available through open access or subscription models'
        ]
      },
      {
        title: '5.3 User-Generated Content',
        content: [
          'Display, reproduce, and distribute your content',
          'Modify and adapt your content as necessary',
          'Use your content for promotional and educational purposes'
        ]
      }
    ]
  },
  {
    id: 'publication-policies',
    title: '6. Publication Policies',
    icon: BookOpen,
    subsections: [
      {
        title: '6.1 Submission Guidelines',
        content: [
          'Originality - Submissions must be original and not simultaneously submitted elsewhere',
          'Plagiarism - All work must be properly cited; we use plagiarism detection software',
          'Ethical Standards - Research must comply with ethical standards and may require ethics approval',
          'Author Attribution - All listed authors must have made substantial contributions',
          'Conflicts of Interest - Authors must declare any conflicts of interest',
          'Funding Disclosure - Authors must disclose funding sources'
        ]
      },
      {
        title: '6.2 Peer Review Policy',
        content: [
          'Double-Blind Review - Reviewers and authors remain anonymous to each other (where applicable)',
          'Confidentiality - Reviewers must maintain confidentiality of all submissions',
          'Timeliness - Reviews are conducted within specified timeframes',
          'Objectivity - Reviews must be objective and constructive',
          'No Conflicts of Interest - Reviewers must recuse themselves in case of conflicts'
        ]
      },
      {
        title: '6.3 Publication Ethics',
        content: [
          'Rejection of submission',
          'Retraction of published articles',
          'Notification of institutional authorities',
          'Permanent prohibition of submissions',
          'Legal action where appropriate'
        ]
      },
      {
        title: '6.4 Open Access Policies',
        content: [
          'Authors retain copyright',
          'Publications are licensed under Creative Commons licenses (CC BY, CC BY-NC, etc.)',
          'Authors may be required to pay Article Processing Charges (APCs)',
          'We provide waivers and discounts for authors from developing countries or with financial constraints'
        ]
      }
    ]
  },
  {
    id: 'user-conduct',
    title: '7. User Conduct',
    icon: AlertCircle,
    subsections: [
      {
        title: '7.1 Prohibited Activities',
        content: [
          'Harassment and Abuse - Harass, threaten, or abuse other users, authors, editors, or staff',
          'Spam and Unauthorized Solicitation - Send unsolicited commercial messages or spam',
          'Misuse of Content - Use our content in ways that infringe copyright or other intellectual property rights',
          'Unauthorized Access - Attempt to gain unauthorized access to our systems or other users\' accounts',
          'Malicious Activities - Introduce viruses, malware, or harmful code',
          'Misrepresentation - Impersonate others or provide false information',
          'Gaming the System - Manipulate citation metrics, review scores, or other indicators',
          'Violation of Laws - Violate any applicable local, national, or international laws'
        ]
      },
      {
        title: '7.2 Academic Misconduct',
        content: [
          'Plagiarism - Presenting others\' work as your own',
          'Self-Plagiarism - Reusing your own previously published work without proper citation',
          'Data Falsification - Fabricating or manipulating research data',
          'Duplicate Submission - Submitting the same work to multiple journals simultaneously',
          'Ghost Authorship - Including authors who did not make substantive contributions',
          'Citation Manipulation - Excessive self-citation or coordinated citation among authors'
        ]
      }
    ]
  },
  {
    id: 'copyright-licensing',
    title: '8. Copyright and Licensing',
    icon: Scale,
    subsections: [
      {
        title: '8.1 Author Rights',
        content: [
          'Copyright - Authors retain copyright ownership of their works',
          'Reproduction Rights - Authors may reproduce their works for academic and non-commercial purposes',
          'Distribution Rights - Authors may distribute copies for educational and research purposes',
          'Derivative Works - Authors may create derivative works based on their published content'
        ]
      },
      {
        title: '8.2 Licensing',
        content: [
          'Open Access Content - Creative Commons Attribution 4.0 International (CC BY 4.0) or other specified CC licenses',
          'Subscription Content - Subject to standard copyright protections; users must subscribe or pay for access',
          'Non-Open Access Content - May not be reproduced, distributed, or used without permission'
        ]
      },
      {
        title: '8.3 Fair Use and Academic Exceptions',
        content: [
          'Quote or cite short excerpts for academic purposes',
          'Make copies for personal educational use',
          'Use content in accordance with applicable fair use or fair dealing provisions'
        ]
      }
    ]
  },
  {
    id: 'subscriptions',
    title: '9. Subscriptions and Access',
    icon: Lock,
    subsections: [
      {
        title: '9.1 Institutional Subscriptions',
        content: [
          'Subscriptions are available to academic, research, and other institutions',
          'Subscriptions cover institutional access to specified journals or content',
          'Subscription fees are based on institutional type, size, and geographical location',
          'Subscriptions are subject to our current price list and renewal policies'
        ]
      },
      {
        title: '9.2 Individual Subscriptions',
        content: [
          'Individual subscriptions are available for personal use',
          'Individual subscriptions may not be shared with others',
          'We offer both digital and combined digital-print subscription options'
        ]
      },
      {
        title: '9.3 Access Restrictions',
        content: [
          'Access to subscription content is restricted to authorized users',
          'Sharing access credentials is prohibited',
          'Systematic downloading, scraping, or harvesting of content is prohibited'
        ]
      }
    ]
  },
  {
    id: 'fees',
    title: '10. Fees and Payment',
    icon: FileText,
    subsections: [
      {
        title: '10.1 Article Processing Charges (APCs)',
        content: [
          'APC rates are published on our website and subject to change',
          'Waivers and discounts are available for authors from developing countries',
          'Failure to pay may result in delayed publication or article withdrawal'
        ]
      },
      {
        title: '10.2 Subscription Fees',
        content: [
          'Subscription fees are published on our website',
          'Fees are subject to annual review and adjustment',
          'Renewal notices are sent prior to the end of the subscription period'
        ]
      },
      {
        title: '10.3 Payment Methods',
        content: [
          'Credit and debit cards',
          'Bank transfers (institutional)',
          'Institutional billing',
          'PayPal (where available)'
        ]
      },
      {
        title: '10.4 Refund Policy',
        content: [
          'APCs are generally non-refundable after publication',
          'Subscription fees may be prorated and refunded in accordance with our refund policy',
          'Technical issues or service interruptions may be eligible for credit or refund'
        ]
      }
    ]
  },
  {
    id: 'disclaimer',
    title: '11. Disclaimer of Warranties',
    icon: AlertCircle,
    content: [
      'Content Accuracy - We do not warrant the accuracy, completeness, or reliability of any Content',
      'Service Availability - We do not guarantee uninterrupted, error-free, or secure access to our Services',
      'Merchantability - We disclaim any implied warranties of merchantability or fitness for a particular purpose',
      'Non-Infringement - We do not warrant that our Services will not infringe on third-party rights',
      'Technical Compatibility - We do not warrant that our Services will be compatible with all devices, browsers, or third-party software',
      'No advice or information obtained from Opus Publica shall create any warranty not expressly stated in these Terms.'
    ]
  },
  {
    id: 'liability',
    title: '12. Limitation of Liability',
    icon: Gavel,
    subsections: [
      {
        title: '12.1 Exclusions',
        content: [
          'Direct, indirect, incidental, special, or consequential damages',
          'Loss of profits, revenue, or business opportunities',
          'Loss of data, goodwill, or reputation',
          'Damages arising from use or inability to use our Services',
          'Damages from unauthorized access to your account or data',
          'Damages from content errors, omissions, or inaccuracies',
          'Damages from third-party conduct, whether online or offline'
        ]
      },
      {
        title: '12.2 Limitations',
        content: [
          'The amount paid by you to Opus Publica in the preceding 12 months',
          'Or EUR 100 (or equivalent), whichever is greater'
        ]
      },
      {
        title: '12.3 Applicability',
        content: [
          'These limitations apply whether the alleged liability is based on contract, tort, negligence, strict liability, or any other legal theory, even if we have been advised of the possibility of such damages.'
        ]
      }
    ]
  },
  {
    id: 'indemnification',
    title: '13. Indemnification',
    icon: Shield,
    content: [
      'Your violation of these Terms',
      'Your use of our Services',
      'Your violation of any rights of another person or entity',
      'Your submissions, content, or communications through our Services',
      'Your violation of any applicable law or regulation',
      'Any claims that your use infringes third-party rights'
    ]
  },
  {
    id: 'termination',
    title: '14. Termination',
    icon: AlertCircle,
    subsections: [
      {
        title: '14.1 By Us',
        content: [
          'Immediately, without notice, for violations of these Terms',
          'At our discretion, for extended account inactivity',
          'To comply with legal requirements',
          'To protect the integrity of our Services',
          'For any other reasonable business reason'
        ]
      },
      {
        title: '14.2 By You',
        content: [
          'Discontinuing use of our Services',
          'Closing your account through the account settings',
          'Contacting us at support@opuspublica.com'
        ]
      },
      {
        title: '14.3 Effect of Termination',
        content: [
          'Your right to access our Services ceases immediately',
          'We may delete your account and associated data',
          'Outstanding fees remain payable',
          'Sections that by their nature should survive termination will survive'
        ]
      }
    ]
  },
  {
    id: 'governing-law',
    title: '15. Governing Law and Jurisdiction',
    icon: Gavel,
    subsections: [
      {
        title: '15.1 Governing Law',
        content: ['These Terms shall be governed by and construed in accordance with the laws of the Netherlands, without regard to its conflict of law principles.']
      },
      {
        title: '15.2 Jurisdiction',
        content: ['Any legal action or proceeding arising out of or related to these Terms or our Services shall be brought exclusively in the courts of The Hague, Netherlands.']
      },
      {
        title: '15.3 International Users',
        content: ['We make no representation that our Services are appropriate or available for use in all locations. If you access our Services from outside the Netherlands, you are responsible for compliance with local laws.']
      }
    ]
  },
  {
    id: 'dispute-resolution',
    title: '16. Dispute Resolution',
    icon: Scale,
    subsections: [
      {
        title: '16.1 Informal Resolution',
        content: ['Before pursuing formal legal action, we encourage you to contact us to attempt to resolve disputes informally. We will make reasonable efforts to address and resolve concerns through communication and negotiation.']
      },
      {
        title: '16.2 Mediation',
        content: ['If disputes cannot be resolved informally, we agree to attempt to resolve them through mediation before resorting to litigation.']
      },
      {
        title: '16.3 Binding Arbitration',
        content: ['Subject to applicable law, disputes that cannot be resolved through mediation may be resolved by binding arbitration in accordance with the rules of the Netherlands Arbitration Institute.']
      }
    ]
  },
  {
    id: 'force-majeure',
    title: '17. Force Majeure',
    icon: AlertCircle,
    content: [
      'Natural disasters, earthquakes, floods, hurricanes, or fires',
      'Acts of war, terrorism, or civil unrest',
      'Epidemics, pandemics, or public health emergencies',
      'Governmental actions or regulations',
      'Power outages, network failures, or equipment malfunctions',
      'Labor disputes or shortages',
      'Supply chain disruptions'
    ]
  },
  {
    id: 'contact',
    title: '23. Contact Us',
    icon: Mail,
    content: [
      'Opus Publica, Fluwelen Burgwal 58, 2511 CJ Den Haag, Netherlands',
      'Email: legal@opuspublica.com',
      'Website: https://www.opuspublica.com'
    ]
  }
];

export default function TermsClient() {
  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white flex flex-col font-sans">
            
      {/* Spacer for Fixed Navbar */}
      <div className="h-16"></div>

      <main className="flex-grow bg-[#1A1A2E]">
        {/* Header */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1A1A2E] via-[#8B1A1A]/30 to-[#1A1A2E] py-16 border-b border-[#C9A84C]/20">
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
              <div className="flex items-center gap-4 mb-4">
                <FileText className="w-12 h-12 text-[#C9A84C]" />
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#C9A84C]">
                    Terms of Service
                  </h1>
                  <p className="text-white/60 text-sm mt-1">
                    Last Updated: 23.06.2026
                  </p>
                </div>
              </div>
              <p className="text-white/80 text-lg max-w-3xl leading-relaxed">
                Welcome to Opus Publica. These Terms of Service govern your access to and use of our 
                website, services, content, and publications.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
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
                    {termSections.map((section) => (
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
                    {termSections.map((section) => {
                      const Icon = section.icon;
                      return (
                        <div key={section.id} id={section.id} className="mb-12 scroll-mt-24">
                          <div className="flex items-center gap-3 mb-4">
                            <Icon className="w-6 h-6 text-[#C9A84C] flex-shrink-0" />
                            <h2 className="text-2xl font-serif text-[#8B1A1A] m-0 font-semibold">
                              {section.title}
                            </h2>
                          </div>
                          {section.content && (
                            <ul className="list-none space-y-2">
                              {section.content.map((item, i) => (
                                <li key={i} className="text-[#1A1A2E]/80 leading-relaxed pl-4 border-l-2 border-[#C9A84C]/30 text-base">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          )}
                          {section.subsections && (
                            <div className="space-y-6">
                              {section.subsections.map((subsection) => (
                                <div key={subsection.title}>
                                  <h3 className="text-lg font-serif text-[#1A1A2E] mb-3 font-semibold">
                                    {subsection.title}
                                  </h3>
                                  <ul className="list-none space-y-2">
                                    {subsection.content.map((item, i) => (
                                      <li key={i} className="text-[#1A1A2E]/80 leading-relaxed pl-4 border-l-2 border-[#C9A84C]/30 text-base">
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
