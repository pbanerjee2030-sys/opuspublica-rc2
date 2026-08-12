/**
 * Opus Publica Composition Engine (OPCE) — Document Builder & Foundation Utilities
 *
 * Foundation infrastructure for OpusDocument operations:
 * - Immutable document builders and node object factories
 * - Serialization, deserialization, cloning, and deep equality testing
 * - Deterministic SHA-256 AST checksum calculation
 * - Visitor pattern AST traversal helpers
 * - Schema validation for OpusDocument, ResolvedStandard, and PublisherPolicy
 */

import { createHash } from 'crypto';
import type {
  OpusDocument,
  DocumentMetadata,
  Block,
  ParagraphBlock,
  HeadingBlock,
  TableBlock,
  TableRow,
  TableCell,
  FigureBlock,
  Inline,
  TextInline,
  StyledInline,
  LinkInline,
  Reference,
  Footnote,
  AssetDescriptor,
} from './types';

// ── AST Visitor Interface ──

export interface OpusASTVisitor {
  visitDocument?(document: OpusDocument): void;
  visitBlock?(block: Block, index: number, parent: OpusDocument | Block): void;
  visitInline?(inline: Inline, index: number, parent: Block | Inline): void;
  visitReference?(reference: Reference, index: number): void;
  visitFootnote?(footnote: Footnote, index: number): void;
}

// ── Object Factories ──

export function createTextInline(value: string): TextInline {
  return { type: 'text', value };
}

export function createStyledInline(
  style: 'bold' | 'italic' | 'superscript' | 'subscript' | 'code',
  children: Inline[]
): StyledInline {
  return { type: 'styled', style, children };
}

export function createLinkInline(url: string, children: Inline[], title: string | null = null): LinkInline {
  return { type: 'link', url, title, children };
}

export function createParagraphBlock(children: Inline[] = []): ParagraphBlock {
  return { type: 'paragraph', children };
}

export function createHeadingBlock(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  children: Inline[],
  id: string = `heading-${Date.now()}`
): HeadingBlock {
  return { type: 'heading', level, id, children };
}

export function createTableBlock(
  rows: TableRow[],
  header: TableRow[] | null = null,
  caption: Inline[] | null = null,
  label: string | null = null,
  id: string = `table-${Date.now()}`
): TableBlock {
  return { type: 'table', id, label, caption, header, rows };
}

export function createFigureBlock(
  src: string,
  alt: string | null = null,
  caption: Inline[] | null = null,
  label: string | null = null,
  id: string = `fig-${Date.now()}`
): FigureBlock {
  return { type: 'figure', id, src, alt, caption, label, width: null };
}

export function createDefaultMetadata(overrides: Partial<DocumentMetadata> = {}): DocumentMetadata {
  return {
    title: 'Untitled Document',
    subtitle: null,
    abstract: null,
    keywords: [],
    language: 'en',
    authors: [],
    journal: {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Opus Publica',
      slug: 'opus-publica',
      issn: null,
      publisher: 'Advocacy Unified Network',
      licenseType: 'CC BY 4.0',
    },
    doi: null,
    volume: null,
    issue: null,
    pages: null,
    dates: { received: null, accepted: null, published: null, revised: null },
    funding: [],
    declarations: { conflictOfInterest: null, dataAvailability: null, ethicsApproval: null },
    copyright: {
      holder: 'Opus Publica',
      year: new Date().getFullYear(),
      licenseType: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    ...overrides,
  };
}

export function createDocument(
  id: string,
  metadata: Partial<DocumentMetadata> = {},
  body: Block[] = [],
  references: Reference[] = [],
  footnotes: Footnote[] = [],
  assets: Record<string, AssetDescriptor> = {}
): OpusDocument {
  return {
    version: '1.0.0',
    id,
    metadata: createDefaultMetadata(metadata),
    body,
    references,
    footnotes,
    assets,
  };
}

// ── Serialization & Deserialization ──

export function serializeDocument(doc: OpusDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function deserializeDocument(jsonStr: string): OpusDocument {
  const parsed = JSON.parse(jsonStr);
  const validation = validateOpusDocument(parsed);
  if (!validation.valid) {
    throw new Error(`Invalid OpusDocument JSON: ${validation.errors.join('; ')}`);
  }
  return parsed as OpusDocument;
}

// ── Immutability & Deep Comparison ──

export function cloneDocument(doc: OpusDocument): OpusDocument {
  return JSON.parse(JSON.stringify(doc));
}

export function areDocumentsEqual(docA: OpusDocument, docB: OpusDocument): boolean {
  return serializeDocument(docA) === serializeDocument(docB);
}

// ── Checksum Generation ──

export function computeDocumentChecksum(doc: OpusDocument): string {
  const normalized = JSON.stringify(doc, Object.keys(doc).sort());
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

// ── Schema Validation ──

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateOpusDocument(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Document must be an object'] };
  }
  const obj = data as Record<string, unknown>;
  if (obj.version !== '1.0.0') errors.push('Unsupported document version (must be 1.0.0)');
  if (!obj.id || typeof obj.id !== 'string') errors.push('Document must have a valid string id');
  if (!obj.metadata || typeof obj.metadata !== 'object') errors.push('Document metadata is missing or invalid');
  if (!Array.isArray(obj.body)) errors.push('Document body must be an array of blocks');
  if (!Array.isArray(obj.references)) errors.push('Document references must be an array');
  if (!Array.isArray(obj.footnotes)) errors.push('Document footnotes must be an array');
  return { valid: errors.length === 0, errors };
}

export function validateResolvedStandard(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['ResolvedStandard must be an object'] };
  }
  const obj = data as Record<string, unknown>;
  if (!obj.page || typeof obj.page !== 'object') errors.push('Missing page spec');
  if (!obj.typography || typeof obj.typography !== 'object') errors.push('Missing typography spec');
  if (!obj.layout || typeof obj.layout !== 'object') errors.push('Missing layout spec');
  return { valid: errors.length === 0, errors };
}

export function validatePublisherPolicy(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['PublisherPolicy must be an object'] };
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.requiredMetadata)) errors.push('requiredMetadata must be an array');
  if (!Array.isArray(obj.requiredDeclarations)) errors.push('requiredDeclarations must be an array');
  return { valid: errors.length === 0, errors };
}

// ── AST Visitor Traversal ──

export function traverseDocument(doc: OpusDocument, visitor: OpusASTVisitor): void {
  if (visitor.visitDocument) visitor.visitDocument(doc);
  doc.body.forEach((block, idx) => traverseBlock(block, idx, doc, visitor));
  doc.references.forEach((ref, idx) => {
    if (visitor.visitReference) visitor.visitReference(ref, idx);
  });
  doc.footnotes.forEach((fn, idx) => {
    if (visitor.visitFootnote) visitor.visitFootnote(fn, idx);
  });
}

function traverseBlock(block: Block, index: number, parent: OpusDocument | Block, visitor: OpusASTVisitor): void {
  if (visitor.visitBlock) visitor.visitBlock(block, index, parent);
  const blockObj = block as unknown as Record<string, unknown>;
  if ('children' in blockObj && Array.isArray(blockObj.children)) {
    const children = blockObj.children as unknown[];
    children.forEach((child, idx) => {
      if (typeof child === 'object' && child !== null && 'type' in child) {
        const typedChild = child as { type: string };
        if (['paragraph', 'heading', 'list', 'table', 'figure', 'equation', 'blockquote', 'codeblock', 'thematicbreak'].includes(typedChild.type)) {
          traverseBlock(child as Block, idx, block, visitor);
        } else {
          traverseInline(child as Inline, idx, block, visitor);
        }
      }
    });
  }
}

function traverseInline(inline: Inline, index: number, parent: Block | Inline, visitor: OpusASTVisitor): void {
  if (visitor.visitInline) visitor.visitInline(inline, index, parent);
  const inlineObj = inline as unknown as Record<string, unknown>;
  if ('children' in inlineObj && Array.isArray(inlineObj.children)) {
    const children = inlineObj.children as Inline[];
    children.forEach((child, idx) => traverseInline(child, idx, inline, visitor));
  }
}
