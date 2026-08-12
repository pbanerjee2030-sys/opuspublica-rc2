
/**
 * Opus Publica Composition Engine (OPCE) — Manuscript Adapter Registry
 *
 * Provides central registration, MIME type resolution, discovery, and execution
 * orchestration for manuscript input adapters.
 */

import type { ManuscriptAdapter, AdapterContext } from './adapter';
import { HTMLAdapter } from './html-adapter';
import type { OpusDocument } from '../model/types';

/**
 * Registry managing manuscript input adapters for format ingestion.
 */
export class AdapterRegistry {
  private static adapters: Map<string, ManuscriptAdapter> = new Map([
    ['html-adapter', new HTMLAdapter()],
  ]);

  /**
   * Registers a manuscript adapter instance.
   * @param adapter The adapter instance implementing ManuscriptAdapter.
   */
  public static register(adapter: ManuscriptAdapter): void {
    if (!adapter || !adapter.name) {
      throw new Error('Invalid adapter registration: name is required');
    }
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Resets registered adapters to default set.
   */
  public static resetToDefaults(): void {
    this.adapters = new Map([
      ['html-adapter', new HTMLAdapter()],
    ]);
  }

  /**
   * Clears all registered adapters (primarily for testing isolation).
   */
  public static clear(): void {
    this.adapters.clear();
  }

  /**
   * Discovers and returns the appropriate adapter accepting the specified MIME type.
   * @param mimeType The MIME type string (e.g. 'text/html', 'application/xhtml+xml').
   * @returns The matching ManuscriptAdapter instance.
   * @throws Error if no registered adapter accepts the MIME type.
   */
  public static getAdapterForMimeType(mimeType: string): ManuscriptAdapter {
    const cleanMime = mimeType.trim().toLowerCase();
    for (const adapter of this.adapters.values()) {
      if (adapter.accepts(cleanMime)) {
        return adapter;
      }
    }
    throw new Error(`No registered manuscript adapter found for MIME type: "${mimeType}"`);
  }

  /**
   * Returns a list of all currently registered adapters.
   */
  public static getRegisteredAdapters(): ManuscriptAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Orchestrates manuscript parsing by resolving the MIME type and delegating to the matched adapter.
   * @param input Raw manuscript content buffer or string.
   * @param mimeType Target MIME type identifier.
   * @param context Ingestion context parameters.
   * @returns Promise resolving to canonical OpusDocument AST.
   */
  public static async parseManuscript(
    input: Buffer | string,
    mimeType: string,
    context: AdapterContext
  ): Promise<OpusDocument> {

    const adapter = this.getAdapterForMimeType(mimeType);
    return adapter.parse(input, context);
  }
}
