'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Building2, MapPin, Globe, Mail } from 'lucide-react';
import { addresses } from '@/lib/data';

const iconMap = { Building2, MapPin, Globe };

export default function Contact() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section id="contact" className="py-20 bg-[#1A1A2E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-serif text-[#C9A84C] mb-3">
            Get in Touch
          </h2>
          <div className="w-24 h-1 bg-[#C9A84C] mx-auto mb-4"></div>
          <p className="text-white/60 text-lg">
            Connect with us across the globe
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {addresses.map((address, index) => {
            const Icon = iconMap[address.icon as keyof typeof iconMap];
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 rounded-lg p-6 border border-white/10 hover:border-[#C9A84C] transition-all duration-300 hover:-translate-y-1"
              >
                <Icon className="w-10 h-10 text-[#C9A84C] mb-4" />
                <h3 className="text-[#8B1A1A] font-serif font-semibold text-lg mb-2">
                  {address.label}
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {address.address}
                </p>
                {address.note && (
                  <p className="text-[#C9A84C] text-xs mt-2 font-medium">
                    {address.note}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <a
            href="mailto:info@opuspublica.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#1A1A2E] font-semibold rounded-lg transition-all transform hover:scale-105"
          >
            <Mail className="w-5 h-5" />
            info@opuspublica.com
          </a>
        </motion.div>
      </div>
    </section>
  );
}
