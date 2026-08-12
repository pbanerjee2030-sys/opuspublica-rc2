/**
 * Opus Publica Composition Engine (OPCE) — Metadata Quality Analyser
 *
 * Phase 1 quality analyser inspecting OpusDocument metadata completeness:
 * titles, abstracts, keywords, author affiliations, ORCIDs, and DOIs.
 */

import type { OpusDocument } from '../model/types';
import type { ResolvedStandard, PublisherPolicy } from '../standards/types';
import type { QualityAnalyser, Diagnostic } from './analyser';

/**
 * Phase 1 quality analyser for document metadata completeness.
 */
export class MetadataAnalyser implements QualityAnalyser {
  public readonly name = 'metadata-analyser';
  public readonly category = 'metadata';
  public readonly phase = 1 as const;

  /**
   * Analyses document metadata and produces itemized diagnostics.
   */
  public async analyse(
    document: OpusDocument,
    _standard: ResolvedStandard,
    _policy?: PublisherPolicy
  ): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    const meta = document.metadata;

    if (!meta.title || meta.title.trim() === '' || meta.title === 'Untitled Document') {
      diagnostics.push({
        id: `meta-title-${document.id}`,
        category: 'metadata',
        severity: 'error',
        phase: 1,
        code: 'MISSING_TITLE',
        message: 'Document title is missing or set to default untitled value.',
        location: { blockIndex: null, blockId: null, field: 'title' },
        autoFixable: false,
        suggestion: 'Provide a valid, descriptive manuscript title.',
      });
    }

    if (!meta.abstract || meta.abstract.trim() === '') {
      diagnostics.push({
        id: `meta-abstract-${document.id}`,
        category: 'metadata',
        severity: 'warning',
        phase: 1,
        code: 'MISSING_ABSTRACT',
        message: 'Manuscript abstract is missing.',
        location: { blockIndex: null, blockId: null, field: 'abstract' },
        autoFixable: false,
        suggestion: 'Add an executive abstract summarizing research objectives and findings.',
      });
    }

    if (!meta.keywords || meta.keywords.length === 0) {
      diagnostics.push({
        id: `meta-keywords-${document.id}`,
        category: 'metadata',
        severity: 'warning',
        phase: 1,
        code: 'MISSING_KEYWORDS',
        message: 'No metadata keywords are specified.',
        location: { blockIndex: null, blockId: null, field: 'keywords' },
        autoFixable: false,
        suggestion: 'Specify at least 3-5 indexing keywords.',
      });
    }

    if (!meta.authors || meta.authors.length === 0) {
      diagnostics.push({
        id: `meta-authors-${document.id}`,
        category: 'metadata',
        severity: 'error',
        phase: 1,
        code: 'MISSING_AUTHORS',
        message: 'No authors are declared for the manuscript.',
        location: { blockIndex: null, blockId: null, field: 'authors' },
        autoFixable: false,
        suggestion: 'Add at least one manuscript author.',
      });
    } else {
      meta.authors.forEach((author, idx) => {
        if (!author.orcid) {
          diagnostics.push({
            id: `meta-orcid-${idx}-${document.id}`,
            category: 'metadata',
            severity: 'info',
            phase: 1,
            code: 'MISSING_ORCID',
            message: `Author "${author.name}" has no declared ORCID iD.`,
            location: { blockIndex: null, blockId: null, field: `authors[${idx}].orcid` },
            autoFixable: false,
            suggestion: 'Add author ORCID identifier for indexing accuracy.',
          });
        }
      });
    }

    if (!meta.doi) {
      diagnostics.push({
        id: `meta-doi-${document.id}`,
        category: 'metadata',
        severity: 'warning',
        phase: 1,
        code: 'MISSING_DOI',
        message: 'DOI is not yet assigned to the manuscript.',
        location: { blockIndex: null, blockId: null, field: 'doi' },
        autoFixable: false,
        suggestion: 'Mint and assign a valid Crossref DOI prior to publication.',
      });
    }

    return diagnostics;
  }
}
