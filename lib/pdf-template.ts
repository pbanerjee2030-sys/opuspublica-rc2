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
  const sanitizedContent = article.content
    ? sanitizeHtmlServer(article.content)
    : '<p><em>No content available.</em></p>';

  const keywordsArray = Array.isArray(article.keywords)
    ? article.keywords
    : typeof article.keywords === 'string'
      ? article.keywords.split(',').map((k) => k.trim())
      : [];

  const authorNames = article.authors.map((a) => a.name).join(', ');
  const affiliations = article.authors
    .filter((a) => a.affiliation)
    .map((a, i) => `<sup>${i + 1}</sup>${a.affiliation}`)
    .join('; ');

  const authorNamesWithSup = article.authors
    .map((a, i) => `${a.name}${a.affiliation ? `<sup>${i + 1}</sup>` : ''}`)
    .join(', ');

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  const publishedYear = article.published_at
    ? new Date(article.published_at).getFullYear()
    : new Date().getFullYear();

  const doiUrl = article.doi ? `https://doi.org/${article.doi}` : null;

  const citationText = `${authorNames} (${publishedYear}). ${article.title}. ${article.journal_name || 'Opus Publica'}. ${article.doi ? `https://doi.org/${article.doi}` : ''}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    /* ── Reset & Base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --navy: #1A1A2E;
      --oxblood: #6B2737;
      --gold: #C9A84C;
      --dark-bg: #0D0D14;
      --text-primary: #1a1a1a;
      --text-secondary: #4a4a5a;
      --text-muted: #6b6b7b;
      --border: #e2e2e8;
      --font-serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    @page {
      size: A4;
      margin: 25mm 20mm 30mm 20mm;

      @bottom-center {
        content: counter(page);
        font-family: var(--font-sans);
        font-size: 9px;
        color: var(--text-muted);
      }

      @bottom-left {
        content: "${article.journal_name || 'Opus Publica'}";
        font-family: var(--font-sans);
        font-size: 8px;
        color: var(--text-muted);
      }

      @bottom-right {
        content: "${article.doi || ''}";
        font-family: var(--font-sans);
        font-size: 8px;
        color: var(--text-muted);
      }
    }

    @page :first {
      margin-top: 15mm;
    }

    body {
      font-family: var(--font-sans);
      font-size: 10.5pt;
      line-height: 1.7;
      color: var(--text-primary);
      background: #ffffff;
    }

    /* ── Header / Masthead ── */
    .masthead {
      background: var(--navy);
      margin: -15mm -20mm 0 -20mm;
      padding: 18mm 20mm 12mm 20mm;
      text-align: center;
      page-break-inside: avoid;
    }

    .masthead-title {
      font-family: var(--font-serif);
      font-size: 22pt;
      font-weight: 700;
      color: var(--gold);
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .masthead-subtitle {
      font-family: var(--font-sans);
      font-size: 8pt;
      color: rgba(255, 255, 255, 0.5);
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .masthead-journal {
      font-family: var(--font-serif);
      font-size: 11pt;
      color: rgba(255, 255, 255, 0.85);
      margin-top: 10px;
      font-style: italic;
    }

    .masthead-divider {
      width: 60px;
      height: 2px;
      background: var(--gold);
      margin: 10px auto 0;
      opacity: 0.6;
    }

    /* ── Article Title ── */
    .article-title {
      font-family: var(--font-serif);
      font-size: 18pt;
      font-weight: 700;
      color: var(--navy);
      line-height: 1.3;
      margin-top: 24px;
      margin-bottom: 12px;
      text-align: center;
    }

    /* ── Author Info ── */
    .authors {
      text-align: center;
      font-size: 10pt;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .affiliations {
      text-align: center;
      font-size: 8.5pt;
      color: var(--text-muted);
      font-style: italic;
      margin-bottom: 6px;
    }

    .published-date {
      text-align: center;
      font-size: 8.5pt;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .doi-line {
      text-align: center;
      font-size: 8.5pt;
      color: var(--gold);
      margin-bottom: 20px;
    }

    .doi-line a {
      color: var(--gold);
      text-decoration: none;
    }

    /* ── Meta Separator ── */
    .meta-separator {
      border: none;
      border-top: 1px solid var(--border);
      margin: 20px 0;
    }

    /* ── Abstract ── */
    .abstract-section {
      background: #f8f8fa;
      border-left: 3px solid var(--oxblood);
      padding: 16px 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .section-label {
      font-family: var(--font-sans);
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--oxblood);
      margin-bottom: 8px;
    }

    .abstract-text {
      font-size: 9.5pt;
      line-height: 1.65;
      color: var(--text-secondary);
    }

    /* ── Keywords ── */
    .keywords-section {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }

    .keywords-list {
      font-size: 9pt;
      color: var(--text-secondary);
    }

    .keyword-tag {
      display: inline-block;
      background: #f0f0f5;
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 2px 8px;
      margin: 2px 4px 2px 0;
      font-size: 8.5pt;
      color: var(--text-secondary);
    }

    /* ── Body Content ── */
    .body-content {
      margin-top: 8px;
    }

    .body-content h2 {
      font-family: var(--font-serif);
      font-size: 14pt;
      font-weight: 600;
      color: var(--navy);
      margin-top: 28px;
      margin-bottom: 10px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 6px;
    }

    .body-content h3 {
      font-family: var(--font-serif);
      font-size: 12pt;
      font-weight: 600;
      color: var(--oxblood);
      margin-top: 22px;
      margin-bottom: 8px;
    }

    .body-content h4 {
      font-family: var(--font-serif);
      font-size: 11pt;
      font-weight: 600;
      color: var(--navy);
      margin-top: 18px;
      margin-bottom: 6px;
    }

    .body-content p {
      margin-bottom: 10px;
      text-align: justify;
      hyphens: auto;
    }

    .body-content ul, .body-content ol {
      margin: 10px 0 10px 24px;
    }

    .body-content li {
      margin-bottom: 4px;
    }

    .body-content blockquote {
      border-left: 3px solid var(--gold);
      margin: 16px 0;
      padding: 10px 20px;
      background: #fdfdf8;
      font-style: italic;
      color: var(--text-secondary);
    }

    .body-content a {
      color: var(--oxblood);
      text-decoration: underline;
    }

    .body-content pre, .body-content code {
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      background: #f5f5f8;
      border-radius: 3px;
    }

    .body-content pre {
      padding: 12px 16px;
      margin: 12px 0;
      overflow-x: auto;
      border: 1px solid var(--border);
    }

    .body-content code {
      padding: 1px 4px;
    }

    .body-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
      font-size: 9.5pt;
    }
    .body-content table th, .body-content table td {
      border: 1px solid var(--border);
      padding: 8px 10px;
      text-align: left;
    }
    .body-content table th {
      background: #f5f5f8;
      font-weight: 600;
      color: var(--navy);
    }
    .body-content img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 20px auto;
      border-radius: 4px;
    }

    /* ── License & Citation Footer ── */
    .license-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid var(--navy);
      page-break-inside: avoid;
    }

    .license-badge {
      display: inline-block;
      background: var(--navy);
      color: var(--gold);
      font-size: 7.5pt;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 3px;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    .license-text {
      font-size: 8.5pt;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 16px;
    }

    .citation-box {
      background: #f8f8fa;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 14px 18px;
    }

    .citation-label {
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--navy);
      margin-bottom: 6px;
    }

    .citation-text {
      font-size: 9pt;
      color: var(--text-secondary);
      line-height: 1.55;
      word-break: break-word;
    }
  </style>
</head>
<body>

  <!-- Masthead -->
  <div class="masthead">
    <div class="masthead-title">Opus Publica</div>
    <div class="masthead-subtitle">Global Public Policy Research & Publishing</div>
    ${article.journal_name ? `<div class="masthead-journal">${article.journal_name}</div>` : ''}
    <div class="masthead-divider"></div>
  </div>

  <!-- Article Title -->
  <h1 class="article-title">${escapeHtml(article.title)}</h1>

  <!-- Authors -->
  <div class="authors">${authorNamesWithSup}</div>
  ${affiliations ? `<div class="affiliations">${affiliations}</div>` : ''}

  <!-- Date & DOI -->
  <div class="published-date">Published: ${publishedDate}</div>
  ${doiUrl ? `<div class="doi-line"><a href="${doiUrl}">${article.doi}</a></div>` : ''}

  <hr class="meta-separator">

  <!-- Abstract -->
  ${article.abstract ? `
  <div class="abstract-section">
    <div class="section-label">Abstract</div>
    <div class="abstract-text">${escapeHtml(article.abstract)}</div>
  </div>
  ` : ''}

  <!-- Keywords -->
  ${keywordsArray.length > 0 ? `
  <div class="keywords-section">
    <div class="section-label">Keywords</div>
    <div class="keywords-list">
      ${keywordsArray.map((kw: string) => `<span class="keyword-tag">${escapeHtml(kw)}</span>`).join(' ')}
    </div>
  </div>
  ` : ''}

  <!-- Body Content -->
  <div class="body-content">
    ${sanitizedContent}
  </div>

  <!-- License & Citation -->
  <div class="license-section">
    <div class="license-badge">CC BY 4.0</div>
    <div class="license-text">
      This article is licensed under a
      <a href="https://creativecommons.org/licenses/by/4.0/" style="color: var(--oxblood);">Creative Commons Attribution 4.0 International License</a>.
      You are free to share and adapt this work, provided appropriate credit is given to the original author(s)
      and a link to the license is provided.
    </div>

    <div class="citation-box">
      <div class="citation-label">Suggested Citation</div>
      <div class="citation-text">${escapeHtml(citationText)}</div>
    </div>
  </div>

</body>
</html>`;
}

/** Simple HTML-entity escaping for non-content text (titles, author names, etc.) */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
