/**
 * Opus Publica Composition Engine (OPCE) — Document Builder & Foundation Unit Tests
 *
 * Validates document factories, cloning, serialization, checksum generation,
 * schema validation, and AST visitor traversal using Node built-in test runner.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  createDocument,
  createParagraphBlock,
  createTextInline,
  createHeadingBlock,
  cloneDocument,
  areDocumentsEqual,
  serializeDocument,
  deserializeDocument,
  computeDocumentChecksum,
  validateOpusDocument,
  traverseDocument,
  OpusASTVisitor,
} from '../../model/document-builder';

describe('OPCE Foundation Data & Document Builder (Milestone 1)', () => {
  const fixturesDir = path.join(process.cwd(), 'lib/opce/__tests__/golden/fixtures');

  it('createDocument produces valid OpusDocument AST', () => {
    const p = createParagraphBlock([createTextInline('Hello OPCE')]);
    const doc = createDocument('doc-101', { title: 'Test Document' }, [p]);

    assert.strictEqual(doc.version, '1.0.0');
    assert.strictEqual(doc.id, 'doc-101');
    assert.strictEqual(doc.metadata.title, 'Test Document');
    assert.strictEqual(doc.body.length, 1);
    assert.strictEqual(doc.body[0].type, 'paragraph');
  });

  it('Serialization and Deserialization round-trip', () => {
    const doc = createDocument('doc-102', { title: 'Roundtrip Test' }, [
      createHeadingBlock(1, [createTextInline('Section 1')], 'h-1'),
    ]);

    const json = serializeDocument(doc);
    const deserialized = deserializeDocument(json);

    assert.deepStrictEqual(deserialized, doc);
    assert.strictEqual(areDocumentsEqual(doc, deserialized), true);
  });

  it('Immutable cloning produces identical deep copy', () => {
    const doc = createDocument('doc-103', { title: 'Clone Test' });
    const cloned = cloneDocument(doc);

    assert.deepStrictEqual(cloned, doc);
    assert.notStrictEqual(cloned, doc); // Different object reference
  });

  it('computeDocumentChecksum produces deterministic SHA-256 hash prefix', () => {
    const docA = createDocument('doc-104', { title: 'Checksum Test' });
    const docB = createDocument('doc-104', { title: 'Checksum Test' });

    const hashA = computeDocumentChecksum(docA);
    const hashB = computeDocumentChecksum(docB);

    assert.strictEqual(hashA, hashB);
    assert.strictEqual(hashA.length, 16);
  });

  it('AST Visitor traverses all nodes in document tree', () => {
    const doc = createDocument('doc-105', { title: 'Visitor Test' }, [
      createHeadingBlock(1, [createTextInline('Heading Title')], 'sec-1'),
      createParagraphBlock([createTextInline('Paragraph content text.')]),
    ]);

    let visitedBlocks = 0;
    let visitedInlines = 0;

    const visitor: OpusASTVisitor = {
      visitBlock: () => { visitedBlocks++; },
      visitInline: () => { visitedInlines++; },
    };

    traverseDocument(doc, visitor);

    assert.strictEqual(visitedBlocks, 2);
    assert.strictEqual(visitedInlines, 2);
  });

  it('Golden Fixtures validate cleanly against OpusDocument schema', () => {
    const fixtureFiles = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.opus.json'));
    assert.strictEqual(fixtureFiles.length, 5);

    fixtureFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(fixturesDir, file), 'utf-8');
      const doc = JSON.parse(content);
      const val = validateOpusDocument(doc);

      assert.strictEqual(val.valid, true);
      assert.deepStrictEqual(val.errors, []);
    });
  });
});
