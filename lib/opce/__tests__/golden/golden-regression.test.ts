/**
 * Opus Publica Composition Engine (OPCE) — Golden Document Regression Suite
 *
 * Validates 5 golden document test fixtures across end-to-end HTML rendering,
 * quality report diagnostics, publication package construction, and determinism.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { OpusDocument } from '../../model/types';
import { resolveStandard } from '../../standards/standard-engine';
import { HTMLRenderer } from '../../renderers/html-renderer';
import { QualityCoordinator } from '../../quality/coordinator';
import { PublicationPackageBuilder } from '../../package/package-builder';

describe('OPCE Golden Document Regression Suite (Milestone 7)', () => {
  const fixtureFiles = [
    'simple-article.opus.json',
    'complex-article.opus.json',
    'multi-author.opus.json',
    'long-references.opus.json',
    'edge-cases.opus.json',
  ];

  const renderer = new HTMLRenderer();
  const standard = resolveStandard(null);

  for (const fileName of fixtureFiles) {
    it(`Regression test for golden fixture: ${fileName}`, async () => {
      const filePath = join(process.cwd(), 'lib/opce/__tests__/golden/fixtures', fileName);
      const fileContent = readFileSync(filePath, 'utf-8');
      const doc: OpusDocument = JSON.parse(fileContent);

      // 1. Verify Document AST integrity
      assert.ok(doc.id.length > 0);
      assert.ok(doc.metadata.title.length > 0);
      assert.ok(Array.isArray(doc.body));

      // 2. Verify Deterministic HTML Rendering
      const html1 = await renderer.render(doc, standard);
      const html2 = await renderer.render(doc, standard);
      assert.strictEqual(html1, html2);
      assert.ok(html1.includes('<!DOCTYPE html>'));

      // 3. Verify Quality Analysis Execution
      const report = await QualityCoordinator.runAnalysis(doc, standard);
      assert.ok(report.summary.score >= 0 && report.summary.score <= 100);

      // 4. Verify Immutable Package Construction
      const pkg = PublicationPackageBuilder.buildPackage({
        articleId: doc.id,
        createdBy: 'regression-tester',
        renderMode: 'publication',
        document: doc,
        resolvedStandard: standard,
        qualityReport: report,
        adapterUsed: 'golden-adapter',
        styleChecksum: 'gold-style-sha256',
        sessionId: `gold-session-${doc.id}`,
        renderDurationMs: 10,
      });

      assert.strictEqual(pkg.articleId, doc.id);
      assert.strictEqual(pkg.packageVersion, '1.0.0');
      assert.ok(Object.isFrozen(pkg));
    });
  }
});
