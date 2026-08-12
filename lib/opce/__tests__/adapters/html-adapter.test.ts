/**
 * Opus Publica Composition Engine (OPCE) — HTML Manuscript Adapter Unit Tests
 *
 * Validates conversion of HTML/TipTap rich text content into canonical OpusDocument AST nodes.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { HTMLAdapter } from '../../adapters/html-adapter';
import type { AdapterContext } from '../../adapters/adapter';
import type { HeadingBlock, ParagraphBlock, TableBlock, FigureBlock } from '../../model/types';

describe('OPCE HTML Manuscript Adapter (Milestone 2)', () => {
  const adapter = new HTMLAdapter();
  const context: AdapterContext = {
    articleId: 'art-html-1',
    journalId: 'j-html-1',
    existingMetadata: {
      title: 'HTML Parsing Test Article',
      abstract: 'Testing HTML adapter ingestion.',
      journalName: 'Journal of Policy Testing',
      journalSlug: 'policy-test',
    },
  };

  it('Identifies accepted MIME types correctly', () => {
    assert.strictEqual(adapter.accepts('text/html'), true);
    assert.strictEqual(adapter.accepts('application/xhtml+xml'), true);
    assert.strictEqual(adapter.accepts('application/pdf'), false);
  });

  it('Parses Headings and Paragraphs into AST blocks', async () => {
    const html = '<h1>Introduction</h1><p>This is paragraph <strong>one</strong> with bold text.</p>';
    const doc = await adapter.parse(html, context);

    assert.strictEqual(doc.version, '1.0.0');
    assert.strictEqual(doc.id, 'art-html-1');
    assert.strictEqual(doc.metadata.title, 'HTML Parsing Test Article');
    assert.strictEqual(doc.body.length, 2);

    const h1 = doc.body[0] as HeadingBlock;
    assert.strictEqual(h1.type, 'heading');
    assert.strictEqual(h1.level, 1);
    assert.strictEqual(h1.children[0].type, 'text');

    const p = doc.body[1] as ParagraphBlock;
    assert.strictEqual(p.type, 'paragraph');
    assert.strictEqual(p.children.length, 1);
    assert.strictEqual(p.children[0].type, 'styled');
  });

  it('Parses HTML tables into TableBlock AST nodes', async () => {
    const html = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
    const doc = await adapter.parse(html, context);

    const table = doc.body[0] as TableBlock;
    assert.strictEqual(table.type, 'table');
    assert.strictEqual(table.rows.length, 1);
    assert.strictEqual(table.rows[0].cells.length, 2);
  });

  it('Parses HTML figure and figcaption into FigureBlock AST nodes', async () => {
    const html = '<figure><img src="test-image.png" alt="Test Alt" /><figcaption>Figure Caption</figcaption></figure>';
    const doc = await adapter.parse(html, context);

    const fig = doc.body[0] as FigureBlock;
    assert.strictEqual(fig.type, 'figure');
    assert.strictEqual(fig.src, 'test-image.png');
    assert.strictEqual(fig.alt, 'Test Alt');
    assert.strictEqual(fig.caption?.[0].type, 'text');
  });

  it('Parses thematic breaks (<hr>) correctly', async () => {
    const html = '<p>Before break</p><hr /><p>After break</p>';
    const doc = await adapter.parse(html, context);

    assert.strictEqual(doc.body.length, 3);
    assert.strictEqual(doc.body[1].type, 'thematicbreak');
  });

  it('Sanitizes malicious script tags during parsing', async () => {
    const html = '<p>Safe content</p><script>alert("xss")</script>';
    const doc = await adapter.parse(html, context);

    assert.strictEqual(doc.body.length, 1);
    assert.strictEqual(doc.body[0].type, 'paragraph');
  });
});
