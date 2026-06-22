'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Cookie, 
  Info, 
  Shield, 
  Settings, 
  Mail,
  CheckCircle
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

const cookieSections = [
  {
    id: 'what-are-cookies',
    title: '1. What Are Cookies',
    icon: Info,
    content: [
      'Cookies are small text files that are placed on your computer, smartphone, or other device when you visit a website.',
      'They are widely used to make websites work more efficiently, enhance user experience, and provide information to the website owners.',
      'Cookies help us remember your preferences, analyze how you use our website, and deliver relevant content and advertisements.',
      'Cookies are not viruses, spyware, or malware, and they cannot access your computer\'s files or personal information stored on your device.'
    ]
  },
  {
    id: 'how-we-use-cookies',
    title: '2. How We Use Cookies',
    icon: Settings,
    subsections: [
      {
        title: '2.1 Essential Cookies',
        content: [
          'Enable core functionality such as security, network management, and accessibility',
          'Allow you to navigate our website and use its features',
          'Remember your login status and preferences',
          'Are necessary for the proper functioning of our website'
        ]
      },
      {
        title: '2.2 Preference Cookies',
        content: [
          'Remember your preferences and settings across pages',
          'Remember your language preferences',
          'Remember your display preferences (e.g., dark mode)',
          'Remember your cookie consent preferences'
        ]
      },
      {
        title: '2.3 Analytics Cookies',
        content: [
          'Analyze how you use our website and its features',
          'Track which pages you visit and how long you spend on them',
          'Help us understand which content is most popular',
          'Help us improve our website and user experience'
        ]
      },
      {
        title: '2.4 Marketing Cookies',
        content: [
          'Deliver relevant advertisements on our website and third-party sites',
          'Measure the effectiveness of our advertising campaigns',
          'Track your interactions with our promotional content',
          'Limit the number of times you see a particular advertisement'
        ]
      },
      {
        title: '2.5 Social Media Cookies',
        content: [
          'Enable you to share content on social media platforms',
          'Track your interactions with social media widgets on our website',
          'Allow social media platforms to personalize content based on your activity'
        ]
      }
    ]
  },
  {
    id: 'types-of-cookies',
    title: '3. Types of Cookies We Use',
    icon: Cookie,
    subsections: [
      {
        title: '3.1 Session Cookies',
        content: [
          'Temporary cookies that are deleted when you close your browser',
          'Used to maintain your session and remember your actions during a single browsing session',
          'Essential for logging in and navigating our website'
        ]
      },
      {
        title: '3.2 Persistent Cookies',
        content: [
          'Remain on your device for a set period or until you manually delete them',
          'Remember your preferences and settings across browsing sessions',
          'Help us recognize you when you return to our website'
        ]
      },
      {
        title: '3.3 First-Party Cookies',
        content: [
          'Set directly by Opus Publica when you visit our website',
          'Used to remember your preferences and provide essential functionality',
          'Cannot be accessed by other websites'
        ]
      },
      {
        title: '3.4 Third-Party Cookies',
        content: [
          'Set by external services and partners we work with',
          'Used for analytics, advertising, and social media features',
          'Can be accessed by the third-party service across multiple websites'
        ]
      }
    ]
  },
  {
    id: 'specific-cookies',
    title: '4. Specific Cookies We Use',
    icon: Cookie,
    subsections: [
      {
        title: '4.1 Analytics Cookies',
        content: [
          'Google Analytics (_ga, _gid, _gat) - Used to analyze website traffic and user behavior',
          'Hotjar (_hj*) - Used to understand user interactions and improve user experience',
          'Microsoft Clarity (clarity) - Used to analyze user behavior and website performance'
        ]
      },
      {
        title: '4.2 Essential Cookies',
        content: [
          'Session Cookie (session_id) - Maintains your session and login status',
          'CSRF Token (csrf_token) - Protects against cross-site request forgery attacks',
          'Cookie Consent (cookie_consent) - Remembers your cookie consent preferences'
        ]
      },
      {
        title: '4.3 Preference Cookies',
        content: [
          'Language Preference (language) - Remembers your preferred language',
          'Theme Preference (theme) - Remembers your display theme preferences',
          'Font Size (font_size) - Remembers your font size preferences'
        ]
      },
      {
        title: '4.4 Third-Party Cookies',
        content: [
          'YouTube (PREF, VISITOR_INFO1_LIVE) - Enables embedded video content',
          'Twitter (twid, guest_id) - Enables Twitter share functionality',
          'LinkedIn (lidc, lissc) - Enables LinkedIn share functionality'
        ]
      }
    ]
  },
  {
    id: 'manage-cookies',
    title: '5. How to Manage Cookies',
    icon: Settings,
    content: [
      'You can control and manage cookies through your browser settings. Most browsers allow you to:',
      'View and delete individual cookies',
      'Block all cookies from specific websites',
      'Block all cookies from third parties',
      'Clear all cookies when you close your browser',
      'Set preferences for how cookies should be handled',
      'Most browsers also allow you to set preferences for how cookies should be handled.'
    ]
  },
  {
    id: 'browser-settings',
    title: '6. Browser-Specific Settings',
    icon: Settings,
    subsections: [
      {
        title: '6.1 Google Chrome',
        content: [
          'Open Chrome and click the three dots in the top-right corner',
          'Click "Settings"',
          'Click "Privacy and Security" in the left sidebar',
          'Click "Cookies and other site data"',
          'Adjust your cookie preferences as desired'
        ]
      },
      {
        title: '6.2 Mozilla Firefox',
        content: [
          'Open Firefox and click the menu button (three horizontal lines)',
          'Click "Settings"',
          'Click "Privacy & Security" in the left sidebar',
          'Find the "Cookies and Site Data" section',
          'Adjust your cookie preferences as desired'
        ]
      },
      {
        title: '6.3 Apple Safari',
        content: [
          'Open Safari and click "Safari" in the menu bar',
          'Click "Preferences"',
          'Click the "Privacy" tab',
          'Adjust your cookie preferences as desired'
        ]
      },
      {
        title: '6.4 Microsoft Edge',
        content: [
          'Open Edge and click the three dots in the top-right corner',
          'Click "Settings"',
          'Click "Cookies and site permissions"',
          'Adjust your cookie preferences as desired'
        ]
      }
    ]
  },
  {
    id: 'consent',
    title: '7. Your Consent',
    icon: CheckCircle,
    content: [
      'When you first visit our website, we will ask for your consent to use non-essential cookies.',
      'You can change your cookie preferences at any time by clicking the "Cookie Preferences" link in our footer.',
      'If you choose to decline cookies, some features of our website may not function as intended.',
      'We will store your consent preferences using a cookie so we remember your choice on future visits.'
    ]
  },
  {
    id: 'third-party-services',
    title: '8. Third-Party Services',
    icon: Shield,
    content: [
      'Some features of our website may be provided by third-party services that set their own cookies.',
      'These services include, but are not limited to:',
      'Google Analytics (analytics) - Google\'s privacy policy is available at https://policies.google.com/privacy',
      'YouTube (video embedding) - Google\'s privacy policy is available at https://policies.google.com/privacy',
      'Twitter (social sharing) - Twitter\'s privacy policy is available at https://twitter.com/privacy',
      'LinkedIn (social sharing) - LinkedIn\'s privacy policy is available at https://linkedin.com/privacy',
      'We encourage you to review the privacy policies of these third-party services for more information about their data practices.'
    ]
  },
  {
    id: 'updates',
    title: '9. Updates to This Policy',
    icon: Info,
    content: [
      'We may update this Cookie Policy from time to time to reflect changes in technology, law, or our practices.',
      'We will notify you of any material changes by updating the "Last Updated" date at the top of this page.',
      'We encourage you to review this policy periodically to stay informed about our use of cookies.',
      'Your continued use of our website after any changes to this policy constitutes your acceptance of the updated policy.'
    ]
  },
  {
    id: 'contact',
    title: '10. Contact Us',
    icon: Mail,
    content: [
      'If you have any questions, concerns, or requests regarding this Cookie Policy or our use of cookies, please contact us:',
      '',
      'Opus Publica',
      'Fluwelen Burgwal 58',
      '2511 CJ Den Haag',
      'Netherlands',
      '',
      'Email: privacy@opuspublica.com',
      'Website: https://www.opuspublica.com'
    ]
  }
];

export default function CookieClient() {
  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white flex flex-col font-sans">
      <Navbar />
      
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
                <Cookie className="w-12 h-12 text-[#C9A84C]" />
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#C9A84C]">
                    Cookie Policy
                  </h1>
                  <p className="text-white/60 text-sm mt-1">
                    Last Updated: 23.06.2026
                  </p>
                </div>
              </div>
              <p className="text-white/80 text-lg max-w-3xl leading-relaxed">
                This Cookie Policy explains how Opus Publica uses cookies and similar tracking technologies 
                on our website to enhance your experience and provide personalized content.
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
                    {cookieSections.map((section) => (
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
                    {cookieSections.map((section) => {
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
