/**
 * Opus Publica Composition Engine (OPCE) — Publication Standards & Policy Types
 *
 * Declarative specifications for publication styles, visual parameters, page layout,
 * and editorial publisher policies.
 */

/**
 * Responsibility: Defines typography font family, weight, style, and point size.
 * Lifecycle: Configured in style JSON (M1), resolved in M2, applied by HTML/PDF Renderers (M4).
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Standard Engine (M2), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface FontSpec {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  sizeInPt: number;
}

/**
 * Responsibility: Specifies physical target page dimensions, margins, and bleed (mm).
 * Lifecycle: Defined in style JSON (M1), resolved in M2, applied in CSS @page rules in M4.
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Standard Engine (M2), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface PageSpec {
  size: { width: number; height: number };
  margins: { top: number; right: number; bottom: number; left: number };
  bleed: number;
}

/**
 * Responsibility: Complete typography scale, line height, spacing, alignment, and i18n font specs.
 * Lifecycle: Resolved in M2, drives CSS styling and typography engine in M4.
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Standard Engine (M2), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface TypographySpec {
  bodyFont: FontSpec;
  headingFonts: Record<1 | 2 | 3 | 4 | 5 | 6, FontSpec>;
  captionFont: FontSpec;
  metadataFont: FontSpec;
  footnoteFont: FontSpec;
  bodyLineHeight: number;
  paragraphSpacing: number;
  headingSpacing: Record<1 | 2 | 3 | 4 | 5 | 6, { above: number; below: number }>;
  textAlignment: 'justify' | 'left';
  hyphenation: boolean;
  textDirection: 'ltr' | 'rtl';
  locale: string;
  cjkFontFamily: string | null;
}

/**
 * Responsibility: Specifies page column geometry, column gaps, and pagination constraints (widows/orphans).
 * Lifecycle: Resolved in M2, enforced by Layout Analyser (M3/M4) and Renderers (M4).
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Layout Analyser (M4), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface LayoutSpec {
  columns: number;
  columnGap: number;
  widowMinLines: number;
  orphanMinLines: number;
  headingKeepWithNext: boolean;
}

/**
 * Responsibility: Configures running page header templates and typography.
 * Lifecycle: Resolved in M2, compiled into Playwright PDF header templates in M4.
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface RunningHeaderSpec {
  left: string | null;
  center: string | null;
  right: string | null;
  font: FontSpec;
  firstPageDifferent: boolean;
}

/**
 * Responsibility: Configures running page footer templates (page numbers, journal name, DOI).
 * Lifecycle: Resolved in M2, compiled into Playwright PDF footer templates in M4.
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface RunningFooterSpec {
  left: string | null;
  center: string | null;
  right: string | null;
  font: FontSpec;
}

/**
 * Responsibility: Configures opening masthead cover layout, colors, and title styling.
 * Lifecycle: Resolved in M2, rendered at article start in M4.
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface CoverPageSpec {
  enabled: boolean;
  mastheadTitle: string;
  mastheadSubtitle: string | null;
  showJournalName: boolean;
  accentColor: string;
  backgroundColor: string;
  dividerStyle: 'line' | 'none';
}

/**
 * Responsibility: Controls visibility and positioning of metadata fields (DOI, ORCID, dates, ISSN).
 * Lifecycle: Resolved in M2, evaluated in M3, rendered in M4.
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Metadata Analyser (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface MetadataDisplaySpec {
  doiPosition: 'header' | 'footer' | 'coverPage' | 'all';
  orcidDisplay: 'icon' | 'text' | 'iconAndText';
  showReceivedDate: boolean;
  showAcceptedDate: boolean;
  showPublishedDate: boolean;
  showISSN: boolean;
  showVolumeIssue: boolean;
  showLicenseBadge: boolean;
}

/**
 * Responsibility: Configures visual presentation for tables (header backgrounds, borders, captions).
 * Lifecycle: Resolved in M2, applied in M4 table CSS rendering.
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface TableDisplaySpec {
  headerBackground: string | null;
  headerFont: FontSpec;
  borderStyle: 'all' | 'horizontal' | 'none';
  captionPosition: 'above' | 'below';
  captionPrefix: string;
}

/**
 * Responsibility: Configures image figure layout boundaries, caption placement, and prefixing.
 * Lifecycle: Resolved in M2, applied in M4 figure CSS rendering.
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface FigureDisplaySpec {
  captionPosition: 'above' | 'below';
  captionPrefix: string;
  maxWidth: number;
  captionFont: FontSpec;
}

/**
 * Responsibility: Configures bibliography reference citation style, section title, and numbering scheme.
 * Lifecycle: Resolved in M2, applied in M4 bibliography formatting.
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Reference Analyser (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface ReferenceDisplaySpec {
  style: 'apa7' | 'chicago' | 'vancouver' | 'harvard' | 'custom';
  sectionTitle: string;
  numbering: 'bracketed' | 'superscript' | 'author-date';
}

/**
 * Responsibility: Configures copyright notice and Creative Commons license badge presentation.
 * Lifecycle: Resolved in M2, evaluated in M3 compliance, rendered in M4 footer.
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Compliance Analyser (M3), Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface CopyrightDisplaySpec {
  position: 'footer' | 'endOfArticle' | 'both';
  showLicenseBadge: boolean;
  badgeStyle: 'filled' | 'outline';
}

/**
 * Responsibility: Configures draft preview watermark overlay text, opacity, and angle.
 * Lifecycle: Resolved in M2, rendered exclusively during draft mode in M4.
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Renderers (M4).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface WatermarkSpec {
  text: string;
  opacity: number;
  rotation: number;
  font: FontSpec;
}

/**
 * Responsibility: Fully resolved, immutable publication layout specification for a document run.
 * Lifecycle: Produced by Standard Engine (M2) by deep-merging defaults and overrides; passed into Quality (M3) and Renderers (M4).
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Quality Coordinator (M3), Renderers (M4), Package Builder (M5).
 * Implementation Milestone: M0 (Contract Freeze), resolved in M2.
 */
export interface ResolvedStandard {
  page: PageSpec;
  typography: TypographySpec;
  layout: LayoutSpec;
  header: RunningHeaderSpec;
  footer: RunningFooterSpec;
  coverPage: CoverPageSpec;
  metadata: MetadataDisplaySpec;
  tables: TableDisplaySpec;
  figures: FigureDisplaySpec;
  references: ReferenceDisplaySpec;
  copyright: CopyrightDisplaySpec;
  watermark: WatermarkSpec;
}

/**
 * Responsibility: Declarative publisher rules governing mandatory metadata, licenses, and declarations.
 * Lifecycle: Resolved in M2 from database/default policy JSON; evaluated by Compliance Analyser (M3).
 * Ownership: OPCE Policy Domain.
 * Intended Consumers: Compliance Analyser (M3), Standard Engine (M2).
 * Implementation Milestone: M0 (Contract Freeze), resolved in M2.
 */
export interface PublisherPolicy {
  requiredMetadata: string[];
  requiredDeclarations: string[];
  mandatoryLicense: string | null;
  requireOrcidForCorrespondingAuthor: boolean;
  requireOrcidForAllAuthors: boolean;
  minimumAbstractLength: number | null;
  maximumKeywordCount: number | null;
  crossrefDepositRequired: boolean;
}

/**
 * Responsibility: Partial overrides structure provided per-journal to customize ResolvedStandard.
 * Lifecycle: Stored in database `journals.publication_style` column; consumed by Standard Engine (M2).
 * Ownership: OPCE Standards Domain.
 * Intended Consumers: Standard Engine (M2), Dashboard UI (M6).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export type JournalStyleOverrides = Partial<ResolvedStandard>;
