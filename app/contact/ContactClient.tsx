'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Building2, MapPin, Globe, Mail, Clock, Send, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import Footer from '@/components/Footer';

const officeData = [
  {
    label: 'Headquarters',
    icon: 'Building2',
    address: 'Fluwelen Burgwal 58, 2511 CJ Den Haag, Netherlands',
    note: 'Advocacy Unified Network',
    hours: 'Mon–Fri, 09:00–17:00 CET',
  },
  {
    label: 'Registered Office',
    icon: 'MapPin',
    address: '85 MOUNT HOPE RD, MAHOPAC NY 10541-0000, USA',
    hours: 'Mon–Fri, 09:00–17:00 EST',
  },
  {
    label: 'SAARC Office',
    icon: 'Globe',
    address: 'Anamnagar, Kathmandu, Nepal',
    hours: 'Sun–Fri, 10:00–17:00 NPT',
  },
];

const iconMap: Record<string, React.ElementType> = { Building2, MapPin, Globe };

export default function ContactClient() {
  const [officesRef, officesInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [formRef, formInView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        setFeedback({ type: 'success', message: 'Your message has been sent. We will respond within 48 hours.' });
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Something went wrong. Please try again.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">

      {/* HERO */}
      <section className="bg-primary pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-bold uppercase tracking-wider text-accent mb-4">
              <Mail className="w-3.5 h-3.5" />
              Get in Touch
            </span>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white tracking-tight leading-tight max-w-3xl mx-auto">
              Contact Us
            </h1>
            <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto mt-4 leading-relaxed">
              We welcome inquiries from researchers, editors, and institutions. Reach out via the form below or write directly to our editorial team.
            </p>
          </motion.div>
        </div>
      </section>

      {/* OFFICES */}
      <section ref={officesRef} className="py-20 border-b border-border bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-12">
            <div className="w-12 h-px bg-accent mb-4"></div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary tracking-tight">Our Offices</h2>
            <p className="text-sm text-text-secondary mt-1.5 max-w-lg leading-relaxed">
              We maintain a global presence to serve our community of researchers and partners.
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-6">
            {officeData.map((office, index) => {
              const Icon = iconMap[office.icon as string] || MapPin;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={officesInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-surface border border-border rounded-xl p-6 hover:shadow-md hover:border-accent/25 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{office.label}</h3>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <MapPin className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{office.address}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                      <Clock className="w-4 h-4 text-accent shrink-0" />
                      <span>{office.hours}</span>
                    </div>
                  </div>

                  {office.note && (
                    <div className="mt-4 pt-3 border-t border-border text-[11px] text-text-secondary/60 font-semibold uppercase tracking-wider">
                      {office.note}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section ref={formRef} className="py-20 bg-bg-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <header className="mb-10 text-center">
              <div className="w-12 h-px bg-accent mx-auto mb-4"></div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary tracking-tight">Send a Message</h2>
              <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                For general enquiries, collaboration proposals, or technical support.
              </p>
            </header>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={formInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="bg-surface border border-border rounded-xl p-8 sm:p-10"
            >
              {feedback && (
                <div className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {feedback.message}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">Name</label>
                    <input
                      id="name"
                      type="text"
                      required
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">Email</label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">Subject</label>
                  <input
                    id="subject"
                    type="text"
                    required
                    placeholder="What is this regarding?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">Message</label>
                  <textarea
                    id="message"
                    rows={5}
                    required
                    placeholder="Write your message here..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/40 outline-none focus:border-accent transition-colors resize-y"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
                >
                  {sending ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* DIRECT CONTACT */}
      <section className="py-16 border-b border-border bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-12 h-px bg-accent mx-auto mb-4"></div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary mb-2">Prefer to write directly?</h2>
          <p className="text-sm text-text-secondary mb-6 max-w-lg mx-auto leading-relaxed">
            Our editorial team typically responds within 48 hours.
          </p>
          <a
            href="mailto:info@opuspublica.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-primary font-semibold text-sm rounded-lg transition-all shadow-sm"
          >
            <Mail className="w-4 h-4" />
            info@opuspublica.com
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
