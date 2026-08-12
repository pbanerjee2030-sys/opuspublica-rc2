import * as fs from 'fs';
import { sanitizeHtmlServer } from './sanitize-server';

interface ArticleData {
  id: string;
  title: string;
  abstract: string | null;
  content: string | null;
  keywords: string[] | string | null;
  doi: string | null;
  published_at: string | null;
  journal_name: string | null;
  journal_issn: string | null;
  authors: { name: string; affiliation: string | null }[];
}

/**
 * Renders a full HTML page for the house-styled published PDF.
 * Matches the site's design language: navy/oxblood/gold palette,
 * Playfair Display serif headlines, Inter body text.
 */
export function renderArticleHtml(article: ArticleData): string {
  if (article.content && article.content.includes('<html')) {
    // If the content is already a full HTML document (from HTMLRenderer), use it directly.
    return article.content;
  }
  
  // Fallback if it's not a full HTML document (should not happen in OPCE RC1)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(article.title)}</title>
</head>
<body>
  ${article.content || '<p><em>No content available.</em></p>'}
</body>
</html>`;
}

/** Simple HTML-entity escaping for fallback */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
