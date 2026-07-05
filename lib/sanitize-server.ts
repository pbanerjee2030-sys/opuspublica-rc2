import DOMPurify from 'isomorphic-dompurify';

/**
 * Server-safe HTML sanitizer using isomorphic-dompurify.
 * Uses the same allowed tags/attrs as the client-side sanitizeHtml() in lib/sanitize.ts.
 */
export function sanitizeHtmlServer(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre', 'sup', 'sub', 'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}
