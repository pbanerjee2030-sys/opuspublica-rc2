/**
 * Opus Publica Composition Engine (OPCE) — Document Renderer Interface
 *
 * Contract for renderers that transform OpusDocument ASTs and ResolvedStandards
 * into target output media (HTML5 streams, print PDFs, JATS XML).
 */

import type { OpusDocument } from '../model/types';
import type { ResolvedStandard } from '../standards/types';

/**
 * Responsibility: Interface contract for renderers generating target media outputs from OpusDocument AST and ResolvedStandard.
 * Lifecycle: Invoked by Pipeline Orchestrator during draft/publication rendering runs (M5).
 * Ownership: OPCE Rendering Domain.
 * Intended Consumers: Pipeline Orchestrator (M5), HTMLRenderer/PDFRenderer (M4).
 * Implementation Milestone: M0 (Contract Freeze), implemented in M4.
 */
export interface DocumentRenderer {
  readonly format: 'html' | 'pdf' | 'jats-xml';
  render(document: OpusDocument, standard: ResolvedStandard): Promise<string | Buffer>;
}
