import { books } from '@/lib/data';
import { notFound } from 'next/navigation';
import BookClient from './BookClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return books.map((book) => ({
    slug: book.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const book = books.find((b) => b.slug === slug);
  return {
    title: `${book?.title} | Opus Publica`,
    description: book?.description,
  };
}

export default async function BookDetailPage({ params }: Props) {
  const { slug } = await params;
  const book = books.find((b) => b.slug === slug);

  if (!book) {
    notFound();
  }

  return <BookClient book={book} />;
}
