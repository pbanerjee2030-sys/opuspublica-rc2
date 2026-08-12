import * as fs from 'fs';
/**
 * Opus Publica Composition Engine (OPCE) — Rendering Coordinator & Engine
 *
 * Provides renderer registration, discovery by output format, and execution orchestration
 * for transforming OpusDocument ASTs and ResolvedStandards into target publication formats.
 */

import type { DocumentRenderer } from './renderer';
import { HTMLRenderer } from './html-renderer';
import type { OpusDocument } from '../model/types';
import type { ResolvedStandard } from '../standards/types';

/**
 * Registry and orchestrator managing OPCE document renderers.
 */
export class RenderingCoordinator {
  private static renderers: Map<string, DocumentRenderer> = new Map([
    ['html', new HTMLRenderer()],
  ]);

  /**
   * Registers a DocumentRenderer instance.
   * @param renderer The renderer implementation.
   */
  public static registerRenderer(renderer: DocumentRenderer): void {
    if (!renderer || !renderer.format) {
      throw new Error('Invalid renderer registration: format is required');
    }
    this.renderers.set(renderer.format, renderer);
  }

  /**
   * Resets registered renderers to the default set.
   */
  public static resetToDefaults(): void {
    this.renderers = new Map([
      ['html', new HTMLRenderer()],
    ]);
  }

  /**
   * Clears all registered renderers (primarily for testing isolation).
   */
  public static clear(): void {
    this.renderers.clear();
  }

  /**
   * Discovers and returns the registered renderer for the specified output format.
   * @param format Output format identifier ('html' | 'pdf' | 'jats-xml').
   * @returns Matching DocumentRenderer instance.
   * @throws Error if no renderer is registered for the specified format.
   */
  public static getRendererForFormat(format: 'html' | 'pdf' | 'jats-xml'): DocumentRenderer {
    const renderer = this.renderers.get(format);
    if (!renderer) {
      throw new Error(`No registered document renderer found for output format: "${format}"`);
    }
    return renderer;
  }

  /**
   * Returns a list of all currently registered renderers.
   */
  public static getRegisteredRenderers(): DocumentRenderer[] {
    return Array.from(this.renderers.values());
  }

  /**
   * Orchestrates rendering of an OpusDocument using the specified format renderer.
   * @param document Canonical OpusDocument AST.
   * @param standard Resolved publication standard.
   * @param format Target format ('html' | 'pdf' | 'jats-xml').
   * @returns Promise resolving to rendered string or Buffer output.
   */
  public static async renderDocument(
    document: OpusDocument,
    standard: ResolvedStandard,
    format: 'html' | 'pdf' | 'jats-xml'
  ): Promise<string | Buffer> {
    const renderer = this.getRendererForFormat(format);
    return renderer.render(document, standard);
  }
}
