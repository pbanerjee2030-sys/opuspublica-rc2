/**
 * Opus Publica Composition Engine (OPCE) — HTML Renderer Unit Tests
 *
 * Validates deterministic HTML5 rendering, headings, paragraphs, lists, tables, figures,
 * metadata, references, footnotes, watermark overlays, and identical outputs for identical inputs.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { HTMLRenderer } from '../../renderers/html-renderer';
import { resolveStandard } from '../../standards/standard-engine';
import {
  createDocument,
  createParagraphBlock,
  createHeadingBlock,
  createTableBlock,
  createFigureBlock,
  createTextInline,
} from '../../model/document-builder';

describe('OPCE HTML Document Renderer (Milestone 4)', () => {
  const renderer = new HTMLRenderer();
  const standard = resolveStandard(null);

  it('Renders valid HTML5 document structure with head, style, and body', async () => {
    const doc = createDocument('doc-html-render-1', { title: 'HTML5 Structure Test' }, [
      createParagraphBlock([createTextInline('Body paragraph text.')]),
    ]);

    const html = await renderer.render(doc, standard);

    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('<title>HTML5 Structure Test</title>'));
    assert.ok(html.includes('class="article-container"'));
    assert.ok(html.includes('Body paragraph text.'));
  });

  it('Renders headings with level tags and anchor IDs', async () => {
    const doc = createDocument('doc-html-h-test', { title: 'Heading Test' }, [
      createHeadingBlock(1, [createTextInline('Main Section')], 'sec-main'),
      createHeadingBlock(2, [createTextInline('Subsection Title')], 'sec-sub'),
    ]);

    const html = await renderer.render(doc, standard);

    assert.ok(html.includes('<h1 id="sec-main">Main Section</h1>'));
    assert.ok(html.includes('<h2 id="sec-sub">Subsection Title</h2>'));
  });

  it('Renders tables with <thead>, <tbody>, <caption> and borders', async () => {
    const table = createTableBlock(
      [{ cells: [{ colspan: 1, rowspan: 1, children: [createParagraphBlock([createTextInline('Data Cell')])] }] }],
      [{ cells: [{ colspan: 1, rowspan: 1, children: [createParagraphBlock([createTextInline('Header Cell')])] }] }],
      [createTextInline('Table Caption Title')],
      'Table 1',
      'tbl-test-1'
    );
    const doc = createDocument('doc-tbl-render', { title: 'Table Render Test' }, [table]);

    const html = await renderer.render(doc, standard);

    assert.ok(html.includes('<table id="tbl-test-1">'));
    assert.ok(html.includes('<caption>Table Caption Title</caption>'));
    assert.ok(html.includes('<thead><tr><th><p>Header Cell</p></th></tr></thead>'));
    assert.ok(html.includes('<tbody><tr><td><p>Data Cell</p></td></tr></tbody>'));
  });

  it('Renders figure image with src, alt text, and figcaption', async () => {
    const figure = createFigureBlock('image.png', 'Alt Image Description', [createTextInline('Figure Caption Text')], 'Figure 1', 'fig-test-1');
    const doc = createDocument('doc-fig-render', { title: 'Figure Render Test' }, [figure]);

    const html = await renderer.render(doc, standard);

    assert.ok(html.includes('<figure id="fig-test-1">'));
    assert.ok(html.includes('src="image.png"'));
    assert.ok(html.includes('alt="Alt Image Description"'));
    assert.ok(html.includes('<figcaption>Figure Caption Text</figcaption>'));
  });

  it('Renders references bibliography section correctly', async () => {
    const doc = createDocument(
      'doc-ref-render',
      { title: 'Ref Render Test' },
      [createParagraphBlock([createTextInline('Content')])],
      [
        {
          id: 'ref-apa-1',
          type: 'article',
          authors: [{ given: 'Elena', surname: 'Marchetti' }],
          title: 'AI Governance Studies',
          containerTitle: 'Global Policy Journal',
          year: 2026,
          volume: '1',
          issue: '1',
          pages: '1-10',
          doi: '10.5555/test.001',
          url: 'https://doi.org/10.5555/test.001',
          raw: null,
        },
      ]
    );

    const html = await renderer.render(doc, standard);

    assert.ok(html.includes('class="references-section"'));
    assert.ok(html.includes('Marchetti, Elena'));
    assert.ok(html.includes('AI Governance Studies'));
    assert.ok(html.includes('https://doi.org/10.5555/test.001'));
  });

  it('Renders footnotes section and footnoterefs correctly', async () => {
    const doc = createDocument(
      'doc-fn-render',
      { title: 'Footnote Test' },
      [createParagraphBlock([createTextInline('Paragraph with footnote reference.')])],
      [],
      [{ id: '1', children: [createParagraphBlock([createTextInline('Footnote explanation text.')])] }]
    );

    const html = await renderer.render(doc, standard);

    assert.ok(html.includes('class="footnotes-section"'));
    assert.ok(html.includes('id="fn-1"'));
    assert.ok(html.includes('Footnote explanation text.'));
  });

  it('Renders draft watermark overlay when present in standard', async () => {
    const doc = createDocument('doc-wm-test', { title: 'Watermark Test' }, [
      createParagraphBlock([createTextInline('Content')]),
    ]);

    const html = await renderer.render(doc, standard);

    assert.ok(html.includes('class="watermark-overlay"'));
    assert.ok(html.includes('UNOFFICIAL DRAFT'));
  });

  it('Produces 100% identical HTML output for identical input (Determinism)', async () => {
    const doc = createDocument('doc-det-test', { title: 'Deterministic Test' }, [
      createParagraphBlock([createTextInline('Deterministic content test.')]),
    ]);

    const htmlRun1 = await renderer.render(doc, standard);
    const htmlRun2 = await renderer.render(doc, standard);

    assert.strictEqual(htmlRun1, htmlRun2);
  });
});
