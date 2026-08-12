/**
 * Opus Publica Composition Engine (OPCE) — Publication Package Types
 *
 * Immutable archival package structures containing frozen OpusDocuments,
 * resolved standards, quality reports, rendered artifacts, and metadata.
 */

import type { OpusDocument } from '../model/types';
import type { ResolvedStandard } from '../standards/types';
import type { QualityReport } from '../quality/analyser';

/**
 * Responsibility: Metadata descriptor for a single rendered artifact file (PDF, HTML, JATS XML).
 * Lifecycle: Created by PackageBuilder (M5), stored in PublicationPackage JSON.
 * Ownership: OPCE Package Domain.
 * Intended Consumers: Package Builder (M5), Archival System.
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface RenderedOutput {
  format: 'pdf' | 'html' | 'jats-xml';
  storagePath: string;
  checksum: string;
  sizeBytes: number;
  renderedAt: string;
}

/**
 * Responsibility: Archival execution metadata recording environment, versions, duration, and style hash.
 * Lifecycle: Captured by PackageBuilder (M5), stored in PublicationPackage JSON.
 * Ownership: OPCE Package Domain.
 * Intended Consumers: Package Builder (M5), Audit & Archival System.
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface PackageMetadata {
  doi: string | null;
  adapterUsed: string;
  opceVersion: string;
  rendererVersion: string;
  styleChecksum: string;
  sessionId: string;
  renderDurationMs: number;
  nodeVersion: string;
  createdAt: string;
}

/**
 * Responsibility: Primary archival object containing complete frozen state required for future format regeneration.
 * Lifecycle: Assembled by PackageBuilder (M5), stored in Supabase Storage (`publications/packages/*`).
 * Ownership: OPCE Package Domain.
 * Intended Consumers: Package Builder (M5), Pipeline Orchestrator (M5), Future Exporters/Migrators.
 * Implementation Milestone: M0 (Contract Freeze), instantiated in M5.
 */
export interface PublicationPackage {
  packageVersion: '1.0.0';
  articleId: string;
  createdAt: string;
  createdBy: string;
  renderMode: 'draft' | 'publication';
  document: OpusDocument;
  resolvedStandard: ResolvedStandard;
  qualityReport: QualityReport;
  renderedOutputs: RenderedOutput[];
  metadata: PackageMetadata;
}
