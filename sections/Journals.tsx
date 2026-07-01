'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { BookOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface JournalItem {
  id: number;
  slug: string;
  title: string;
  desc: string;
  issn?: string;
}

interface Props {
  journals?: JournalItem[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Journals({ journals = [] }: Props) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section id="journals" className="py-20 bg-[#F5F0E8] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-serif text-[#8B1A1A] mb-3">
            Our Journals
          </h2>
          <div className="w-24 h-1 bg-[#C9A84C] mx-auto mb-4"></div>
          <p className="text-[#1A1A2E]/70 text-lg max-w-2xl mx-auto">
            Advancing knowledge through rigorous academic publishing and global policy debate
          </p>
        </motion.div>

        {/* Center Image Showcase (Catalogs Cover Art) */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className="relative group bg-white rounded-xl p-4 sm:p-6 shadow-xl border border-[#C9A84C]/20 hover:border-[#C9A84C]/50 transition-all duration-500">
            {/* Gold Frame accents */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C] pointer-events-none"></div>
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#C9A84C] pointer-events-none"></div>
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#C9A84C] pointer-events-none"></div>
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C] pointer-events-none"></div>
            
            <div className="overflow-hidden rounded-lg bg-zinc-50 relative aspect-[5/4] sm:aspect-[1.2] w-full shadow-inner border border-zinc-100">
              <Image
                src="/Welcome%20to%20Opus%20Publica.jpg"
                alt="Opus Publica Journal Covers and Branding"
                fill
                sizes="(max-w-1200px) 100vw, 80vw"
                priority
                className="object-contain transition-transform duration-750 group-hover:scale-102"
              />
            </div>
            
            <div className="mt-4 text-center">
              <span className="text-xs uppercase tracking-widest text-[#8B1A1A] font-semibold">
                Official Publications Catalogue
              </span>
              <h4 className="text-[#1A1A2E] font-serif text-lg mt-1">
                Volume 1 Edition Covers
              </h4>
            </div>
          </div>
        </motion.div>

        {/* Journal Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {journals.map((journal) => (
            <Link href={`/journals/${journal.slug}`} key={journal.id} className="block group h-full">
              <motion.div
                variants={itemVariants}
                className="bg-white rounded-lg p-6 border-l-4 border-[#C9A84C] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between min-h-[180px] h-full"
              >
                <div>
                  <BookOpen className="text-[#8B1A1A] w-6 h-6 mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="text-[#1A1A2E] font-serif text-lg font-semibold mb-2 group-hover:text-[#8B1A1A] transition-colors">
                    {journal.title}
                  </h3>
                  <p className="text-[#1A1A2E]/70 text-sm leading-relaxed">{journal.desc}</p>
                </div>
                {journal.issn && (
                  <p className="text-[#C9A84C] text-xs mt-4 font-mono border-t border-zinc-100 pt-2">
                    ISSN: {journal.issn}
                  </p>
                )}
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
