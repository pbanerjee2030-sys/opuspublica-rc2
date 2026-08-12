/**
 * Opus Publica Composition Engine (OPCE) — Reference Quality Analyser
 *
 * Phase 1 quality analyser inspecting document references, citation cross-references,
 * DOI format validity, URL protocols, and duplicate references.
 */

import type { OpusDocument } from '../model/types';
import type { ResolvedStandard, PublisherPolicy } from '../standards/types';
import type { QualityAnalyser, Diagnostic } from './analyser';
import { traverseDocument, OpusASTVisitor } from '../model/document-builder';

/**
 * Phase 1 quality analyser for reference integrity and citation callouts.
 */
export class ReferenceAnalyser implements QualityAnalyser {
  public readonly name = 'reference-analyser';
  public readonly category = 'references';
  public readonly phase = 1 as const;

  /**
   * Analyses reference items and citation callouts in the document.
   */
  public async analyse(
    document: OpusDocument,
    _standard: ResolvedStandard,
    _policy?: PublisherPolicy
  ): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    const citedRefIds = new Set<string>();

    // Collect all cited reference IDs from citation callouts
    const visitor: OpusASTVisitor = {
      visitInline: (inline) => {
        if (inline.type === 'citationref' && Array.isArray(inline.ids)) {
          inline.ids.forEach((id) => citedRefIds.add(id));
        }
      },
    };
    traverseDocument(document, visitor);

    const doiMap = new Set<string>();

    document.references.forEach((ref, idx) => {
      // Check for uncited references
      if (!citedRefIds.has(ref.id)) {
        diagnostics.push({
          id: `ref-uncited-${ref.id}`,
          category: 'references',
          severity: 'info',
          phase: 1,
          code: 'UNCITED_REFERENCE',
          message: `Reference "${ref.title}" (ID: ${ref.id}) is not cited anywhere in the body text.`,
          location: { blockIndex: null, blockId: null, field: `references[${idx}]` },
          autoFixable: false,
          suggestion: 'Cite this reference in the body text or remove it from the bibliography.',
        });
      }

      // Check DOI format validity
      if (ref.doi) {
        const cleanDoi = ref.doi.trim();
        if (!cleanDoi.startsWith('10.')) {
          diagnostics.push({
            id: `ref-doi-format-${ref.id}`,
            category: 'references',
            severity: 'warning',
            phase: 1,
            code: 'MALFORMED_DOI',
            message: `Reference "${ref.title}" has a malformed DOI prefix: "${ref.doi}".`,
            location: { blockIndex: null, blockId: null, field: `references[${idx}].doi` },
            autoFixable: false,
            suggestion: 'Ensure DOI begins with "10.xxxx/".',
          });
        }

        // Check for duplicate DOIs
        if (doiMap.has(cleanDoi)) {
          diagnostics.push({
            id: `ref-duplicate-doi-${ref.id}`,
            category: 'references',
            severity: 'warning',
            phase: 1,
            code: 'DUPLICATE_REFERENCE_DOI',
            message: `Duplicate DOI "${ref.doi}" detected in references.`,
            location: { blockIndex: null, blockId: null, field: `references[${idx}].doi` },
            autoFixable: false,
            suggestion: 'Remove duplicate reference entries.',
          });
        } else {
          doiMap.add(cleanDoi);
        }
      }

      // Check URL validity protocol
      if (ref.url && !ref.url.startsWith('http://') && !ref.url.startsWith('https://')) {
        diagnostics.push({
          id: `ref-url-protocol-${ref.id}`,
          category: 'references',
          severity: 'warning',
          phase: 1,
          code: 'MALFORMED_URL',
          message: `Reference "${ref.title}" URL is missing http:// or https:// protocol: "${ref.url}".`,
          location: { blockIndex: null, blockId: null, field: `references[${idx}].url` },
          autoFixable: false,
          suggestion: 'Prepend valid URL scheme (https://).',
        });
      }
    });

    return diagnostics;
  }
}
