import { journals } from '@/lib/data';
import { notFound } from 'next/navigation';
import JournalClient from './JournalClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return journals.map((journal) => ({
    slug: journal.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const journal = journals.find((j) => j.slug === slug);
  return {
    title: `${journal?.title} | Opus Publica`,
    description: journal?.desc,
  };
}

export default async function JournalDetailPage({ params }: Props) {
  const { slug } = await params;
  const journal = journals.find((j) => j.slug === slug);

  if (!journal) {
    notFound();
  }

  return <JournalClient journal={journal} />;
}
