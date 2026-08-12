'use client';

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { BookOpen } from 'lucide-react';

interface CoverImageProps extends Omit<ImageProps, 'src'> {
  src?: string | null;
  fallbackIcon?: React.ReactNode;
}

export default function CoverImage({ src, alt, fallbackIcon, ...props }: CoverImageProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-accent/5">
        {fallbackIcon || <BookOpen className="w-8 h-8 text-accent/30" />}
      </div>
    );
  }

  return <Image src={src} alt={alt} onError={() => setError(true)} {...props} />;
}
