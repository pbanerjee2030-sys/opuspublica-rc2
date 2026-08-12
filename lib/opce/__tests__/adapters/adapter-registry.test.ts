/**
 * Opus Publica Composition Engine (OPCE) — Adapter Registry Unit Tests
 *
 * Validates adapter registration, MIME type resolution, discovery, and execution orchestration.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { AdapterRegistry } from '../../adapters/adapter-registry';
import { HTMLAdapter } from '../../adapters/html-adapter';
import type { ManuscriptAdapter, AdapterContext } from '../../adapters/adapter';
import type { OpusDocument } from '../../model/types';

describe('OPCE Manuscript Adapter Registry (Milestone 2)', () => {
  beforeEach(() => {
    AdapterRegistry.clear();
  });

  it('Registers and discovers adapters by MIME type', () => {
    const adapter = new HTMLAdapter();
    AdapterRegistry.register(adapter);

    const resolved = AdapterRegistry.getAdapterForMimeType('text/html');
    assert.strictEqual(resolved, adapter);
    assert.strictEqual(resolved.name, 'html-adapter');
  });

  it('Resolves MIME types case-insensitively with whitespace trimming', () => {
    const adapter = new HTMLAdapter();
    AdapterRegistry.register(adapter);

    const resolved = AdapterRegistry.getAdapterForMimeType('  TEXT/HTML  ');
    assert.strictEqual(resolved, adapter);
  });

  it('Throws error when no adapter is registered for a MIME type', () => {
    assert.throws(
      () => AdapterRegistry.getAdapterForMimeType('application/docx'),
      /No registered manuscript adapter found for MIME type/
    );
  });

  it('Lists all registered adapters', () => {
    const htmlAdapter = new HTMLAdapter();
    AdapterRegistry.register(htmlAdapter);

    const list = AdapterRegistry.getRegisteredAdapters();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0], htmlAdapter);
  });

  it('Orchestrates parseManuscript execution through registered adapter', async () => {
    const htmlAdapter = new HTMLAdapter();
    AdapterRegistry.register(htmlAdapter);

    const context: AdapterContext = {
      articleId: 'art-registry-1',
      journalId: 'j-registry-1',
      existingMetadata: { title: 'Registry Test Article' },
    };

    const doc: OpusDocument = await AdapterRegistry.parseManuscript(
      '<p>Registry orchestrated content.</p>',
      'text/html',
      context
    );

    assert.strictEqual(doc.id, 'art-registry-1');
    assert.strictEqual(doc.metadata.title, 'Registry Test Article');
    assert.strictEqual(doc.body.length, 1);
  });
});
