'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield, Mail, Globe, Lock, FileText } from 'lucide-react';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

const policySections = [
  {
    id: 'information-collection',
    title: '1. Information We Collect',
    icon: Shield,
    subsections: [
      {
        title: '1.1 Information You Provide to Us',
        content: [
          'Register for an account - Name, email address, institutional affiliation, professional title, ORCID ID, research interests',
          'Submit a manuscript or article - Name, contact details, biographical information, affiliation, funding sources, co-author information',
          'Subscribe to our journals or newsletters - Name, email address, mailing address, preferred language',
          'Register for events or webinars - Name, email address, phone number, institution, dietary or accessibility requirements',
          'Contact us for support or inquiries - Name, email address, phone number, any other information you choose to provide',
          'Participate in surveys, reviews, or feedback programs - Demographic information, opinions, professional background',
          'Apply for editorial or reviewer roles - CV/Resume, professional qualifications, employment history, publication record'
        ]
      },
      {
        title: '1.2 Information We Collect Automatically',
        content: [
          'Device Information - IP address, browser type and version, operating system, device type',
          'Usage Data - Pages visited, time spent on pages, links clicked, search queries',
          'Location Data - Approximate geographic location based on IP address',
          'Cookies and Tracking Technologies - We use cookies, web beacons, and similar technologies to enhance your experience and analyze usage patterns'
        ]
      },
      {
        title: '1.3 Information from Third Parties',
        content: [
          'Academic Institutions - When you access our content through institutional subscriptions',
          'Research Databases - For indexing and discoverability purposes',
          'Social Media Platforms - When you interact with our content through social media',
          'Conference Organizers - When we collaborate on events or special issues',
          'Funding Agencies - To verify grant information and comply with open access requirements'
        ]
      }
    ]
  },
  {
    id: 'information-use',
    title: '2. How We Use Your Information',
    icon: FileText,
    subsections: [
      {
        title: '2.1 Core Academic Publishing Functions',
        content: [
          'Manuscript Processing - To receive, review, and publish your submitted manuscripts',
          'Peer Review Management - To facilitate the peer review process, including assigning reviewers and communicating feedback',
          'Publication and Distribution - To publish, distribute, and promote accepted articles',
          'Editorial Communication - To communicate with authors, reviewers, editors, and editorial board members',
          'Copyright and Licensing - To manage rights, permissions, and licensing agreements'
        ]
      },
      {
        title: '2.2 User Account and Subscription Services',
        content: [
          'Account Management - To create and manage your user account',
          'Subscription Fulfillment - To process subscriptions, provide access to content, and manage renewals',
          'Content Delivery - To deliver digital content, notifications, and alerts',
          'Personalization - To personalize your experience and recommend relevant content'
        ]
      },
      {
        title: '2.3 Communication and Marketing',
        content: [
          'Newsletters and Updates - To send you information about new publications, calls for papers, and events',
          'Promotional Communications - To inform you about special issues, conferences, and related services',
          'Important Notices - To communicate updates to our policies, terms, or services',
          'Surveys and Research - To conduct academic research and improve our services'
        ]
      },
      {
        title: '2.4 Legal and Compliance',
        content: [
          'Compliance with Legal Obligations - To comply with applicable laws, regulations, and legal processes',
          'Fraud Prevention - To detect, prevent, and address fraud, security, and technical issues',
          'Enforcement - To enforce our terms of service and protect the rights, property, and safety of Opus Publica and our users'
        ]
      }
    ]
  },
  {
    id: 'legal-basis',
    title: '3. Legal Basis for Processing',
    icon: Lock,
    subsections: [
      {
        title: 'Legal Bases',
        content: [
          'Contractual Necessity - Processing necessary for the performance of a contract with you (e.g., manuscript submission, subscription)',
          'Legitimate Interests - Processing necessary for our legitimate interests in conducting academic publishing and research, provided such interests do not override your rights',
          'Consent - Processing based on your explicit consent (e.g., marketing communications)',
          'Legal Obligation - Processing necessary to comply with legal obligations (e.g., tax reporting, legal disclosures)'
        ]
      }
    ]
  },
  {
    id: 'data-sharing',
    title: '4. Data Sharing and Disclosure',
    icon: Globe,
    subsections: [
      {
        title: '4.1 Within Opus Publica and Advocacy Unified Network',
        content: [
          "AUN's administrative and support staff for operational purposes",
          "AUN's legal and compliance teams as necessary",
          'Other AUN affiliates for collaborative projects or events'
        ]
      },
      {
        title: '4.2 With Third Parties',
        content: [
          'Academic Partners - Co-publishers, joint ventures, and academic societies',
          'Service Providers - External service providers who assist us in operating our services (e.g., hosting, payment processing, email delivery, analytics)',
          'Research Databases - Indexing services and academic databases to facilitate discoverability',
          'Peer Review Platforms - Third-party platforms used to manage the peer review process',
          'Conference Organizers - When we collaborate on events or special issues',
          'Funding Agencies - To comply with open access mandates and funding requirements'
        ]
      },
      {
        title: '4.3 With Your Consent',
        content: ['We may share your information in other ways if you explicitly consent.']
      },
      {
        title: '4.4 Legal Requirements',
        content: ['We may disclose your information if required to do so by law or in response to valid requests by public authorities.']
      }
    ]
  },
  {
    id: 'international-transfers',
    title: '5. International Data Transfers',
    icon: Globe,
    subsections: [
      {
        title: 'Data Transfer Safeguards',
        content: [
          'Standard Contractual Clauses - We use EU-approved standard contractual clauses for transfers of personal data to countries outside the European Economic Area',
          'Data Processing Agreements - We maintain agreements with service providers that include appropriate data protection provisions',
          'Privacy Shield - Where applicable, we comply with the EU-US Privacy Shield framework'
        ]
      }
    ]
  },
  {
    id: 'data-security',
    title: '6. Data Security',
    icon: Lock,
    subsections: [
      {
        title: 'Security Measures',
        content: [
          'Encryption - We use SSL/TLS encryption for data transmission and encryption for stored data',
          'Access Controls - We limit access to personal information to authorized personnel on a need-to-know basis',
          'Security Monitoring - We monitor our systems for potential vulnerabilities and security incidents',
          'Training - We provide regular data protection and security training to our staff',
          'Incident Response - We have procedures in place to respond to data breaches promptly'
        ]
      }
    ]
  },
  {
    id: 'data-retention',
    title: '7. Data Retention',
    icon: FileText,
    subsections: [
      {
        title: 'Retention Periods',
        content: [
          'Manuscript Data - Retained for as long as necessary for publication history and academic integrity',
          'Subscription Data - Retained for the duration of your subscription plus applicable statutory periods',
          'Account Data - Retained until you delete your account or request deletion',
          'Transactional Data - Retained for accounting, tax, and legal compliance purposes',
          'Marketing Data - Retained until you opt out or withdraw consent'
        ]
      }
    ]
  },
  {
    id: 'your-rights',
    title: '8. Your Rights',
    icon: Shield,
    subsections: [
      {
        title: '8.1 General Rights',
        content: [
          'Right to Access - Request a copy of the personal information we hold about you',
          'Right to Rectification - Request correction of inaccurate or incomplete information',
          'Right to Erasure - Request deletion of your personal information ("right to be forgotten")',
          'Right to Restrict Processing - Request restriction of processing under certain circumstances',
          'Right to Data Portability - Request transfer of your data to another service provider',
          'Right to Object - Object to processing for certain purposes (e.g., marketing)',
          'Right to Withdraw Consent - Withdraw your consent at any time where processing is based on consent',
          'Right to Lodge a Complaint - Lodge a complaint with a supervisory authority'
        ]
      },
      {
        title: '8.2 Exercising Your Rights',
        content: [
          'Email: privacy@opuspublica.com',
          'Mail: Opus Publica, Attn: Privacy Officer, Fluwelen Burgwal 58, 2511 CJ Den Haag, Netherlands',
          'We will respond to your request within 30 days.'
        ]
      }
    ]
  },
  {
    id: 'cookies',
    title: '9. Cookies and Tracking Technologies',
    icon: Shield,
    subsections: [
      {
        title: 'Cookie Types',
        content: [
          'Essential Cookies - Enable core functionality such as security, network management, and accessibility',
          'Preference Cookies - Remember your preferences and settings',
          'Analytics Cookies - Analyze how you use our website to improve our services',
          'Marketing Cookies - Deliver relevant advertisements and measure campaign effectiveness'
        ]
      }
    ]
  },
  {
    id: 'children-privacy',
    title: '10. Children\'s Privacy',
    icon: Shield,
    subsections: [
      {
        title: 'Policy',
        content: [
          'Our services are not directed at individuals under 18 years of age.',
          'We do not knowingly collect personal information from children.',
          'If we learn that we have collected personal information from a child without verification of parental consent, we will delete that information promptly.'
        ]
      }
    ]
  },
  {
    id: 'third-party-links',
    title: '11. Third-Party Links',
    icon: Globe,
    subsections: [
      {
        title: 'Policy',
        content: [
          'Our website may contain links to third-party websites.',
          'We are not responsible for the privacy practices or content of such websites.',
          'We encourage you to review the privacy policies of these third-party sites.'
        ]
      }
    ]
  },
  {
    id: 'california-rights',
    title: '12. California Privacy Rights',
    icon: Shield,
    subsections: [
      {
        title: 'CCPA Rights',
        content: [
          'Right to Know - Request information about the categories and specific pieces of personal information we have collected',
          'Right to Delete - Request deletion of your personal information',
          'Right to Opt-Out - Opt-out of the sale of your personal information',
          'Right to Non-Discrimination - Exercise your rights without being discriminated against',
          'To exercise these rights, please contact us at privacy@opuspublica.com.'
        ]
      }
    ]
  },
  {
    id: 'eu-rights',
    title: '13. European Data Protection Rights',
    icon: Shield,
    subsections: [
      {
        title: 'GDPR Rights',
        content: [
          'If you are a resident of the European Economic Area (EEA), you have additional rights under the GDPR.',
          'The data controller for GDPR purposes is Opus Publica (Fluwelen Burgwal 58, 2511 CJ Den Haag, Netherlands).',
          'Data Protection Officer: dpo@opuspublica.com'
        ]
      }
    ]
  },
  {
    id: 'changes',
    title: '14. Changes to This Privacy Policy',
    icon: FileText,
    subsections: [
      {
        title: 'Policy Updates',
        content: [
          'We may update this Privacy Policy from time to time.',
          'We will notify you of any material changes by posting the updated policy on our website and updating the "Last Updated" date.'
        ]
      }
    ]
  },
  {
    id: 'contact',
    title: '15. Contact Us',
    icon: Mail,
    subsections: [
      {
        title: 'Contact Information',
        content: [
          'Opus Publica, Fluwelen Burgwal 58, 2511 CJ Den Haag, Netherlands',
          'Email: privacy@opuspublica.com',
          'Website: https://www.opuspublica.com'
        ]
      }
    ]
  }
];

export default function PrivacyClient() {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans">
            
      {/* Spacer for Fixed Navbar */}
      <div className="h-16"></div>

      <main className="flex-grow bg-bg">
        {/* Header */}
        <section className="relative overflow-hidden bg-gradient-to-br from-bg via-primary/30 to-bg py-16 border-b border-border">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-10 right-20 w-96 h-96 rounded-full border-2 border-accent"></div>
            <div className="absolute bottom-10 left-20 w-64 h-64 rounded-full border-2 border-accent"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <Shield className="w-12 h-12 text-accent" />
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-primary">
                    Privacy Policy
                  </h1>
                  <p className="text-text-secondary/70 text-sm mt-1">
                    Last Updated: 23.06.2026
                  </p>
                </div>
              </div>
              <p className="text-text-secondary text-lg max-w-3xl leading-relaxed">
                Opus Publica is committed to protecting the privacy and security of your personal information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 bg-bg text-text">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar Navigation */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 bg-white rounded-lg p-6 shadow-sm border-l-4 border-accent">
                  <h3 className="text-primary font-serif text-lg font-semibold mb-4">
                    On This Page
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {policySections.map((section) => (
                      <li key={section.id}>
                        <Link
                          href={`#${section.id}`}
                          className="text-text-secondary/70 hover:text-primary transition-colors block py-1 border-b border-border/5"
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
                    {policySections.map((section) => {
                      const Icon = section.icon;
                      return (
                        <div key={section.id} id={section.id} className="mb-12 scroll-mt-24">
                          <div className="flex items-center gap-3 mb-4">
                            <Icon className="w-6 h-6 text-accent flex-shrink-0" />
                            <h2 className="text-2xl font-serif text-primary m-0">
                              {section.title}
                            </h2>
                          </div>
                          {section.subsections.map((subsection) => (
                            <div key={subsection.title} className="mb-6">
                              <h3 className="text-lg font-serif text-text mb-3">
                                {subsection.title}
                              </h3>
                              <ul className="list-none space-y-2">
                                {subsection.content.map((item, i) => (
                                  <li key={i} className="text-text-secondary leading-relaxed pl-4 border-l-2 border-accent/30 text-base">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
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
