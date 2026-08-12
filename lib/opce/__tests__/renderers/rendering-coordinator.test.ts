/**
 * Opus Publica Composition Engine (OPCE) — Rendering Coordinator Unit Tests
 *
 * Validates renderer registration, format lookup, discovery, and execution orchestration.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RenderingCoordinator } from '../../renderers/rendering-coordinator';
import { HTMLRenderer } from '../../renderers/html-renderer';
import { resolveStandard } from '../../standards/standard-engine';
import { createDocument, createParagraphBlock, createTextInline } from '../../model/document-builder';

describe('OPCE Rendering Coordinator & Engine (Milestone 4)', () => {
  beforeEach(() => {
    RenderingCoordinator.clear();
  });

  it('Registers and discovers renderers by output format', () => {
    const renderer = new HTMLRenderer();
    RenderingCoordinator.registerRenderer(renderer);

    const resolved = RenderingCoordinator.getRendererForFormat('html');
    assert.strictEqual(resolved, renderer);
    assert.strictEqual(resolved.format, 'html');
  });

  it('Throws error when no renderer is registered for a format', () => {
    assert.throws(
      () => RenderingCoordinator.getRendererForFormat('pdf'),
      /No registered document renderer found for output format/
    );
  });

  it('Lists all registered renderers', () => {
    const htmlRenderer = new HTMLRenderer();
    RenderingCoordinator.registerRenderer(htmlRenderer);

    const list = RenderingCoordinator.getRegisteredRenderers();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0], htmlRenderer);
  });

  it('Orchestrates renderDocument execution through registered HTML renderer', async () => {
    const htmlRenderer = new HTMLRenderer();
    RenderingCoordinator.registerRenderer(htmlRenderer);

    const doc = createDocument('doc-render-orchestrate', { title: 'Orchestrated Render Test' }, [
      createParagraphBlock([createTextInline('Orchestrated paragraph text.')]),
    ]);
    const standard = resolveStandard(null);

    const output = await RenderingCoordinator.renderDocument(doc, standard, 'html');

    assert.ok(typeof output === 'string');
    assert.ok(output.includes('Orchestrated Render Test'));
    assert.ok(output.includes('Orchestrated paragraph text.'));
  });
});
