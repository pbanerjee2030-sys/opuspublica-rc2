import DOMPurify from 'dompurify';

if (typeof window !== 'undefined') {
  (window as any).DOMPurify = DOMPurify;
}

export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    return dirty
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'sup', 'sub', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}
