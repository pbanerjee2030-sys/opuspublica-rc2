/**
 * Opus Publica Composition Engine (OPCE) — Publication Package Builder Unit Tests
 *
 * Validates immutable PublicationPackage construction, metadata generation,
 * rendered output checksum calculation, and package schema validation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PublicationPackageBuilder } from '../../package/package-builder';
import { resolveStandard } from '../../standards/standard-engine';
import { QualityCoordinator } from '../../quality/coordinator';
import { createDocument, createParagraphBlock, createTextInline } from '../../model/document-builder';

describe('OPCE Publication Package Builder (Milestone 5)', () => {
  const standard = resolveStandard(null);
  const doc = createDocument('doc-pkg-test', { title: 'Package Test Article' }, [
    createParagraphBlock([createTextInline('Content text.')]),
  ]);

  it('Builds an immutable PublicationPackage with frozen properties', async () => {
    const qualityReport = await QualityCoordinator.runAnalysis(doc, standard);

    const pkg = PublicationPackageBuilder.buildPackage({
      articleId: 'doc-pkg-test',
      createdBy: 'editor-101',
      renderMode: 'publication',
      document: doc,
      resolvedStandard: standard,
      qualityReport,
      adapterUsed: 'html-adapter',
      styleChecksum: '1234567890abcdef',
      sessionId: 'session-pkg-1',
      renderDurationMs: 125,
      doi: '10.5555/pkg.001',
    });

    assert.strictEqual(pkg.packageVersion, '1.0.0');
    assert.strictEqual(pkg.articleId, 'doc-pkg-test');
    assert.strictEqual(pkg.createdBy, 'editor-101');
    assert.strictEqual(pkg.renderMode, 'publication');
    assert.strictEqual(pkg.metadata.doi, '10.5555/pkg.001');
    assert.strictEqual(pkg.metadata.styleChecksum, '1234567890abcdef');
    assert.strictEqual(pkg.metadata.renderDurationMs, 125);
    assert.ok(Object.isFrozen(pkg));
  });

  it('Creates RenderedOutput descriptor with computed SHA-256 checksum', () => {
    const htmlContent = '<html><body>Rendered HTML</body></html>';
    const output = PublicationPackageBuilder.createRenderedOutput(
      'html',
      'publications/rendered/doc-pkg-test/session-1.html',
      htmlContent
    );

    assert.strictEqual(output.format, 'html');
    assert.strictEqual(output.sizeBytes, Buffer.from(htmlContent).length);
    assert.strictEqual(output.checksum.length, 16);
  });

  it('Validates PublicationPackage schema completeness', () => {
    const invalidPkg = { packageVersion: '1.0.0', articleId: 'doc-1' };
    const val = PublicationPackageBuilder.validatePackage(invalidPkg);

    assert.strictEqual(val.valid, false);
    assert.ok(val.errors.length > 0);
  });
});
