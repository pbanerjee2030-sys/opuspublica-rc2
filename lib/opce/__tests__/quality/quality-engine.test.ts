/**
 * Opus Publica Composition Engine (OPCE) — Quality Engine Unit Tests
 *
 * Validates phase orchestration, individual quality analysers (Metadata, Reference, Accessibility,
 * Compliance, Layout), fault isolation, deduplication, scoring, and report generation.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { QualityCoordinator } from '../../quality/coordinator';
import { resolveStandard, resolvePolicy } from '../../standards/standard-engine';
import { createDocument, createHeadingBlock, createParagraphBlock, createTextInline, createFigureBlock, createTableBlock } from '../../model/document-builder';
import type { QualityAnalyser, Diagnostic } from '../../quality/analyser';
import type { OpusDocument } from '../../model/types';

describe('OPCE Layered Quality Architecture & Engine (Milestone 3)', () => {
  const standard = resolveStandard(null);
  const policy = resolvePolicy(null);

  beforeEach(() => {
    QualityCoordinator.resetToDefaults();
  });

  it('Orchestrates analysers in phase order (1 -> 2 -> 3)', () => {
    const analysers = QualityCoordinator.getRegisteredAnalysers();
    assert.strictEqual(analysers.length, 5);

    let currentPhase = 1;
    analysers.forEach((a) => {
      assert.ok(a.phase >= currentPhase);
      currentPhase = a.phase;
    });
  });

  it('MetadataAnalyser detects missing title, abstract, authors, and DOI', async () => {
    const doc = createDocument('doc-meta-test', {
      title: 'Untitled Document',
      abstract: '',
      keywords: [],
      authors: [{ name: 'Test Author', givenName: null, surname: 'Author', orcid: null, affiliations: [], correspondingAuthor: true, email: null }],
      doi: null,
    });

    const report = await QualityCoordinator.runAnalysis(doc, standard, policy);

    assert.strictEqual(report.passed, false);
    assert.ok(report.summary.errorCount > 0);
    assert.ok(report.diagnostics.some((d) => d.code === 'MISSING_TITLE'));
    assert.ok(report.diagnostics.some((d) => d.code === 'MISSING_ABSTRACT'));
    assert.ok(report.diagnostics.some((d) => d.code === 'MISSING_ORCID'));
    assert.ok(report.diagnostics.some((d) => d.code === 'MISSING_DOI'));
  });

  it('ReferenceAnalyser detects uncited references, malformed DOIs/URLs, and duplicate DOIs', async () => {
    const doc = createDocument('doc-ref-test', { title: 'Ref Test' }, [createParagraphBlock([createTextInline('Body without citation')])], [
      { id: 'ref-1', type: 'article', authors: [], title: 'Paper 1', containerTitle: null, year: 2025, volume: null, issue: null, pages: null, doi: 'invalid-prefix', url: 'ftp://bad-url', raw: null },
      { id: 'ref-2', type: 'article', authors: [], title: 'Paper 2', containerTitle: null, year: 2025, volume: null, issue: null, pages: null, doi: 'invalid-prefix', url: 'https://valid-url', raw: null },
    ]);

    const report = await QualityCoordinator.runAnalysis(doc, standard, policy);

    assert.ok(report.diagnostics.some((d) => d.code === 'UNCITED_REFERENCE'));
    assert.ok(report.diagnostics.some((d) => d.code === 'MALFORMED_DOI'));
    assert.ok(report.diagnostics.some((d) => d.code === 'MALFORMED_URL'));
    assert.ok(report.diagnostics.some((d) => d.code === 'DUPLICATE_REFERENCE_DOI'));
  });

  it('AccessibilityAnalyser detects missing figure alt text and missing table headers', async () => {
    const fig = createFigureBlock('img.png', ''); // Missing alt text
    const tbl = createTableBlock([{ cells: [{ colspan: 1, rowspan: 1, children: [createParagraphBlock([createTextInline('Cell')])] }] }], null); // Missing header
    const doc = createDocument('doc-a11y-test', { title: 'A11y Test' }, [fig, tbl]);

    const report = await QualityCoordinator.runAnalysis(doc, standard, policy);

    assert.ok(report.diagnostics.some((d) => d.code === 'MISSING_ALT_TEXT'));
    assert.ok(report.diagnostics.some((d) => d.code === 'MISSING_TABLE_HEADER'));
  });

  it('ComplianceAnalyser detects policy violations for mandatory declarations and licenses', async () => {
    const doc = createDocument('doc-comp-test', {
      title: 'Compliance Test',
      abstract: 'Valid abstract text',
      keywords: ['test'],
      authors: [{ name: 'Author', givenName: null, surname: 'Author', orcid: '0000-0000-0000-0000', affiliations: [], correspondingAuthor: true, email: null }],
      declarations: { conflictOfInterest: '', dataAvailability: null, ethicsApproval: null }, // Missing required declaration
      copyright: { holder: 'Author', year: 2026, licenseType: 'All Rights Reserved', licenseUrl: '' }, // License mismatch
    });

    const report = await QualityCoordinator.runAnalysis(doc, standard, policy);

    assert.strictEqual(report.passed, false);
    assert.ok(report.diagnostics.some((d) => d.code === 'POLICY_VIOLATION_MISSING_DECLARATION'));
    assert.ok(report.diagnostics.some((d) => d.code === 'POLICY_VIOLATION_LICENSE_MISMATCH'));
  });

  it('LayoutAnalyser detects empty document body and trailing isolated heading', async () => {
    const docEmpty = createDocument('doc-layout-empty', { title: 'Empty Test' }, []);
    const reportEmpty = await QualityCoordinator.runAnalysis(docEmpty, standard, policy);
    assert.ok(reportEmpty.diagnostics.some((d) => d.code === 'EMPTY_DOCUMENT_BODY'));

    const docTrailing = createDocument('doc-layout-trailing', { title: 'Trailing Test' }, [
      createParagraphBlock([createTextInline('Content')]),
      createHeadingBlock(1, [createTextInline('Trailing Heading')], 'h-end'),
    ]);
    const reportTrailing = await QualityCoordinator.runAnalysis(docTrailing, standard, policy);
    assert.ok(reportTrailing.diagnostics.some((d) => d.code === 'TRAILING_ISOLATED_HEADING'));
  });

  it('Calculates score deterministically and deduplicates diagnostic IDs', async () => {
    const doc = createDocument('doc-score-test', { title: 'Score Test' }, [createParagraphBlock([createTextInline('Content')])]);
    const report = await QualityCoordinator.runAnalysis(doc, standard, policy);

    const expectedScore = Math.max(0, 100 - (report.summary.errorCount * 15 + report.summary.warningCount * 5));
    assert.strictEqual(report.summary.score, expectedScore);

    // Verify diagnostic IDs are unique
    const ids = report.diagnostics.map((d) => d.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, uniqueIds.size);
  });

  it('Isolates fault exceptions when an analyser throws an unexpected error', async () => {
    class FaultyAnalyser implements QualityAnalyser {
      readonly name = 'faulty-analyser';
      readonly category = 'metadata' as const;
      readonly phase = 1 as const;
      async analyse(): Promise<Diagnostic[]> {
        throw new Error('Simulated analyser failure');
      }
    }

    QualityCoordinator.registerAnalyser(new FaultyAnalyser());
    const doc = createDocument('doc-fault-test', { title: 'Fault Test' });

    const report = await QualityCoordinator.runAnalysis(doc, standard, policy);

    assert.ok(report.diagnostics.some((d) => d.code === 'ANALYSER_FAULT_EXCEEDED'));
  });
});
