/**
 * Opus Publica Composition Engine (OPCE) — Standard Engine Unit Tests
 *
 * Validates style inheritance resolution, deep-merge overrides, publisher policy resolution,
 * checksum generation, and caching behavior.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  resolveStandard,
  resolvePolicy,
  computeStyleChecksum,
  computePolicyChecksum,
  clearStandardCache,
} from '../../standards/standard-engine';
import type { JournalStyleOverrides, PublisherPolicy } from '../../standards/types';

describe('OPCE Standard Engine & Resolution (Milestone 2)', () => {
  beforeEach(() => {
    clearStandardCache();
  });

  it('Resolves house default publication standard when no overrides provided', () => {
    const standard = resolveStandard(null);

    assert.strictEqual(standard.page.size.width, 210);
    assert.strictEqual(standard.page.size.height, 297);
    assert.strictEqual(standard.typography.textAlignment, 'justify');
    assert.strictEqual(standard.coverPage.mastheadTitle, 'Opus Publica');
  });

  it('Deep-merges journal style overrides over default house style', () => {
    const overrides: JournalStyleOverrides = {
      page: {
        size: { width: 210, height: 297 },
        margins: { top: 30, right: 30, bottom: 30, left: 30 }, // Overridden margins
        bleed: 0,
      },
      coverPage: {
        mastheadTitle: 'Custom Journal Title', // Overridden masthead
        enabled: true,
        showJournalName: true,
        accentColor: '#FF0000',
        backgroundColor: '#000000',
        dividerStyle: 'line',
        mastheadSubtitle: null,
      },
    };

    const resolved = resolveStandard(overrides);

    assert.strictEqual(resolved.page.margins.top, 30);
    assert.strictEqual(resolved.page.margins.right, 30);
    assert.strictEqual(resolved.coverPage.mastheadTitle, 'Custom Journal Title');
    assert.strictEqual(resolved.coverPage.accentColor, '#FF0000');
    // Non-overridden values remain default
    assert.strictEqual(resolved.typography.bodyLineHeight, 1.7);
  });

  it('Computes deterministic 16-character SHA-256 style checksum', () => {
    const stdA = resolveStandard(null);
    const stdB = resolveStandard(null);

    const hashA = computeStyleChecksum(stdA);
    const hashB = computeStyleChecksum(stdB);

    assert.strictEqual(hashA, hashB);
    assert.strictEqual(hashA.length, 16);
  });

  it('Resolves default publisher policy and merges policy overrides', () => {
    const defaultPolicy = resolvePolicy(null);
    assert.strictEqual(defaultPolicy.mandatoryLicense, 'CC BY 4.0');
    assert.strictEqual(defaultPolicy.requireOrcidForCorrespondingAuthor, true);

    const overrides: Partial<PublisherPolicy> = {
      requireOrcidForAllAuthors: true,
      minimumAbstractLength: 200,
    };

    const resolved = resolvePolicy(overrides);
    assert.strictEqual(resolved.requireOrcidForAllAuthors, true);
    assert.strictEqual(resolved.minimumAbstractLength, 200);
    assert.strictEqual(resolved.mandatoryLicense, 'CC BY 4.0'); // Inherited
  });

  it('Caches resolved standards in memory by checksum', () => {
    const std1 = resolveStandard({ layout: { columns: 2, columnGap: 10, widowMinLines: 3, orphanMinLines: 3, headingKeepWithNext: true } });
    const std2 = resolveStandard({ layout: { columns: 2, columnGap: 10, widowMinLines: 3, orphanMinLines: 3, headingKeepWithNext: true } });

    assert.strictEqual(std1, std2); // Exact same object reference returned from cache
  });
});
