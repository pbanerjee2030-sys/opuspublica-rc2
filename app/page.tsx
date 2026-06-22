'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import Hero from '@/sections/Hero';
import Journals from '@/sections/Journals';
import Books from '@/sections/Books';
import About from '@/sections/About';
import Contact from '@/sections/Contact';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Navbar />
      <Hero />
      <Journals />
      <Books />
      <About />
      <Contact />
      <Footer />
      <ScrollToTop />
    </motion.main>
  );
}
