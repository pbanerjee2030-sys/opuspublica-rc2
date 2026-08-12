'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Globe, BookOpen, Lock, Users } from 'lucide-react';
import Image from 'next/image';
import Footer from '@/components/Footer';

const highlights = [
  { icon: Globe, label: 'Global Reach', desc: 'Operations across 4 continents' },
  { icon: BookOpen, label: 'Impact-Driven Research', desc: 'Informing policy worldwide' },
  { icon: Lock, label: 'Open Access Publishing', desc: 'Knowledge without barriers' },
  { icon: Users, label: 'Policy Engagement', desc: 'Bridging research and action' },
];

export default function AboutClient() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <div className="min-h-screen bg-bg">
      <div className="h-16"></div>
      <main className="py-20 bg-bg-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-12">
              <h1 className="text-3xl sm:text-4xl font-serif text-primary mb-3">
                About Opus Publica
              </h1>
              <div className="w-24 h-1 bg-accent mx-auto mb-4"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div className="space-y-6">
                <div className="relative w-full max-w-[280px] h-20 bg-surface rounded-lg shadow-sm border border-border overflow-hidden flex items-center justify-center">
                  <Image
                    src="/opus-publica-logo.png"
                    alt="Opus Publica Logo"
                    fill
                    sizes="280px"
                    className="object-contain scale-[1.2]"
                  />
                </div>
                <p className="text-text leading-relaxed text-justify">
                  Opus Publica is a leading global platform for public policy research and publishing, dedicated to advancing knowledge that drives real-world impact.
                </p>
                <p className="text-text leading-relaxed text-justify">
                  Established in 2023 and affiliated with the globally respected Advocacy Unified Network, Opus Publica operates from its headquarters in The Hague, Netherlands, with a presence in New York, USA, Durban, South Africa, and Kathmandu, Nepal.
                </p>
                <p className="text-text leading-relaxed text-justify">
                  Our diverse network of journals covers critical areas such as sustainable development, international relations, civil rights, art and culture, environmental policy, and beyond.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {highlights.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: index * 0.1 }}
                    className="bg-surface rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow"
                  >
                    <item.icon className="w-8 h-8 text-accent mx-auto mb-2" />
                    <h4 className="text-primary font-serif font-semibold text-sm">
                      {item.label}
                    </h4>
                    <p className="text-text-secondary text-xs">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
