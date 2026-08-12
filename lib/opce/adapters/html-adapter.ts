
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

export type BlockCategory =
  | 'Publisher Cover' | 'Publisher Metadata' | 'Author Metadata'
  | 'Title' | 'Author List' | 'Affiliations' | 'ORCID' | 'Corresponding Author'
  | 'Abstract' | 'Keywords' | 'Table of Contents'
  | 'Microsoft Word Field' | 'EndNote Field' | 'Hidden Metadata'
  | 'Running Header' | 'Running Footer'
  | 'Body Content' | 'References' | 'Appendix' | 'Supplementary Material'
  | 'Unknown';

export class DeterministicBlockClassifier {
  private static extractText(node: any): string {
    if (!node) return '';
    if (node.type === 'text') return node.value || '';
    
    let text = '';
    
    if (Array.isArray(node.children)) {
      text += node.children.map(DeterministicBlockClassifier.extractText).join('');
    }
    if (Array.isArray(node.items)) {
      text += node.items.map(DeterministicBlockClassifier.extractText).join(' ');
    }
    if (Array.isArray(node.rows)) {
      text += node.rows.map(DeterministicBlockClassifier.extractText).join(' ');
    }
    if (Array.isArray(node.cells)) {
      text += node.cells.map(DeterministicBlockClassifier.extractText).join(' ');
    }
    if (Array.isArray(node.caption)) {
      text += node.caption.map(DeterministicBlockClassifier.extractText).join('');
    }
    
    return text;
  }

  private static hasTocLink(node: any): boolean {
    if (!node) return false;
    
    if (node.type === 'link' && node.url && (node.url.toLowerCase().startsWith('#_toc') || node.url.toLowerCase().startsWith('#_hlk'))) {
        return true;
    }
    
    if (Array.isArray(node.children)) {
      if (node.children.some(DeterministicBlockClassifier.hasTocLink)) return true;
    }
    if (Array.isArray(node.items)) {
      if (node.items.some(DeterministicBlockClassifier.hasTocLink)) return true;
    }
    if (Array.isArray(node.rows)) {
      if (node.rows.some(DeterministicBlockClassifier.hasTocLink)) return true;
    }
    if (Array.isArray(node.cells)) {
      if (node.cells.some(DeterministicBlockClassifier.hasTocLink)) return true;
    }
    if (Array.isArray(node.caption)) {
      if (node.caption.some(DeterministicBlockClassifier.hasTocLink)) return true;
    }
    
    return false;
  }

  public static classify(block: Block, pubCtx: any): BlockCategory {
    // LAYER 0 - Definitive Structural Evidence (AST inspection)
    if (DeterministicBlockClassifier.hasTocLink(block)) {
        return 'Table of Contents';
    }

    let text = DeterministicBlockClassifier.extractText(block);
    
    text = text.trim();
    const lowerText = text.toLowerCase();

    // LAYER 1 - Structural Evidence (from AST)
    if (block.type === 'heading' && text === 'Table of Contents') {
        return 'Table of Contents';
    }
    if (lowerText.match(/^abstract\s*\d*$/) || lowerText.match(/^table of contents\s*\d*$/) || lowerText === 'table of contents') {
        return 'Table of Contents';
    }
    if (text.includes('Update Field')) {
      return 'Microsoft Word Field';
    }
    if (text.includes('ADDIN EN.REFLIST')) return 'EndNote Field';

    if (!text) {
        if (block.type === 'figure' || block.type === 'table') return 'Body Content';
        return 'Unknown';
    }

    // LAYER 2 - PublicationContext Evidence
    const title = pubCtx?.article?.title?.trim()?.toLowerCase();
    if (title && (lowerText === title || (title.length > 15 && lowerText.includes(title)))) return 'Title';
    
    let isAuthorList = false;
    let isAffiliation = false;
    if (pubCtx?.authors && Array.isArray(pubCtx.authors)) {
        for (const author of pubCtx.authors) {
            const authorName = author.name?.trim()?.toLowerCase();
            if (authorName && authorName.length > 3 && lowerText.includes(authorName)) {
                isAuthorList = true;
            }
            if (author.affiliations) {
               for (const aff of author.affiliations) {
                   const affName = aff.name?.trim()?.toLowerCase();
                   if (affName && affName.length > 5 && lowerText.includes(affName)) {
                       isAffiliation = true;
                   }
               }
            }
        }
    }
    if (isAuthorList && !isAffiliation) return 'Author List';
    if (isAffiliation && !isAuthorList) return 'Affiliations';
    if (isAuthorList && isAffiliation) return 'Author Metadata';
    
    if (lowerText.includes('orcid.org/')) return 'ORCID';
    
    const journalName = pubCtx?.journal?.name?.trim()?.toLowerCase();
    const publisher = pubCtx?.journal?.publisher?.trim()?.toLowerCase();
    if ((journalName && journalName.length > 3 && lowerText.includes(journalName)) || 
        (publisher && publisher.length > 3 && lowerText.includes(publisher)) || 
        lowerText.includes('issn') || 
        lowerText.includes('doi:')) {
        return 'Publisher Metadata';
    }
    if (
        lowerText.includes('working paper') || 
        lowerText.includes('advocacy unified network') ||
        lowerText.includes('voice & rights') ||
        lowerText.includes('research series') ||
        lowerText.includes('policy brief series') ||
        lowerText.includes('editorial series') ||
        lowerText.includes('journal series') ||
        lowerText.includes('aun series')
    ) {
        return 'Publisher Metadata';
    }
    if (lowerText.includes('corresponding author')) return 'Corresponding Author';

    // LAYER 3 - Semantic Evidence
    if (lowerText.startsWith('abstract')) return 'Abstract';
    if (lowerText.startsWith('keywords')) return 'Keywords';
    if (lowerText === 'references' || lowerText === 'bibliography' || lowerText === 'works cited') return 'References';
    if (lowerText.startsWith('appendix')) return 'Appendix';
    if (lowerText.startsWith('supplementary')) return 'Supplementary Material';
    
    if (lowerText.startsWith('acknowledgements') || lowerText.startsWith('acknowledgments')) return 'Body Content';
    if (lowerText.startsWith('funding')) return 'Body Content';
    if (lowerText.startsWith('conflict of interest')) return 'Body Content';
    if (lowerText.startsWith('data availability')) return 'Body Content';
    if (lowerText.startsWith('ethics')) return 'Body Content';
    if (lowerText.match(/^(executive summary|commentary|editorial|letter|case note|book review|policy brief)/)) return 'Body Content';

    // LAYER 4 - Heuristic fallback
    return 'Body Content';
  }

  public static isRetentionCategory(category: BlockCategory): boolean {
    return [
      'Body Content',
      'References',
      'Appendix',
      'Supplementary Material'
    ].includes(category);
  }
}


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

    let rootNodesArray = Array.from(rootNodes);
    
    rootNodesArray.forEach((node: any) => {
      blocks.push(...parseNodeToBlocks(node));
    });

    if (blocks.length === 0) {
      blocks.push(createParagraphBlock([createTextInline('No content available.')]));
    }
    return blocks;
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
