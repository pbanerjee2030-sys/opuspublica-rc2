'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Check, Settings } from 'lucide-react';
import Link from 'next/link';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState(() => {
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem('cookieConsent');
      if (consent) {
        try {
          const parsed = JSON.parse(consent);
          if (parsed.preferences) {
            return parsed.preferences;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    return {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleOpenSettings = () => {
      const consent = localStorage.getItem('cookieConsent');
      if (consent) {
        try {
          const parsed = JSON.parse(consent);
          if (parsed.preferences) {
            setPreferences(parsed.preferences);
          }
        } catch (e) {
          console.error(e);
        }
      }
      setShowPreferences(true);
      setIsVisible(true);
    };
    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('open-cookie-settings', handleOpenSettings);
    };
  }, []);

  const handleAcceptAll = () => {
    const allPreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    setPreferences(allPreferences);
    saveConsent(allPreferences);
    setIsVisible(false);
  };

  const handleDecline = () => {
    const minimalPreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    setPreferences(minimalPreferences);
    saveConsent(minimalPreferences);
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
    setIsVisible(false);
    setShowPreferences(false);
  };

  const saveConsent = (prefs: typeof preferences) => {
    localStorage.setItem('cookieConsent', JSON.stringify({
      preferences: prefs,
      timestamp: new Date().toISOString(),
    }));
    // Here you would also set actual cookies based on preferences
    // For now, we're just storing the preference
  };

  const togglePreference = (key: keyof typeof preferences) => {
    if (key === 'essential') return; // Essential cannot be disabled
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1A2E] border-t-2 border-[#C9A84C] shadow-2xl"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {!showPreferences ? (
              // Main Banner
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Cookie className="w-8 h-8 text-[#C9A84C] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-white font-serif text-lg font-semibold">
                      We Value Your Privacy
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
                      We use cookies and similar technologies to enhance your browsing experience, 
                      analyze site traffic, and deliver personalized content. 
                      You can choose which cookies to accept.
                    </p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <Link 
                        href="/privacy" 
                        className="text-[#C9A84C] hover:text-[#D4AF37] transition-colors"
                      >
                        Privacy Policy
                      </Link>
                      <Link 
                        href="/cookies" 
                        className="text-[#C9A84C] hover:text-[#D4AF37] transition-colors"
                      >
                        Cookie Policy
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button
                    onClick={handleAcceptAll}
                    className="px-6 py-2.5 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#1A1A2E] font-semibold rounded-lg transition-all transform hover:scale-105 text-sm whitespace-nowrap"
                  >
                    <Check className="w-4 h-4 inline mr-2" />
                    Accept All
                  </button>
                  <button
                    onClick={handleDecline}
                    className="px-6 py-2.5 border border-white/20 hover:border-white/40 text-white/80 hover:text-white rounded-lg transition-all text-sm whitespace-nowrap"
                  >
                    Decline All
                  </button>
                  <button
                    onClick={() => setShowPreferences(true)}
                    className="px-6 py-2.5 border border-[#C9A84C]/30 hover:border-[#C9A84C] text-[#C9A84C] hover:text-[#D4AF37] rounded-lg transition-all text-sm whitespace-nowrap"
                  >
                    <Settings className="w-4 h-4 inline mr-2" />
                    Preferences
                  </button>
                </div>
              </div>
            ) : (
              // Preferences Panel
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-serif text-lg font-semibold">
                    Cookie Preferences
                  </h3>
                  <button
                    onClick={() => setShowPreferences(false)}
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-white/60 text-sm mb-4">
                  Customize your cookie preferences below. Essential cookies are always enabled 
                  as they are necessary for the website to function properly.
                </p>

                <div className="space-y-3">
                  {/* Essential - Always On */}
                  <div className="flex items-start justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm">Essential Cookies</span>
                        <span className="px-2 py-0.5 bg-[#C9A84C]/20 text-[#C9A84C] text-xs rounded-full">
                          Always On
                        </span>
                      </div>
                      <p className="text-white/50 text-xs mt-1">
                        Required for basic site functionality, security, and accessibility.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-10 h-6 bg-[#C9A84C] rounded-full relative">
                        <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md"></div>
                      </div>
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="flex items-start justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                       onClick={() => togglePreference('analytics')}>
                    <div>
                      <span className="text-white font-medium text-sm">Analytics Cookies</span>
                      <p className="text-white/50 text-xs mt-1">
                        Help us understand how visitors interact with our site.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${
                        preferences.analytics ? 'bg-[#C9A84C]' : 'bg-white/20'
                      }`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${
                          preferences.analytics ? 'left-5' : 'left-1'
                        }`}></div>
                      </div>
                    </div>
                  </div>

                  {/* Marketing */}
                  <div className="flex items-start justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                       onClick={() => togglePreference('marketing')}>
                    <div>
                      <span className="text-white font-medium text-sm">Marketing Cookies</span>
                      <p className="text-white/50 text-xs mt-1">
                        Used to deliver relevant advertisements and track campaign effectiveness.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${
                        preferences.marketing ? 'bg-[#C9A84C]' : 'bg-white/20'
                      }`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${
                          preferences.marketing ? 'left-5' : 'left-1'
                        }`}></div>
                      </div>
                    </div>
                  </div>

                  {/* Preference Cookies */}
                  <div className="flex items-start justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                       onClick={() => togglePreference('preferences')}>
                    <div>
                      <span className="text-white font-medium text-sm">Preference Cookies</span>
                      <p className="text-white/50 text-xs mt-1">
                        Remember your settings and preferences for a better experience.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${
                        preferences.preferences ? 'bg-[#C9A84C]' : 'bg-white/20'
                      }`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${
                          preferences.preferences ? 'left-5' : 'left-1'
                        }`}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={handleSavePreferences}
                    className="px-6 py-2.5 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#1A1A2E] font-semibold rounded-lg transition-all transform hover:scale-105 text-sm"
                  >
                    Save Preferences
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="px-6 py-2.5 border border-white/20 hover:border-white/40 text-white/80 hover:text-white rounded-lg transition-all text-sm"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={() => setShowPreferences(false)}
                    className="px-6 py-2.5 text-white/50 hover:text-white/80 rounded-lg transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
