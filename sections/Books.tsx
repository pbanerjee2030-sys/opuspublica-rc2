'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Book, ArrowRight } from 'lucide-react';
import { books } from '@/lib/data';
import Link from 'next/link';
import Image from 'next/image';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};

const coverMap: Record<number, string> = {
  1: '/GRACE-Timekeepers-of-Ancient-Cultural-Legacy-user-preview.png',
  2: '/Echoes-of-the-Himalayas-user-preview.png',
  3: '/From-the-Bhagavad-Gita-to-the-Ballot-Box-Applying-Krishnas-Teachings-to-Politics-user-preview.png',
};

export default function Books() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section id="books" className="py-20 bg-[#1A1A2E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-serif text-[#C9A84C] mb-3">
            Published Books
          </h2>
          <div className="w-24 h-1 bg-[#C9A84C] mx-auto mb-4"></div>
          <p className="text-white/60 text-lg">
            Exploring the intersection of policy, culture, and society
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {books.map((book) => {
            const prices = book.formats && book.formats.length > 0
              ? book.formats.map(f => parseFloat(f.price.replace('$', ''))).sort((a, b) => a - b)
              : [];
            const displayPrice = prices.length > 1
              ? `$${prices[0].toFixed(2)} - $${prices[prices.length - 1].toFixed(2)}`
              : book.price;

            return (
              <motion.div
                key={book.id}
                variants={itemVariants}
                className="group"
              >
                <Link href={`/books/${book.slug}`}>
                  <div className="bg-white/5 rounded-lg p-6 border border-white/10 hover:border-[#C9A84C] transition-all duration-300 hover:-translate-y-2 hover:shadow-lg hover:shadow-[#C9A84C]/10 h-full flex flex-col">
                    <div className="flex justify-center mb-4">
                      <div className="w-32 h-40 bg-gradient-to-br from-[#8B1A1A] to-[#C9A84C] rounded-lg flex items-center justify-center relative overflow-hidden">
                        {coverMap[book.id] ? (
                          <Image
                            src={coverMap[book.id]}
                            alt={`${book.title} Cover`}
                            fill
                            sizes="128px"
                            priority
                            className="object-contain"
                          />
                        ) : (
                          <Book className="text-white w-12 h-12" />
                        )}
                        {book.status === 'Available Now' && (
                          <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-[#C9A84C] text-[#1A1A2E] text-[8px] font-bold text-center z-10">
                            Available
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="text-white font-serif text-lg font-semibold text-center mb-2 line-clamp-2">
                      {book.title}
                    </h3>
                    <p className="text-white/60 text-sm text-center mb-3">
                      {book.authors.map(a => a.name).join(', ')}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-[#C9A84C] text-sm font-semibold">
                        {displayPrice}
                      </span>
                      <span className="text-white/40 group-hover:text-[#C9A84C] transition-colors flex items-center gap-1 text-sm">
                        View Details <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
