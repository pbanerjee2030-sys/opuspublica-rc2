'use client';

import DOMPurify from 'isomorphic-dompurify';

interface Props {
  html: string;
  className?: string;
}

export default function SafeHtml({ html, className }: Props) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'sup', 'sub', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  });

  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
