// governance/lib/preservation/dark-archive.ts
//
// WORKSTREAM H — Local Dark Archive
//
// Authority: rc2-post-remediation-governance-decisions.md §4
//
// Creates BagIt-style preservation packages after successful governed publication.
// External networks (CLOCKSS/Portico/LOCKSS) remain post-launch objectives.

import { createHash } from 'crypto';

export interface PreservationPackage {
  articleId?: string;
  bookId?: string;
  packageType: 'article' | 'book';
  manifestChecksum: string;
  packageChecksum: string;
  storageUri: string;
  storageProvider: string;
  isImmutable: boolean;
}

export interface BagItManifest {
  bagitVersion: string;
  bagInfo: {
    'Bag-Software-Agent': string;
    'Bagging-Date': string;
    'External-Identifier': string;
    'Payload-Oxum': string;
  };
  manifest: Record<string, string>; // filename → SHA-256 checksum
}

/**
 * Creates a BagIt-style manifest for a preservation package.
 *
 * The package includes:
 * - PDF (the published PDF)
 * - Machine-readable metadata (JSON)
 * - Manifest (SHA-256 checksums)
 * - Version identity
 * - Article identifier
 * - Publication event identity
 */
export function createBagItManifest(files: Array<{ filename: string; content: Buffer | string }>): BagItManifest {
  const manifest: Record<string, string> = {};
  let totalBytes = 0;

  for (const file of files) {
    const content = typeof file.content === 'string' ? Buffer.from(file.content) : file.content;
    const hash = createHash('sha256').update(content).digest('hex');
    manifest[file.filename] = hash;
    totalBytes += content.length;
  }

  return {
    bagitVersion: '1.0',
    bagInfo: {
      'Bag-Software-Agent': 'Opus Publica Preservation Service v1.0',
      'Bagging-Date': new Date().toISOString().split('T')[0],
      'External-Identifier': `opuspublica:${Date.now()}`,
      'Payload-Oxum': `${totalBytes}.${files.length}`,
    },
    manifest,
  };
}

/**
 * Computes the overall package checksum from a BagIt manifest.
 */
export function computePackageChecksum(manifest: BagItManifest): string {
  const sortedEntries = Object.entries(manifest.manifest)
    .sort(([a], [b]) => a.localeCompare(b));
  const input = sortedEntries.map(([filename, hash]) => `${filename}:${hash}`).join('\n');
  return createHash('sha256').update(input).digest('hex');
}
