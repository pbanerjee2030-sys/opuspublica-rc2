'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen, Download, User, Calendar, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

export interface BookAuthor {
  name: string;
  role: string;
}

export interface BookTestimonial {
  quote: string;
  author: string;
  title: string;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  cover_image?: string | null;
  authors: BookAuthor[];
  isbn?: string | null;
  isbn_ebook?: string | null;
  publication_date?: string | null;
  pages?: number | null;
  language?: string | null;
  format?: string | null;
  price?: string | null;
  ebook_price?: string | null;
  description: string;
  long_description?: string | null;
  table_of_contents?: string[] | null;
  testimonials?: BookTestimonial[] | null;
  categories: string[];
  tags: string[];
  status: string;
  is_available: boolean;
  doi?: string | null;
  has_sample?: boolean;
  sample_path?: string;
  download_path?: string;
  external_url?: string;
  doi_deposit_status?: string | null;
  doi_deposited_at?: string | null;
  doi_deposit_error?: string | null;
}

interface Props {
  book: Book;
}

export default function BookClient({ book }: Props) {
  const coverSrc = book.cover_image;

  // Dynamically build the formats array from isbn and isbn_ebook
  const formats = [];
  if (book.isbn) {
    formats.push({ name: 'Paperback', price: book.price || '', isbn: book.isbn });
  }
  if (book.isbn_ebook) {
    formats.push({ name: 'E-book', price: book.ebook_price || book.price || '', isbn: book.isbn_ebook });
  }


  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans">
            
      {/* Spacer for Fixed Navbar */}
      <div className="h-16"></div>

      <main className="flex-grow bg-bg">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <Link
            href="/#books"
            className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors group text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Books
          </Link>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-bg via-primary/5 to-bg py-16 sm:py-20">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-10 right-20 w-96 h-96 rounded-full border-2 border-accent"></div>
            <div className="absolute bottom-10 left-20 w-64 h-64 rounded-full border-2 border-accent"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-12 items-center">
              {/* Book Cover */}
              <div className="md:col-span-1 flex justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="relative w-36 h-48 sm:w-44 sm:h-60 rounded-lg overflow-hidden shadow-2xl shadow-black/40 border border-border group bg-bg-alt"
                >
                  {coverSrc ? (
                    <Image
                      src={coverSrc}
                      alt={`${book.title} Cover`}
                      fill
                      sizes="(max-width: 640px) 144px, 176px"
                      priority
                      className="object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <BookOpen className="text-white w-16 h-16" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </motion.div>
              </div>

              {/* Book Header details */}
              <div className="md:col-span-3">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-semibold rounded-full uppercase tracking-wider border border-accent/20">
                    {book.status}
                  </span>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-primary mt-4 mb-2 leading-tight">
                    {book.title}
                  </h1>
                  {book.subtitle && (
                    <p className="text-text-secondary/70 text-lg sm:text-xl font-light mb-4">
                      {book.subtitle}
                    </p>
                  )}
                  
                  {/* Authors list with roles */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    {book.authors.map((author, index) => (
                      <div key={index} className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5">
                        <User className="w-3.5 h-3.5 text-accent" />
                        <span className="text-text font-medium text-sm">{author.name}</span>
                        <span className="text-text-secondary/60 text-xs">({author.role})</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-surface border border-border rounded-xl p-4 max-w-2xl text-sm">
                    <div>
                      <span className="text-text-secondary/60 block text-xs mb-0.5">Price</span>
                      <span className="text-accent font-semibold">
                        {formats && formats.length > 0
                          ? `${formats.find(f => f.name === 'E-book')?.price || ''} - ${formats.find(f => f.name === 'Paperback')?.price || ''}`
                          : book.price}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary/60 block text-xs mb-0.5">Format</span>
                      <span className="text-text font-medium">{book.format}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary/60 block text-xs mb-0.5">Pages</span>
                      <span className="text-text font-medium">{book.pages}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary/60 block text-xs mb-0.5">Published</span>
                      <span className="text-text font-medium">{book.publication_date}</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 bg-bg-alt text-text">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Left Column: Description & Testimonials */}
              <div className="lg:col-span-2 space-y-12">
                {/* Description */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-surface rounded-xl p-8 shadow-sm border border-border"
                >
                  <h2 className="text-2xl font-serif text-primary mb-4 font-semibold">Synopsis</h2>
                  <div className="space-y-4 text-base sm:text-lg leading-relaxed text-text-secondary">
                    <p className="font-medium text-text">{book.description}</p>
                    <p>{book.long_description}</p>
                  </div>
                </motion.div>

                {/* Testimonials */}
                {book.testimonials && book.testimonials.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-6"
                  >
                    <h2 className="text-2xl font-serif text-primary font-semibold">Praise for the Book</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {book.testimonials.map((testimonial, index) => (
                        <div key={index} className="bg-surface rounded-xl p-6 shadow-sm border-t-4 border-primary">
                          <p className="italic text-text-secondary mb-4 text-sm sm:text-base leading-relaxed">
                            &ldquo;{testimonial.quote}&rdquo;
                          </p>
                          <div>
                            <h4 className="font-serif text-primary font-bold text-sm">
                              {testimonial.author}
                            </h4>
                            <p className="text-xs text-text-secondary">
                              {testimonial.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right Column: Table of Contents & Specifications */}
              <div className="lg:col-span-1 space-y-8">
                {/* Table of Contents */}
                {book.table_of_contents && book.table_of_contents.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-surface rounded-xl p-6 shadow-sm border border-border"
                  >
                    <h3 className="text-primary font-serif text-xl mb-4 font-semibold border-b border-border pb-2">
                      Table of Contents
                    </h3>
                    <ul className="space-y-3">
                      {book.table_of_contents.map((chapter, index) => (
                        <li key={index} className="flex gap-3 text-text-secondary text-sm sm:text-base">
                          <span className="text-accent font-semibold">{index + 1}.</span>
                          <span>{chapter}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Additional Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-surface rounded-xl p-6 shadow-sm border border-border space-y-4 text-sm"
                >
                  <h3 className="text-primary font-serif text-xl font-semibold border-b border-border pb-2">
                    Specifications
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-text-secondary/80">Language</span>
                      <span className="font-medium text-text">{book.language}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-text-secondary/80">Pages</span>
                      <span className="font-medium text-text">{book.pages}</span>
                    </div>
                    {formats && formats.map((format, idx) => (
                      <div key={idx} className="space-y-1 pt-1 border-b border-border/50 pb-2 last:border-b-0 last:pb-0 last:border-t-0">
                        <span className="font-serif font-semibold text-primary text-xs uppercase tracking-wider block">
                          {format.name} Format
                        </span>
                        <div className="flex justify-between text-xs">
                          <span className="text-text-secondary/80">ISBN</span>
                          <span className="font-mono text-text">{format.isbn}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-text-secondary/80">Price</span>
                          <span className="font-semibold text-primary">{format.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                    {book.categories.map((cat, idx) => (
                      <span key={idx} className="bg-accent/10 text-accent border border-accent/20 rounded px-2 py-0.5 text-xs">
                        {cat}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Downloads / Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-12 p-6 bg-primary rounded-xl border border-accent/20 shadow-lg text-white"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-accent font-serif text-xl mb-1">Get Your Copy</h3>
                  <p className="text-white/70 text-sm">
                    Download sample chapters or get the full version.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  {book.has_sample && book.sample_path && (
                    <a
                      href={book.sample_path}
                      download
                      className="inline-flex items-center gap-2 px-5 py-2.5 border border-accent text-accent hover:bg-accent/10 font-semibold rounded-lg text-sm transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download Sample
                    </a>
                  )}
                  {book.is_available && (
                    <a
                      href={book.external_url || '#'}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-primary font-semibold rounded-lg text-sm transition-all transform hover:scale-105"
                    >
                      <BookOpen className="w-4 h-4" />
                      Buy Now
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
