import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import BookClient from './BookClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const supabase = getSupabaseAdmin();
  const { data: books } = await (supabase as any).from('books').select('slug');
  return (books || []).map((book: any) => ({
    slug: book.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();
  const { data: book } = await (supabase as any)
    .from('books')
    .select('title, description')
    .eq('slug', slug)
    .single();

  if (!book) return { title: 'Book Not Found | Opus Publica' };
  return {
    title: `${book.title} | Opus Publica`,
    description: book.description,
  };
}

export default async function BookDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();
  const { data: book } = await (supabase as any)
    .from('books')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!book) {
    notFound();
  }

  return <BookClient book={book} />;
}

