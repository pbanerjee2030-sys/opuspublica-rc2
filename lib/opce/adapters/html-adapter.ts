import DOMPurify from 'isomorphic-dompurify';
import * as cheerio from 'cheerio';
import type { ManuscriptAdapter, AdapterContext } from './adapter';
import type {
  OpusDocument,
  Block,
  Inline,
  TableRow,
  TableCell,
  ListBlock,
  ListItem
} from '../model/types';
import {
  createDocument,
  createParagraphBlock,
  createHeadingBlock,
  createTableBlock,
  createFigureBlock,
  createTextInline,
  createStyledInline,
  createLinkInline,
} from '../model/document-builder';

export class HTMLAdapter implements ManuscriptAdapter {
  public readonly name = 'html-adapter';

  public accepts(mimeType: string): boolean {
    const clean = mimeType.trim().toLowerCase();
    return clean === 'text/html' || clean === 'application/xhtml+xml';
  }

  public async parse(input: Buffer | string, context: AdapterContext): Promise<OpusDocument> {
    let rawHtml = typeof input === 'string' ? input : input.toString('utf-8');

    // Correct HTML entity handling (decode double-escaped entities exactly once)
    rawHtml = rawHtml
      .replace(/&amp;amp;/g, '&amp;')
      .replace(/&amp;lt;/g, '&lt;')
      .replace(/&amp;gt;/g, '&gt;')
      .replace(/&amp;quot;/g, '&quot;')
      .replace(/&amp;#(\d+);/g, '&#$1;')
      .replace(/&amp;#x([0-9a-fA-F]+);/gi, '&#x$1;');

    
    const mainBodyMatch = /<main[^>]*class="article-body"[^>]*>([\s\S]*?)<\/main>/i.exec(rawHtml);
    if (mainBodyMatch) {
      rawHtml = mainBodyMatch[1];
    }

    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['figure', 'figcaption', 'hr', 'section', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption', 'blockquote', 'strong', 'b', 'em', 'i', 'code', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'sup', 'sub', 'br'],
      ADD_ATTR: ['src', 'alt', 'colspan', 'rowspan', 'href', 'title', 'class', 'id'],
    });

    const htmlWithFixedBreaks = sanitizedHtml.replace(/<br\s*\/?>/gi, '</p><p>');

    const blocks = this.parseHtmlToBlocks(htmlWithFixedBreaks, context);

    const pubCtx = context.publicationContext;

    return createDocument(
      context.articleId,
      {
        journal: {
          id: pubCtx?.identifiers?.journalId || context.journalId,
          name: pubCtx?.journal?.name || 'Academic Journal',
          slug: pubCtx?.journal?.slug || 'journal',
          issn: pubCtx?.journal?.issn || null,
          publisher: pubCtx?.journal?.publisher || 'Advocacy Unified Network',
          licenseType: 'CC BY 4.0',
        },
        title: pubCtx?.article?.title || 'Untitled Article',
        abstract: pubCtx?.article?.abstract || null,
        doi: pubCtx?.article?.doi || null,
        keywords: pubCtx?.article?.keywords || [],
        authors: pubCtx?.authors ? pubCtx.authors.map((a: any) => ({
          name: a.name,
          givenName: null,
          surname: a.name,
          orcid: a.orcid || null,
          correspondingAuthor: false,
          email: null,
          affiliations: a.affiliations ? a.affiliations.map((aff: any) => ({
            name: aff.name,
            rorId: a.rorId || null,
            country: null
          })) : []
        })) : [],
        funding: pubCtx?.funding?.funder_name ? [{
          funderName: pubCtx.funding.funder_name,
          funderId: pubCtx.funding.funder_id || null,
          awardNumber: pubCtx.funding.funder_award_number || null,
        }] : [],
        declarations: {
          conflictOfInterest: pubCtx?.declarations?.conflict_of_interest_statement || null,
          dataAvailability: pubCtx?.declarations?.data_availability_statement || null,
          ethicsApproval: pubCtx?.declarations?.ethics_approval_statement || null,
        },
        dates: {
          received: null,
          accepted: null,
          published: pubCtx?.article?.chronology?.publishedAt || null,
          revised: null,
        },
        copyright: {
          holder: pubCtx?.journal?.publisher || 'Advocacy Unified Network',
          year: new Date().getFullYear(),
          licenseType: 'CC BY 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        }
      },
      blocks
    );
  }

  private parseHtmlToBlocks(html: string, context: AdapterContext): Block[] {
    if (!html || !html.trim()) {
      return [createParagraphBlock([createTextInline('No content available.')])];
    }

    const $ = cheerio.load(html, null, false);

    // 1. Remove Word TOC by structural classes/links
    $('[class*="MsoToc"]').remove();
    $('a[href^="#_Toc"]').closest('p, div, h1, h2, h3').remove();
    $('.TOC, .toc, nav[role="doc-toc"]').remove();

    // 2. Remove Word field codes and instructional artefacts
    $('span[style*="mso-element:field-begin"]').remove();
    $('span[style*="mso-element:field-separator"]').remove();
    $('span[style*="mso-element:field-end"]').remove();
    $('p:contains("ADDIN EN.REFLIST")').remove();
    $('p:contains("Right-click the table of contents")').remove();
    $('p:contains("Update Field")').remove();
    $('.WordSection1').removeClass('WordSection1');

    // 3. (DOM deduplication logic removed in favor of AST deduplication below)

    const blocks: Block[] = [];

    const rootNodes = $.root().contents().toArray();
    
    let headingCounter = 1;
    let tableCounter = 1;
    let figureCounter = 1;

    const parseNodeToBlocks = (node: any): Block[] => {
      const el = node;
      
      if (node.type === 'text') {
        const text = $(node).text().trim();
        if (text) {
          return [createParagraphBlock([createTextInline(text)])];
        }
        return [];
      }

      if (node.type !== 'tag') {
        return [];
      }

      const tagName = el.name.toLowerCase();

      if (tagName.startsWith('h') && tagName.length === 2) {
        const levelStr = tagName.charAt(1);
        if (levelStr >= '1' && levelStr <= '6') {
          const level = parseInt(levelStr, 10) as 1 | 2 | 3 | 4 | 5 | 6;
          const inlines = this.parseInlines($, el);
          return [createHeadingBlock(level, inlines, `h-${headingCounter++}`)];
        }
      }

      if (tagName === 'p') {
        const inlines = this.parseInlines($, el);
        if (inlines.length > 0) {
          return [createParagraphBlock(inlines)];
        }
        return [];
      }

      if (tagName === 'ul' || tagName === 'ol') {
        const ordered = tagName === 'ol';
        const items: ListItem[] = [];
        $(el).children('li').each((_, li) => {
          const itemBlocks: Block[] = [];
          $(li).contents().each((_, child) => {
             const childBlocks = parseNodeToBlocks(child);
             itemBlocks.push(...childBlocks);
          });
          if (itemBlocks.length === 0) {
             const inlines = this.parseInlines($, li);
             if (inlines.length > 0) itemBlocks.push(createParagraphBlock(inlines));
          }
          items.push({ children: itemBlocks });
        });
        
        const listBlock: ListBlock = {
           type: 'list',
           ordered,
           items
        };
        return [listBlock];
      }

      if (tagName === 'table') {
        const rows: TableRow[] = [];
        const theadRows: TableRow[] = [];
        
        $(el).find('tr').each((_, tr) => {
          const cells: TableCell[] = [];
          $(tr).find('td, th').each((_, cell) => {
            const cellBlocks: Block[] = [];
            $(cell).contents().each((_, child) => {
               const childBlocks = parseNodeToBlocks(child);
               cellBlocks.push(...childBlocks);
            });
            if (cellBlocks.length === 0) {
               const inlines = this.parseInlines($, cell);
               if (inlines.length > 0) cellBlocks.push(createParagraphBlock(inlines));
            }
            cells.push({
               colspan: parseInt($(cell).attr('colspan') || '1', 10),
               rowspan: parseInt($(cell).attr('rowspan') || '1', 10),
               children: cellBlocks
            });
          });
          
          if ($(tr).parent().is('thead') || $(tr).find('th').length > 0) {
            theadRows.push({ cells });
          } else {
            rows.push({ cells });
          }
        });
        
        let caption: Inline[] | null = null;
        const captionEl = $(el).find('caption').first();
        if (captionEl.length > 0) {
           caption = this.parseInlines($, captionEl[0]);
        }

        return [createTableBlock(
          rows.length > 0 ? rows : [{ cells: [{ colspan: 1, rowspan: 1, children: [createParagraphBlock([createTextInline('Empty Table')])] }] }],
          theadRows.length > 0 ? theadRows : null,
          caption,
          `Table ${tableCounter}`,
          `tbl-${tableCounter++}`
        )];
      }

      if (tagName === 'figure') {
        const imgEl = $(el).find('img').first();
        const figcapEl = $(el).find('figcaption').first();
        
        const src = imgEl.attr('src') || `asset-key-${figureCounter}`;
        const alt = imgEl.attr('alt') || null;
        
        let caption: Inline[] | null = null;
        if (figcapEl.length > 0) {
           caption = this.parseInlines($, figcapEl[0]);
        }
        
        return [createFigureBlock(
          src,
          alt,
          caption,
          `Figure ${figureCounter}`,
          `fig-${figureCounter++}`
        )];
      }

      if (tagName === 'blockquote') {
        const blockquoteBlocks: Block[] = [];
        $(el).contents().each((_, child) => {
           blockquoteBlocks.push(...parseNodeToBlocks(child));
        });
        if (blockquoteBlocks.length === 0) {
           const inlines = this.parseInlines($, el);
           if (inlines.length > 0) blockquoteBlocks.push(createParagraphBlock(inlines));
        }
        return [{
          type: 'blockquote',
          children: blockquoteBlocks
        }];
      }

      if (tagName === 'hr') {
        return [{ type: 'thematicbreak' }];
      }
      
      if (['div', 'section', 'article', 'main'].includes(tagName)) {
        const containerBlocks: Block[] = [];
        $(el).contents().each((_, child) => {
           containerBlocks.push(...parseNodeToBlocks(child));
        });
        return containerBlocks;
      }
      
      const inlineFallback = this.parseInlines($, el);
      if (inlineFallback.length > 0) {
        return [createParagraphBlock(inlineFallback)];
      }

      return [];
    };

    rootNodes.forEach(node => {
      blocks.push(...parseNodeToBlocks(node));
    });

    if (blocks.length === 0) {
      blocks.push(createParagraphBlock([createTextInline('No content available.')]));
    }

    const extractText = (inlines: any[]): string => {
       if (!inlines) return '';
       return inlines.map(inl => {
          if (inl.type === 'text') return inl.value;
          if (inl.children) return extractText(inl.children);
          return '';
       }).join('');
    };

    let introIndex = -1;
    for (let i = 0; i < blocks.length; i++) {
       const b = blocks[i];
       if (b.type === 'heading') {
          const txt = extractText((b as any).children).trim();
          const lowerTxt = txt.toLowerCase();
          if (/^(?:1\.?|i\.?|01\.?)\s+/i.test(txt) || 
              lowerTxt.startsWith('introduction') || 
              lowerTxt.startsWith('background')) {
             introIndex = i;
             break;
          }
       }
    }
    
    if (introIndex > 0) {
       blocks.splice(0, introIndex);
    }

    const cleanBlocks = blocks.filter(b => {
       if (b.type === 'heading' || b.type === 'paragraph') {
          const txt = extractText((b as any).children).toLowerCase();
          if (txt.includes('right-click the table of contents')) return false;
          if (txt.includes('update field')) return false;
          if (txt.includes('addin en.reflist')) return false;
          if (txt.trim() === 'table of contents') return false;
       }
       return true;
    });

    return cleanBlocks;
  }

  private parseInlines($: cheerio.CheerioAPI, parent: any): Inline[] {
    const inlines: Inline[] = [];
    
    $(parent).contents().each((_, node) => {
      if (node.type === 'text') {
        const text = $(node).text();
        if (text) {
          inlines.push(createTextInline(text));
        }
      } else if (node.type === 'tag') {
        const el = node;
        const tagName = el.name.toLowerCase();
        
        const children = this.parseInlines($, el);
        
        if (tagName === 'strong' || tagName === 'b') {
          inlines.push(createStyledInline('bold', children));
        } else if (tagName === 'em' || tagName === 'i') {
          inlines.push(createStyledInline('italic', children));
        } else if (tagName === 'code') {
          inlines.push(createStyledInline('code', children));
        } else if (tagName === 'sup') {
          inlines.push(createStyledInline('superscript', children));
        } else if (tagName === 'sub') {
          inlines.push(createStyledInline('subscript', children));
        } else if (tagName === 'a') {
          const href = $(el).attr('href') || '#';
          inlines.push(createLinkInline(href, children));
        } else {
          inlines.push(...children);
        }
      }
    });

    return inlines;
  }
}
