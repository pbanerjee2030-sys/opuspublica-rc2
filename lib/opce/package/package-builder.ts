/**
 * Opus Publica Composition Engine (OPCE) — Publication Package Builder
 *
 * Constructs immutable archival PublicationPackage structures containing frozen OpusDocuments,
 * resolved standards, quality reports, rendered output manifests, and execution metadata.
 */

import { createHash } from 'crypto';
import type { OpusDocument } from '../model/types';
import type { ResolvedStandard } from '../standards/types';
import type { QualityReport } from '../quality/analyser';
import type { PublicationPackage, PackageMetadata, RenderedOutput } from './types';

/**
 * Options for configuring package construction.
 */
export interface PackageBuilderOptions {
  articleId: string;
  createdBy: string;
  renderMode: 'draft' | 'publication';
  document: OpusDocument;
  resolvedStandard: ResolvedStandard;
  qualityReport: QualityReport;
  adapterUsed: string;
  styleChecksum: string;
  sessionId: string;
  renderDurationMs: number;
  doi?: string | null;
}

/**
 * Builder producing immutable PublicationPackage instances.
 */
export class PublicationPackageBuilder {
  private static OPCE_VERSION = '1.0.0';
  private static RENDERER_VERSION = 'html-renderer-1.0';

  /**
   * Constructs an immutable PublicationPackage object.
   * @param options Configuration options.
   * @param renderedOutputs Array of rendered artifact descriptors.
   * @returns Immutable PublicationPackage instance.
   */
  public static buildPackage(
    options: PackageBuilderOptions,
    renderedOutputs: RenderedOutput[] = []
  ): PublicationPackage {
    const metadata: PackageMetadata = {
      doi: options.doi || options.document.metadata.doi || null,
      adapterUsed: options.adapterUsed,
      opceVersion: this.OPCE_VERSION,
      rendererVersion: this.RENDERER_VERSION,
      styleChecksum: options.styleChecksum,
      sessionId: options.sessionId,
      renderDurationMs: options.renderDurationMs,
      nodeVersion: process.version,
      createdAt: new Date().toISOString(),
    };

    const pkg: PublicationPackage = {
      packageVersion: '1.0.0',
      articleId: options.articleId,
      createdAt: new Date().toISOString(),
      createdBy: options.createdBy,
      renderMode: options.renderMode,
      document: JSON.parse(JSON.stringify(options.document)),
      resolvedStandard: JSON.parse(JSON.stringify(options.resolvedStandard)),
      qualityReport: JSON.parse(JSON.stringify(options.qualityReport)),
      renderedOutputs: [...renderedOutputs],
      metadata,
    };

    const validation = this.validatePackage(pkg);
    if (!validation.valid) {
      throw new Error(`PublicationPackage validation failed: ${validation.errors.join('; ')}`);
    }

    return Object.freeze(pkg);
  }

  /**
   * Helper creating a RenderedOutput descriptor with computed SHA-256 checksum.
   */
  public static createRenderedOutput(
    format: 'pdf' | 'html' | 'jats-xml',
    storagePath: string,
    content: string | Buffer
  ): RenderedOutput {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    const checksum = createHash('sha256').update(buffer).digest('hex').slice(0, 16);

    return {
      format,
      storagePath,
      checksum,
      sizeBytes: buffer.length,
      renderedAt: new Date().toISOString(),
    };
  }

  /**
   * Validates a PublicationPackage object for schema completeness.
   */
  public static validatePackage(pkg: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!pkg || typeof pkg !== 'object') {
      return { valid: false, errors: ['Package must be an object'] };
    }

    const obj = pkg as Record<string, unknown>;
    if (obj.packageVersion !== '1.0.0') errors.push('Invalid package version (must be 1.0.0)');
    if (!obj.articleId || typeof obj.articleId !== 'string') errors.push('Missing articleId');
    if (!obj.document || typeof obj.document !== 'object') errors.push('Missing document AST');
    if (!obj.resolvedStandard || typeof obj.resolvedStandard !== 'object') errors.push('Missing resolvedStandard');
    if (!obj.qualityReport || typeof obj.qualityReport !== 'object') errors.push('Missing qualityReport');
    if (!Array.isArray(obj.renderedOutputs)) errors.push('renderedOutputs must be an array');
    if (!obj.metadata || typeof obj.metadata !== 'object') errors.push('Missing metadata');

    return { valid: errors.length === 0, errors };
  }
}
