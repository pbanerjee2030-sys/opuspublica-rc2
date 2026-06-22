'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Globe, BookOpen, Lock, Users } from 'lucide-react';
import Image from 'next/image';

const highlights = [
  { icon: Globe, label: 'Global Reach', desc: 'Operations across 4 continents' },
  { icon: BookOpen, label: 'Impact-Driven Research', desc: 'Informing policy worldwide' },
  { icon: Lock, label: 'Open Access Publishing', desc: 'Knowledge without barriers' },
  { icon: Users, label: 'Policy Engagement', desc: 'Bridging research and action' },
];

export default function About() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section id="about" className="py-20 bg-[#F5F0E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif text-[#8B1A1A] mb-3">
              About Opus Publica
            </h2>
            <div className="w-24 h-1 bg-[#C9A84C] mx-auto mb-4"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <div className="relative w-full max-w-[280px] h-20 bg-white p-2 rounded-lg shadow-sm border border-zinc-200 overflow-hidden flex items-center justify-center">
                <Image
                  src="/Opus%20Publica%20flat%20logo.jpg"
                  alt="Opus Publica Flat Logo"
                  fill
                  sizes="280px"
                  className="object-contain p-2"
                />
              </div>
              <p className="text-[#1A1A2E]/80 leading-relaxed">
                Opus Publica is a leading global platform for public policy research and publishing, dedicated to advancing knowledge that drives real-world impact.
              </p>
              <p className="text-[#1A1A2E]/80 leading-relaxed">
                Established in 2023 and affiliated with the globally respected Advocacy Unified Network, Opus Publica operates from its headquarters in The Hague, Netherlands, with a presence in New York, USA, Durban, South Africa, and Kathmandu, Nepal.
              </p>
              <p className="text-[#1A1A2E]/80 leading-relaxed">
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
                  className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <item.icon className="w-8 h-8 text-[#C9A84C] mx-auto mb-2" />
                  <h4 className="text-[#8B1A1A] font-serif font-semibold text-sm">
                    {item.label}
                  </h4>
                  <p className="text-[#1A1A2E]/60 text-xs">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
