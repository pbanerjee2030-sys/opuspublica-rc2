
/**
 * Opus Publica Composition Engine (OPCE) — HTML Document Renderer
 *
 * Deterministic HTML5 renderer converting OpusDocument ASTs and ResolvedStandards
 * into styled publication-ready HTML string representations.
 */

import type { DocumentRenderer } from './renderer';
import type {
  OpusDocument,
  Block,
  Inline,
  Reference,
  Footnote,
} from '../model/types';
import type { ResolvedStandard } from '../standards/types';

/**
 * Renderer producing standalone publication-ready HTML5 documents.
 */
export class HTMLRenderer implements DocumentRenderer {
  public readonly format = 'html' as const;

  /**
   * Renders canonical OpusDocument AST and ResolvedStandard into HTML5 string.
   */
  public async render(document: OpusDocument, standard: ResolvedStandard): Promise<string> {

    
    const css = this.generateCss(standard);
    const coverPageHtml = this.renderCoverPage(document, standard);
    const metadataHtml = this.renderMetadataBlock(document, standard);
    const bodyHtml = this.renderBodyBlocks(document.body);
    const footnotesHtml = this.renderFootnotesSection(document.footnotes);
    const referencesHtml = this.renderReferencesSection(document.references, standard);
    const copyrightHtml = this.renderCopyrightFooter(document, standard);
    const watermarkHtml = this.renderWatermarkOverlay(standard);

    const dir = standard.typography.textDirection || 'ltr';
    const lang = document.metadata.language || 'en';

    return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.escapeHtml(document.metadata.title)}</title>
  <style>
${css}
  </style>
</head>
<body>
  ${watermarkHtml}
  <div class="article-container">
    ${coverPageHtml}
    ${metadataHtml}
    <main class="article-body">
      ${bodyHtml}
    </main>
    ${footnotesHtml}
    ${referencesHtml}
    ${copyrightHtml}
  </div>
</body>
</html>`;
  }

  /**
   * Generates scoped CSS stylesheet from ResolvedStandard.
   */
  private generateCss(standard: ResolvedStandard): string {
    const page = standard.page;
    const typo = standard.typography;
    const cover = standard.coverPage;
    const tbl = standard.tables;
    const wm = standard.watermark;

    return `
      @page {
        size: ${page.size.width}mm ${page.size.height}mm;
        margin: ${page.margins.top}mm ${page.margins.right}mm ${page.margins.bottom}mm ${page.margins.left}mm;
      }
      @page:first {
        margin-top: 0mm;
        margin-bottom: 0mm;
      }
      body {
        font-family: ${typo.bodyFont.family};
        font-size: ${typo.bodyFont.sizeInPt}pt;
        font-weight: ${typo.bodyFont.weight};
        line-height: ${typo.bodyLineHeight};
        color: #23201A;
        background-color: #FFFFFF;
        margin: 0;
        padding: 0;
        text-align: ${typo.textAlignment};
      }
      .article-container {
        max-width: 820px;
        margin: 0 auto;
        padding: 40px 60px;
      }
      .cover-masthead {
        margin-top: ${page.margins.top}mm;
        border-top: 4px solid ${cover.accentColor};
        border-bottom: 1px solid #E0D7C2;
        padding: 24px 0;
        margin-bottom: 48px;
        text-align: center;
      }
      .cover-masthead h1 {
        font-family: ${typo.headingFonts[1].family};
        color: #111;
        margin: 0 0 8px 0;
        font-size: 16pt;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      .masthead-subtitle {
        font-size: 11pt;
        color: #555;
        margin: 0 0 4px 0;
      }
      .masthead-journal {
        font-size: 11pt;
        font-weight: 600;
        color: ${cover.accentColor};
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .metadata-header {
        margin-bottom: 48px;
      }
      .article-title {
        font-family: ${typo.headingFonts[1].family};
        font-size: 28pt;
        line-height: 1.25;
        font-weight: 700;
        color: #111;
        margin: 0 0 16px 0;
      }
      .article-subtitle {
        font-family: ${typo.headingFonts[1].family};
        font-size: 18pt;
        font-weight: 400;
        color: #444;
        margin: 0 0 24px 0;
        line-height: 1.3;
      }
      .author-block {
        margin-bottom: 32px;
      }
      .author-names {
        font-size: 12pt;
        line-height: 1.6;
        color: #111;
        margin-bottom: 12px;
      }
      .author-meta {
        font-size: 9.5pt;
        line-height: 1.5;
        color: #555;
        border-left: 3px solid ${cover.accentColor};
        padding-left: 16px;
        margin-top: 12px;
      }
      .abstract-box {
        margin: 48px 0;
        padding: 32px 40px;
        border-top: 2px solid ${cover.accentColor};
        border-bottom: 2px solid ${cover.accentColor};
        background: #FAFAFA;
      }
      .abstract-heading {
        font-family: ${typo.headingFonts[1].family};
        font-size: 11pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        margin: 0 0 16px 0;
        color: #111;
      }
      .abstract-text {
        font-size: 11pt;
        line-height: 1.8;
        color: #222;
        margin: 0;
        text-align: justify;
      }
      h1, h2, h3, h4, h5, h6 {
        font-family: ${typo.headingFonts[1].family};
        color: #0F2C4A;
        margin-top: 32px;
        margin-bottom: 16px;
        page-break-after: avoid;
        page-break-inside: avoid;
      }
      h1 { font-size: 24pt; border-bottom: 1px solid #E0D7C2; padding-bottom: 8px; }
      h2 { font-size: 18pt; }
      h3 { font-size: 14pt; }
      p { 
        margin-bottom: 20px; 
        line-height: 1.8;
        text-align: justify;
        widows: 2;
        orphans: 2;
      }
      li {
        widows: 2;
        orphans: 2;
      }
      .table-wrapper {
        overflow-x: auto;
        margin: 24px 0;
        width: 100%;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
        page-break-inside: avoid;
      }
      th {
        background-color: ${tbl.headerBackground || '#F4EFE2'};
        font-family: ${tbl.headerFont.family};
        font-weight: ${tbl.headerFont.weight};
        padding: 8px 12px;
        border: 1px solid #E0D7C2;
        text-align: left;
      }
      td {
        padding: 8px 12px;
        border: 1px solid #E0D7C2;
      }
      figure {
        margin: 24px 0;
        text-align: center;
        page-break-inside: avoid;
      }
      figure img {
        max-width: 100%;
        height: auto;
      }
      figcaption {
        font-family: ${standard.figures.captionFont.family};
        font-style: italic;
        font-size: ${standard.figures.captionFont.sizeInPt}pt;
        color: #5A5245;
        margin-top: 6px;
      }
      .watermark-overlay {
        position: fixed;
        top: 40%;
        left: 10%;
        right: 10%;
        transform: rotate(${wm.rotation}deg);
        font-size: ${wm.font.sizeInPt}pt;
        font-weight: ${wm.font.weight};
        color: rgba(200, 0, 0, ${wm.opacity});
        pointer-events: none;
        text-align: center;
        z-index: 9999;
      }
      .references-section, .footnotes-section {
        margin-top: 32px;
        border-top: 1px solid #E0D7C2;
        padding-top: 16px;
      }
      .reference-item {
        font-size: 9.5pt;
        margin-bottom: 12px;
        word-break: break-word;
        text-indent: -1.5em;
        padding-left: 1.5em;
        page-break-inside: avoid;
      }
    `;
  }

  /**
   * Renders opening cover masthead HTML.
   */
  private renderCoverPage(doc: OpusDocument, standard: ResolvedStandard): string {
    if (!standard.coverPage.enabled) return '';
    const cover = standard.coverPage;
    return `
      <header class="cover-masthead">
        <h1>${this.escapeHtml(cover.mastheadTitle)}</h1>
        ${cover.mastheadSubtitle ? `<p class="masthead-subtitle">${this.escapeHtml(cover.mastheadSubtitle)}</p>` : ''}
        ${cover.showJournalName ? `<p class="masthead-journal">${this.escapeHtml(doc.metadata.journal.name)}</p>` : ''}
      </header>
    `;
  }

  /**
   * Renders metadata header block (title, authors, abstract, dates, DOI).
   */
  private renderMetadataBlock(doc: OpusDocument, standard: ResolvedStandard): string {
    const meta = doc.metadata;
    const authorDetails = meta.authors
      .map((a) => {
        let text = `<strong>${this.escapeHtml(a.name)}</strong>`;
        if (a.orcid) {
          text += ` <a href="https://orcid.org/${a.orcid}" style="color: ${standard.coverPage.accentColor}; text-decoration: none; font-weight: normal;">(ORCID: ${a.orcid})</a>`;
        }
        return text;
      })
      .join(', ');

    return `
      <section class="metadata-header">
        <h1 class="article-title">${this.escapeHtml(meta.title)}</h1>
        ${meta.subtitle ? `<h2 class="article-subtitle">${this.escapeHtml(meta.subtitle)}</h2>` : ''}
        
        <div class="author-block">
          <div class="author-names">${authorDetails || 'Anonymous'}</div>
          <div class="author-meta">
            ${meta.journal.issn ? `<div>ISSN: ${this.escapeHtml(meta.journal.issn)}</div>` : ''}
            ${meta.doi && standard.metadata.doiPosition ? `<div>DOI: <a href="https://doi.org/${meta.doi}" style="color: ${standard.coverPage.accentColor}; text-decoration: none;">https://doi.org/${meta.doi}</a></div>` : ''}
          </div>
        </div>
        
        ${meta.abstract ? `
        <div class="abstract-box">
          <h3 class="abstract-heading">Abstract</h3>
          <p class="abstract-text">${this.escapeHtml(meta.abstract)}</p>
          ${meta.keywords && meta.keywords.length > 0 ? `
          <div class="keyword-block" style="margin-top: 24px; font-size: 10pt; color: #444;">
            <strong>Keywords:</strong> ${meta.keywords.map(k => this.escapeHtml(k)).join(', ')}
          </div>` : ''}
        </div>` : ''}
      </section>
    `;
  }

  /**
   * Renders document body blocks recursively into HTML string.
   */
  private renderBodyBlocks(blocks: Block[]): string {
    return blocks.map((b) => this.renderBlock(b)).join('\n');
  }

  /**
   * Renders individual block AST node.
   */
  private renderBlock(block: Block): string {
    switch (block.type) {
      case 'paragraph':
        return `<p>${this.renderInlines(block.children)}</p>`;
      case 'heading':
        return `<h${block.level} id="${block.id}">${this.renderInlines(block.children)}</h${block.level}>`;
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        const items = block.items.map((i) => `<li>${this.renderBodyBlocks(i.children)}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      case 'table': {
        const headerHtml = block.header
          ? `<thead>${block.header.map((r) => `<tr>${r.cells.map((c) => `<th>${this.renderBodyBlocks(c.children)}</th>`).join('')}</tr>`).join('')}</thead>`
          : '';
        const bodyRows = block.rows
          ? `<tbody>${block.rows.map((r) => `<tr>${r.cells.map((c) => `<td>${this.renderBodyBlocks(c.children)}</td>`).join('')}</tr>`).join('')}</tbody>`
          : '';
        const caption = block.caption ? `<caption>${this.renderInlines(block.caption)}</caption>` : '';
        return `<div class="table-wrapper"><table id="${block.id}">${caption}${headerHtml}${bodyRows}</table></div>`;
      }
      case 'figure': {
        const caption = block.caption ? `<figcaption>${this.renderInlines(block.caption)}</figcaption>` : '';
        const alt = block.alt ? ` alt="${this.escapeHtml(block.alt)}"` : '';
        return `<figure id="${block.id}"><img src="${this.escapeHtml(block.src)}"${alt} />${caption}</figure>`;
      }
      case 'equation':
        return `<div class="equation-block" id="${block.id}"><code>${this.escapeHtml(block.source)}</code></div>`;
      case 'blockquote':
        return `<blockquote>${this.renderBodyBlocks(block.children)}</blockquote>`;
      case 'codeblock':
        return `<pre><code>${this.escapeHtml(block.code)}</code></pre>`;
      case 'thematicbreak':
        return '<hr />';
      default:
        return '';
    }
  }

  /**
   * Renders inline AST nodes into HTML text string.
   */
  private renderInlines(inlines: Inline[]): string {
    return inlines.map((i) => this.renderInline(i)).join('');
  }

  /**
   * Renders individual inline node.
   */
  private renderInline(inline: Inline): string {
    switch (inline.type) {
      case 'text':
        return this.escapeHtml(inline.value);
      case 'styled': {
        const tagMap = { bold: 'strong', italic: 'em', superscript: 'sup', subscript: 'sub', code: 'code' };
        const tag = tagMap[inline.style] || 'span';
        return `<${tag}>${this.renderInlines(inline.children)}</${tag}>`;
      }
      case 'link':
        return `<a href="${this.escapeHtml(inline.url)}">${this.renderInlines(inline.children)}</a>`;
      case 'inlinemath':
        return `<code>${this.escapeHtml(inline.source)}</code>`;
      case 'footnoteref':
        return `<sup><a href="#fn-${inline.id}">${inline.id}</a></sup>`;
      case 'citationref':
        return `[${inline.ids.join(', ')}]`;
      default:
        return '';
    }
  }

  /**
   * Renders footnotes section HTML.
   */
  private renderFootnotesSection(footnotes: Footnote[]): string {
    if (!footnotes || footnotes.length === 0) return '';
    const items = footnotes
      .map((fn) => `<div class="footnote-item" id="fn-${fn.id}"><sup>${fn.id}</sup> ${this.renderBodyBlocks(fn.children)}</div>`)
      .join('\n');
    return `<section class="footnotes-section"><h3>Footnotes</h3>${items}</section>`;
  }

  /**
   * Renders references bibliography section HTML.
   */
  private renderReferencesSection(references: Reference[], standard: ResolvedStandard): string {
    if (!references || references.length === 0) return '';
    const items = references
      .map((r, idx) => {
        const num = standard.references.numbering === 'bracketed' ? `[${idx + 1}] ` : '';
        const authors = r.authors.map((a) => `${a.surname}, ${a.given}`).join(', ');
        const title = this.escapeHtml(r.title);
        const doiStr = r.doi ? ` DOI: <a href="https://doi.org/${r.doi}">${r.doi}</a>` : '';
        return `<div class="reference-item" id="${r.id}">${num}${authors} (${r.year || 'n.d.'}). <em>${title}</em>. ${r.containerTitle || ''}.${doiStr}</div>`;
      })
      .join('\n');

    return `<section class="references-section"><h3>${this.escapeHtml(standard.references.sectionTitle)}</h3>${items}</section>`;
  }

  /**
   * Renders copyright notice footer.
   */
  private renderCopyrightFooter(doc: OpusDocument, standard: ResolvedStandard): string {
    const copy = doc.metadata.copyright;
    return `
      <footer class="copyright-footer">
        <p>&copy; ${copy.year} ${this.escapeHtml(copy.holder)}. Licensed under <a href="${copy.licenseUrl}">${this.escapeHtml(copy.licenseType)}</a>.</p>
        ${standard.copyright.showLicenseBadge ? `<p><span class="license-badge">${this.escapeHtml(copy.licenseType)}</span></p>` : ''}
      </footer>
    `;
  }

  /**
   * Renders draft watermark overlay if present in standard.
   */
  private renderWatermarkOverlay(standard: ResolvedStandard): string {
    if (!standard.watermark || !standard.watermark.text) return '';
    return `<div class="watermark-overlay">${this.escapeHtml(standard.watermark.text)}</div>`;
  }

  /**
   * Helper escaping HTML special characters to prevent XSS and double-escaping.
   */
  private escapeHtml(text: string): string {
    if (!text) return '';
    
    let current = text;
    let prev = '';
    // Resolve double-escaped entities
    while (current !== prev) {
       prev = current;
       current = current
          .replace(/&amp;amp;/g, '&amp;')
          .replace(/&amp;lt;/g, '&lt;')
          .replace(/&amp;gt;/g, '&gt;')
          .replace(/&amp;quot;/g, '&quot;')
          .replace(/&amp;#0?39;/g, '&#039;')
          .replace(/&amp;#x[0-9a-fA-F]+;/g, (match) => match.replace('&amp;', '&'))
          .replace(/&amp;[a-zA-Z]+;/g, (match) => match.replace('&amp;', '&'));
    }

    // Escape unescaped characters
    return current
      .replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
