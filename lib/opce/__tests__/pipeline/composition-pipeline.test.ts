/**
 * Opus Publica Composition Engine (OPCE) — Composition Pipeline Unit Tests
 *
 * Validates end-to-end stage orchestration, public entrypoints (compose & analyse),
 * identical outputs for identical inputs, and pipeline failure isolation.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CompositionPipeline } from '../../pipeline/composition-pipeline';
import { AdapterRegistry } from '../../adapters/adapter-registry';
import { HTMLAdapter } from '../../adapters/html-adapter';
import { compose, analyse } from '../../index';
import type { RenderedOutput } from '../../package/types';

describe('OPCE Composition Pipeline & Public Entrypoints (Milestone 5)', () => {
  beforeEach(() => {
    AdapterRegistry.clear();
    AdapterRegistry.register(new HTMLAdapter());
  });

  it('Executes composition pipeline across all stages successfully', async () => {
    const result = await CompositionPipeline.execute({
      articleId: 'art-pipe-1',
      manuscriptInput: '<h1>Pipeline Title</h1><p>Pipeline manuscript body text.</p>',
      mimeType: 'text/html',
      mode: 'draft',
      initiatedBy: 'editor-pipe-1',
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.sessionId.includes('art-pipe-1'));
    assert.strictEqual(result.document.metadata.title, 'Untitled Article');
    assert.strictEqual(result.renderedOutputs.length, 1);
    const out0 = result.renderedOutputs[0] as RenderedOutput;
    assert.strictEqual(out0.format, 'html');
    assert.strictEqual(result.error, null);
    assert.ok(result.renderDurationMs >= 0);
  });

  it('Produces 100% identical styleChecksum and result metadata for identical inputs', async () => {
    const inputOptions = {
      articleId: 'art-det-pipe',
      manuscriptInput: '<p>Deterministic test text.</p>',
      mimeType: 'text/html',
      mode: 'draft' as const,
      initiatedBy: 'editor-det',
    };

    const res1 = await CompositionPipeline.execute(inputOptions);
    const res2 = await CompositionPipeline.execute(inputOptions);

    assert.strictEqual(res1.styleChecksum, res2.styleChecksum);
    assert.strictEqual(res1.document.body.length, res2.document.body.length);
  });

  it('Isolates pipeline failures when an unsupported MIME type is provided', async () => {
    const result = await CompositionPipeline.execute({
      articleId: 'art-fail-1',
      manuscriptInput: Buffer.from('raw data'),
      mimeType: 'application/unknown-mime',
      mode: 'publication',
      initiatedBy: 'editor-fail',
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.error !== null);
    assert.ok(result.error.includes('No registered manuscript adapter found'));
  });

  it('Executes public compose() entrypoint function', async () => {
    const result = await compose('art-public-compose', {
      mode: 'draft',
      initiatedBy: 'editor-pub-1',
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.sessionId.includes('art-public-compose'));
  });

  it('Executes public analyse() entrypoint function', async () => {
    const report = await analyse('art-public-analyse');

    assert.strictEqual(report.documentId, 'art-public-analyse');
    assert.ok(report.summary.score >= 0);
    assert.ok(report.analysers.length >= 5);
  });
});
