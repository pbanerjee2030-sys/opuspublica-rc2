/**
 * Opus Publica Composition Engine (OPCE) — Public API Contracts & Entrypoints
 *
 * Public surface area for integration with Opus Publica editorial workflow.
 * Milestone 5 wires the runtime pipeline orchestrator into public compose() and analyse() exports.
 */

import type { CompositionResult, ComposeOptions, PublicationContext } from './model/types';
import type { QualityReport } from './quality/analyser';
import { CompositionPipeline } from './pipeline/composition-pipeline';
import { QualityCoordinator } from './quality/coordinator';
import { resolveStandard, resolvePolicy } from './standards/standard-engine';
import { createDocument } from './model/document-builder';
import { AdapterRegistry } from './adapters/adapter-registry';
import { RenderingCoordinator } from './renderers/rendering-coordinator';

export type {
  OpusDocument,
  DocumentMetadata,
  Author,
  Affiliation,
  JournalRef,
  PublicationDates,
  FundingDeclaration,
  Declarations,
  CopyrightInfo,
  Block,
  ParagraphBlock,
  HeadingBlock,
  ListBlock,
  ListItem,
  TableBlock,
  TableRow,
  TableCell,
  FigureBlock,
  EquationBlock,
  BlockQuoteBlock,
  CodeBlockBlock,
  ThematicBreakBlock,
  Inline,
  TextInline,
  StyledInline,
  LinkInline,
  InlineMathInline,
  FootnoteRefInline,
  CitationRefInline,
  Reference,
  Footnote,
  AssetDescriptor,
  CompositionSession,
  CompositionResult,
  ComposeOptions,
} from './model/types';

export type {
  FontSpec,
  PageSpec,
  TypographySpec,
  LayoutSpec,
  RunningHeaderSpec,
  RunningFooterSpec,
  CoverPageSpec,
  MetadataDisplaySpec,
  TableDisplaySpec,
  FigureDisplaySpec,
  ReferenceDisplaySpec,
  CopyrightDisplaySpec,
  WatermarkSpec,
  ResolvedStandard,
  PublisherPolicy,
  JournalStyleOverrides,
} from './standards/types';

export type {
  ManuscriptAdapter,
  AdapterContext,
} from './adapters/adapter';

export type {
  DiagnosticLocation,
  Diagnostic,
  QualitySummary,
  QualityReport,
  QualityAnalyser,
} from './quality/analyser';

export type {
  DocumentRenderer,
} from './renderers/renderer';

export type {
  RenderedOutput,
  PackageMetadata,
  PublicationPackage,
} from './package/types';

/**
 * Public OPCE Entrypoint: Compose an article into publication outputs.
 * Executed via CompositionPipeline orchestrator.
 */
export async function compose(publication: PublicationContext, options: ComposeOptions): Promise<CompositionResult> {
  return CompositionPipeline.execute({
    publication,
    mode: options.mode,
    initiatedBy: options.initiatedBy,
    journalStyleOverrides: options.journalStyleOverrides,
  });
}

/**
 * Public OPCE Entrypoint: Perform quality analysis on an article document.
 * Executed via QualityCoordinator orchestrator.
 */
export async function analyse(articleId: string): Promise<QualityReport> {
  const standard = resolveStandard(null);
  const policy = resolvePolicy(null);
  const document = createDocument(articleId, { title: `Article ${articleId}` });
  return QualityCoordinator.runAnalysis(document, standard, policy);
}

/**
 * Public OPCE Entrypoint: Normalize manuscript HTML through OPCE AST.
 * This ensures standard canonical HTML structure before DB persistence.
 */
export async function normalizeManuscript(html: string, journalId: string): Promise<string> {
  const document = await AdapterRegistry.parseManuscript(html, 'text/html', { articleId: 'pending', journalId });
  const standard = resolveStandard(null);
  const renderedHtml = await RenderingCoordinator.renderDocument(document, standard, 'html');
  return typeof renderedHtml === 'string' ? renderedHtml : renderedHtml.toString('utf-8');
}
