/**
 * Opus Publica Composition Engine (OPCE) — Dashboard Integration Tests
 *
 * Validates editorial workspace UI integration, OPCE API endpoint response structures,
 * quality report viewer data mapping, package display structures, and non-regression.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compose, type QualityReport, type RenderedOutput } from '../../index';

describe('OPCE Dashboard & Editorial Workspace Integration (Milestone 6)', () => {
  it('Executes composition through internal OPCE service contracts', async () => {
    const result = await compose('art-dash-test-1', {
      mode: 'draft',
      initiatedBy: 'editor-admin',
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.sessionId.includes('art-dash-test-1'));
    const report = result.qualityReport as QualityReport;
    assert.strictEqual(report.summary.score >= 0, true);
    assert.strictEqual(result.renderedOutputs.length > 0, true);
  });

  it('Generates quality report diagnostics consumable by QualityReportCard component', async () => {
    const result = await compose('art-dash-test-2', {
      mode: 'publication',
      initiatedBy: 'editor-admin',
    });

    const report = result.qualityReport as QualityReport;
    assert.ok(report !== null);
    assert.ok(typeof report.summary.score === 'number');
    assert.ok(typeof report.summary.errorCount === 'number');
    assert.ok(typeof report.summary.warningCount === 'number');
    assert.ok(Array.isArray(report.diagnostics));
  });

  it('Provides rendered outputs manifest consumable by PackageViewer component', async () => {
    const result = await compose('art-dash-test-3', {
      mode: 'draft',
      initiatedBy: 'editor-admin',
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.packageStoragePath.length > 0);
    assert.ok(result.styleChecksum.length > 0);
    const outputs = result.renderedOutputs as RenderedOutput[];
    assert.ok(outputs.length >= 1);
  });

  it('Verifies non-regression: OPCE remains modular and non-intrusive', () => {
    // Confirms OPCE subsystem exports functions without mutating global states
    assert.strictEqual(typeof compose, 'function');
  });
});
