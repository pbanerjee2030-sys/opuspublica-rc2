/**
 * Opus Publica Composition Engine (OPCE) — Publication Standards & Policy Tests
 *
 * Validates house default publication style JSON and publisher policy JSON assets
 * against Milestone 0 ResolvedStandard and PublisherPolicy schemas using Node native test runner.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { validateResolvedStandard, validatePublisherPolicy } from '../../model/document-builder';

describe('OPCE Publication Standards & Policy JSON Assets (Milestone 1)', () => {
  const standardsDir = path.join(process.cwd(), 'lib/opce/standards');

  it('opus-publica-default.json conforms strictly to ResolvedStandard schema', () => {
    const stylePath = path.join(standardsDir, 'opus-publica-default.json');
    assert.strictEqual(fs.existsSync(stylePath), true);

    const styleContent = fs.readFileSync(stylePath, 'utf-8');
    const styleObj = JSON.parse(styleContent);
    const val = validateResolvedStandard(styleObj);

    assert.strictEqual(val.valid, true);
    assert.deepStrictEqual(val.errors, []);
    assert.strictEqual(styleObj.page.size.width, 210);
    assert.strictEqual(styleObj.page.size.height, 297);
  });

  it('opus-publica-default-policy.json conforms strictly to PublisherPolicy schema', () => {
    const policyPath = path.join(standardsDir, 'opus-publica-default-policy.json');
    assert.strictEqual(fs.existsSync(policyPath), true);

    const policyContent = fs.readFileSync(policyPath, 'utf-8');
    const policyObj = JSON.parse(policyContent);
    const val = validatePublisherPolicy(policyObj);

    assert.strictEqual(val.valid, true);
    assert.deepStrictEqual(val.errors, []);
    assert.strictEqual(policyObj.mandatoryLicense, 'CC BY 4.0');
  });
});
