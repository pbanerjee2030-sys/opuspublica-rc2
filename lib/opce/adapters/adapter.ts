/**
 * Opus Publica Composition Engine (OPCE) — Manuscript Adapter Interface
 *
 * Contract for manuscript input adapters converting raw formats (HTML, DOCX, etc.)
 * into canonical OpusDocument AST representations.
 */

import type { OpusDocument } from '../model/types';

/**
 * Responsibility: Provides contextual metadata and execution helpers during manuscript ingestion.
 * Lifecycle: Created by pipeline orchestrator (M5) prior to invoking adapter.
 * Ownership: OPCE Adapter Domain.
 * Intended Consumers: ManuscriptAdapter implementations (M2).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface AdapterContext {
  articleId: string;
  journalId: string;
  publicationContext?: import('../model/types').PublicationContext;
  assetUploader?: (file: Buffer, filename: string) => Promise<string>;
}

/**
 * Responsibility: Primary strategy interface for converting raw input manuscripts into canonical OpusDocument AST.
 * Lifecycle: Registered in AdapterRegistry (M2), resolved by MIME type during ingestion pipeline execution (M5).
 * Ownership: OPCE Adapter Domain.
 * Intended Consumers: Pipeline Orchestrator (M5), Adapter Registry (M2).
 * Implementation Milestone: M0 (Contract Freeze), implemented in M2 (`HTMLAdapter`).
 */
export interface ManuscriptAdapter {
  readonly name: string;
  accepts(mimeType: string): boolean;
  parse(input: Buffer | string, context: AdapterContext): Promise<OpusDocument>;
}
