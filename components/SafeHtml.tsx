'use client';

import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

interface Props {
  html: string;
  className?: string;
}

export default function SafeHtml({ html, className }: Props) {
  const [clean, setClean] = useState(html);

  useEffect(() => {
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'sup', 'sub', 'span', 'div'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
    });
    setClean(sanitized);
  }, [html]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
