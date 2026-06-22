'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export default function Hero() {
  return (
    <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#1A1A2E] via-[#8B1A1A]/30 to-[#1A1A2E]">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full border-2 border-[#C9A84C]"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full border-2 border-[#C9A84C]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border-2 border-[#8B1A1A]"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            <span className="text-white">Welcome to</span>
            <br />
            <span className="bg-gradient-to-r from-[#C9A84C] to-[#D4AF37] bg-clip-text text-transparent">
              Opus Publica
            </span>
          </h1>
          
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            A leading global platform for public policy research and publishing, 
            dedicated to advancing knowledge that drives real-world impact.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="#journals"
              className="px-8 py-3 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#1A1A2E] font-semibold rounded-lg transition-all transform hover:scale-105"
            >
              Explore Our Journals
            </Link>
            <Link
              href="#books"
              className="px-8 py-3 border-2 border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#1A1A2E] font-semibold rounded-lg transition-all transform hover:scale-105"
            >
              View Our Books
            </Link>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="text-[#C9A84C] w-8 h-8" />
        </motion.div>
      </div>
    </section>
  );
}
