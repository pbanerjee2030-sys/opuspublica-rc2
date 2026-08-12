/**
 * Opus Publica Composition Engine (OPCE) — Model Types
 *
 * Canonical document model (OpusDocument) and related data types.
 * This represents technology-independent scholarly knowledge and serves as the
 * single source of truth across all OPCE subsystems.
 */

/**
 * Responsibility: Holds article-level scholarly and publication metadata.
 * Lifecycle: Created during manuscript parsing (M2), updated during metadata enrichment, frozen in PublicationPackage (M5).
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Adapters (M2), Quality Analysers (M3), Renderers (M4), Package Builder (M5).
 * Implementation Milestone: M0 (Contract Freeze), instantiated in M2.
 */
export interface DocumentMetadata {
  title: string;
  subtitle: string | null;
  abstract: string | null;
  keywords: string[];
  language: string;
  authors: Author[];
  journal: JournalRef;
  doi: string | null;
  volume: string | null;
  issue: string | null;
  pages: { start: number; end: number } | null;
  dates: PublicationDates;
  funding: FundingDeclaration[];
  declarations: Declarations;
  copyright: CopyrightInfo;
}

/**
 * Responsibility: Represents an individual manuscript author and their affiliations.
 * Lifecycle: Parsed from manuscript/DB in M2, consumed by Crossref XML generator, HTML/PDF metadata headers, and Quality Analysers.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Metadata Analyser (M3), HTML/PDF Renderers (M4), Crossref Exporter.
 * Implementation Milestone: M0 (Contract Freeze), instantiated in M2.
 */
export interface Author {
  name: string;
  givenName: string | null;
  surname: string;
  orcid: string | null;
  affiliations: Affiliation[];
  correspondingAuthor: boolean;
  email: string | null;
}

/**
 * Responsibility: Describes an author's institutional affiliation.
 * Lifecycle: Created in M2 parsing, formatted in PDF author block and Crossref deposit XML.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Metadata Analyser (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze), instantiated in M2.
 */
export interface Affiliation {
  name: string;
  rorId: string | null;
  country: string | null;
}

/**
 * Responsibility: Encapsulates journal-level metadata attached to a document.
 * Lifecycle: Fetched from Opus Publica DB `journals` table in M2/M5, attached to OpusDocument.
 * Ownership: OPCE Model Domain (references Opus Publica Journal).
 * Intended Consumers: Standard Engine (M2), Renderers (M4), Compliance Analyser (M3).
 * Implementation Milestone: M0 (Contract Freeze), instantiated in M2.
 */
export interface JournalRef {
  id: string;
  name: string;
  slug: string;
  issn: string | null;
  publisher: string | null;
  licenseType: string | null;
}

/**
 * Responsibility: Tracks key editorial lifecycle dates.
 * Lifecycle: Populated from article database records during ingestion (M2/M5).
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Metadata Analyser (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze), instantiated in M2.
 */
export interface PublicationDates {
  received: string | null;
  accepted: string | null;
  published: string | null;
  revised: string | null;
}

/**
 * Responsibility: Stores funding agency and grant metadata.
 * Lifecycle: Parsed from submission metadata (M2), exported to Crossref FundRef XML and PDF layout.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Metadata Analyser (M3), Crossref Exporter, Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze), instantiated in M2.
 */
export interface FundingDeclaration {
  funderName: string;
  funderId: string | null;
  awardNumber: string | null;
}

/**
 * Responsibility: Contains author ethics, COI, and data availability statements.
 * Lifecycle: Ingested during M2, evaluated by Compliance Analyser (M3), rendered in PDF/HTML article footer (M4).
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Compliance Analyser (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze), instantiated in M2.
 */
export interface Declarations {
  conflictOfInterest: string | null;
  dataAvailability: string | null;
  ethicsApproval: string | null;
}

/**
 * Responsibility: Represents copyright holder and licensing metadata.
 * Lifecycle: Resolved in M2, validated in M3, rendered in publication footer and PDF license badge in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Compliance Analyser (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze), instantiated in M2.
 */
export interface CopyrightInfo {
  holder: string;
  year: number;
  licenseType: string;
  licenseUrl: string;
}

/**
 * Responsibility: Discriminated union of all block-level AST nodes in OpusDocument.
 * Lifecycle: Constructed by ManuscriptAdapter (M2), inspected by Quality Analysers (M3), rendered by Renderers (M4).
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Adapters (M2), Quality Analysers (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze), instantiated in M2.
 */
export type Block =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | TableBlock
  | FigureBlock
  | EquationBlock
  | BlockQuoteBlock
  | CodeBlockBlock
  | ThematicBreakBlock;

/**
 * Responsibility: Represents a text paragraph containing inline elements.
 * Lifecycle: Created in M2, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Adapters (M2), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface ParagraphBlock {
  type: 'paragraph';
  children: Inline[];
}

/**
 * Responsibility: Represents a section heading (levels 1-6) with a stable anchor ID.
 * Lifecycle: Created in M2, evaluated by Accessibility Analyser (M3), rendered with anchor IDs in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Accessibility Analyser (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  id: string;
  children: Inline[];
}

/**
 * Responsibility: Represents an ordered or unordered list.
 * Lifecycle: Created in M2, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Adapters (M2), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface ListBlock {
  type: 'list';
  ordered: boolean;
  items: ListItem[];
}

/**
 * Responsibility: Represents an item inside a ListBlock containing child blocks.
 * Lifecycle: Created in M2, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Adapters (M2), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface ListItem {
  children: Block[];
}

/**
 * Responsibility: Represents a structured tabular dataset with headers, rows, and optional captions.
 * Lifecycle: Created in M2, inspected by Accessibility/Layout Analysers (M3/M4), rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Accessibility Analyser (M3), Layout Analyser (M4), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface TableBlock {
  type: 'table';
  id: string;
  label: string | null;
  caption: Inline[] | null;
  header: TableRow[] | null;
  rows: TableRow[];
}

/**
 * Responsibility: Represents a single row in a TableBlock.
 * Lifecycle: Created in M2, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface TableRow {
  cells: TableCell[];
}

/**
 * Responsibility: Represents an individual table cell supporting colspan/rowspan spanning.
 * Lifecycle: Created in M2, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface TableCell {
  colspan: number;
  rowspan: number;
  children: Block[];
}

/**
 * Responsibility: Represents an image figure with asset key, alt text, and caption.
 * Lifecycle: Created in M2, evaluated by Accessibility Analyser (M3), rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Accessibility Analyser (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface FigureBlock {
  type: 'figure';
  id: string;
  src: string;
  alt: string | null;
  caption: Inline[] | null;
  label: string | null;
  width: number | null;
}

/**
 * Responsibility: Represents a display or inline mathematical equation (LaTeX/MathML).
 * Lifecycle: Created in M2, rendered by Math Engine in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface EquationBlock {
  type: 'equation';
  id: string;
  format: 'latex' | 'mathml';
  source: string;
  label: string | null;
  display: 'block' | 'inline';
}

/**
 * Responsibility: Represents a block quotation.
 * Lifecycle: Created in M2, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface BlockQuoteBlock {
  type: 'blockquote';
  children: Block[];
}

/**
 * Responsibility: Represents a formatted code block with language annotation.
 * Lifecycle: Created in M2, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface CodeBlockBlock {
  type: 'codeblock';
  language: string | null;
  code: string;
}

/**
 * Responsibility: Represents a horizontal section divider break.
 * Lifecycle: Created in M2, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface ThematicBreakBlock {
  type: 'thematicbreak';
}

/**
 * Responsibility: Discriminated union of all inline text elements in OpusDocument.
 * Lifecycle: Created in M2, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Adapters (M2), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export type Inline =
  | TextInline
  | StyledInline
  | LinkInline
  | InlineMathInline
  | FootnoteRefInline
  | CitationRefInline;

/**
 * Responsibility: Represents plain text inline content.
 * Lifecycle: Created in M2, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface TextInline {
  type: 'text';
  value: string;
}

/**
 * Responsibility: Represents formatted inline text (bold, italic, superscript, subscript, code).
 * Lifecycle: Created in M2, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface StyledInline {
  type: 'styled';
  style: 'bold' | 'italic' | 'superscript' | 'subscript' | 'code';
  children: Inline[];
}

/**
 * Responsibility: Represents a hyperlink with URL target and title.
 * Lifecycle: Created in M2, inspected by Reference Analyser (M3), rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Reference Analyser (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface LinkInline {
  type: 'link';
  url: string;
  title: string | null;
  children: Inline[];
}

/**
 * Responsibility: Represents inline math expression (LaTeX/MathML).
 * Lifecycle: Created in M2, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface InlineMathInline {
  type: 'inlinemath';
  format: 'latex' | 'mathml';
  source: string;
}

/**
 * Responsibility: Represents a footnote reference callout.
 * Lifecycle: Created in M2, linked to Footnote in M3/M4, rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Quality Analysers (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface FootnoteRefInline {
  type: 'footnoteref';
  id: string;
}

/**
 * Responsibility: Represents a citation reference callout pointing to bibliography entries.
 * Lifecycle: Created in M2, evaluated by Reference Analyser (M3), rendered in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Reference Analyser (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface CitationRefInline {
  type: 'citationref';
  ids: string[];
}

/**
 * Responsibility: Represents a single structured bibliographic reference entry.
 * Lifecycle: Ingested in M2, evaluated by Reference Analyser (M3), rendered in bibliography section in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Reference Analyser (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface Reference {
  id: string;
  type: 'article' | 'book' | 'chapter' | 'web' | 'report' | 'other';
  authors: { given: string; surname: string }[];
  title: string;
  containerTitle: string | null;
  year: number | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  raw: string | null;
}

/**
 * Responsibility: Represents a footnote item containing block content.
 * Lifecycle: Created in M2, rendered at footer/page bottom in M4.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface Footnote {
  id: string;
  children: Block[];
}

/**
 * Responsibility: Describes an asset (figure image, attachment) associated with the document.
 * Lifecycle: Uploaded to storage during parsing (M2), referenced in FigureBlock, resolved in M4/M5.
 * Ownership: OPCE Model Domain.
 * Intended Consumers: Adapters (M2), Renderers (M4), Package Builder (M5).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface AssetDescriptor {
  key: string;
  mimeType: string;
  originalFilename: string;
  storagePath: string;
  width: number | null;
  height: number | null;
}

/**
 * Responsibility: Primary canonical document AST for OPCE. Single source of truth for scholarly content.
 * Lifecycle: Created by ManuscriptAdapter (M2), inspected by Quality (M3), rendered in M4, archived in M5.
 * Ownership: OPCE Core Domain.
 * Intended Consumers: Entire OPCE subsystem.
 * Implementation Milestone: M0 (Contract Freeze), instantiated in M2.
 */
export interface OpusDocument {
  version: '1.0.0';
  id: string;
  metadata: DocumentMetadata;
  body: Block[];
  references: Reference[];
  footnotes: Footnote[];
  assets: Record<string, AssetDescriptor>;
}

/**
 * Responsibility: Immutable audit record of a single composition run execution.
 * Lifecycle: Created at start of compose (M5), updated upon completion/failure/approval, stored in Supabase Storage.
 * Ownership: OPCE Session Manager.
 * Intended Consumers: Pipeline Orchestrator (M5), Dashboard UI (M6), Audit System.
 * Implementation Milestone: M0 (Contract Freeze), instantiated in M5.
 */
export interface CompositionSession {
  id: string;
  articleId: string;
  initiatedBy: string;
  initiatedAt: string;
  completedAt: string | null;
  renderMode: 'draft' | 'publication';
  status: 'running' | 'completed' | 'failed' | 'approved' | 'superseded';
  inputs: {
    documentVersion: string;
    styleChecksum: string;
    adapterUsed: string;
    opceVersion: string;
  };
  outputs: {
    packageStoragePath: string;
    pdfStoragePath: string | null;
    qualityScore: number;
    errorCount: number;
    warningCount: number;
    renderDurationMs: number;
  } | null;
  approval: {
    approvedBy: string;
    approvedAt: string;
    notes: string | null;
  } | null;
  failureReason: string | null;
}

/**
 * Responsibility: Options passed into the public OPCE `compose` entrypoint.
 * Lifecycle: Constructed by caller (API/Dashboard) when requesting document composition (M5/M6).
 * Ownership: OPCE Public API.
 * Intended Consumers: Pipeline Orchestrator (M5), Admin Dashboard (M6).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface PublicationContext {
  article: {
    id: string;
    title: string;
    abstract: string | null;
    manuscriptHtml: string;
    doi: string | null;
    keywords: string[];
    chronology: {
      publishedAt: string | null;
    };
  };
  journal: {
    name: string;
    issn: string | null;
    publisher: string;
    slug?: string;
  };
  authors: {
    name: string;
    orcid?: string | null;
    rorId?: string | null;
    affiliations: { name: string }[];
  }[];
  funding: {
    funder_name: string | null;
    funder_id: string | null;
    funder_award_number: string | null;
  };
  declarations: {
    conflict_of_interest_statement: string | null;
    data_availability_statement: string | null;
    ethics_approval_statement: string | null;
  };
  identifiers: {
    articleId: string;
    journalId: string;
  };
}

export interface ComposeOptions {
  mode: 'draft' | 'publication';
  initiatedBy: string;
  journalStyleOverrides?: Record<string, unknown> | null;
}

/**
 * Responsibility: Return payload from the public OPCE `compose` entrypoint.
 * Lifecycle: Returned upon completion of document composition pipeline (M5).
 * Ownership: OPCE Public API.
 * Intended Consumers: Admin Dashboard (M6), API Routes (M6).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface CompositionResult {
  success: boolean;
  sessionId: string;
  document: OpusDocument;
  qualityReport: unknown;
  renderedOutputs: unknown[];
  htmlPreview?: string;
  packageStoragePath: string;
  pdfStoragePath: string | null;
  renderDurationMs: number;
  styleChecksum: string;
  error: string | null;
}
