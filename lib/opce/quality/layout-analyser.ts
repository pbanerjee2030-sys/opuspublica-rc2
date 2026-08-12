/**
 * Opus Publica Composition Engine (OPCE) — Layout Quality Analyser
 *
 * Phase 3 quality analyser framework inspecting document structural layout:
 * trailing isolated headings, empty block elements, and table column consistency.
 */

import type { OpusDocument } from '../model/types';
import type { ResolvedStandard, PublisherPolicy } from '../standards/types';
import type { QualityAnalyser, Diagnostic } from './analyser';

/**
 * Phase 3 quality analyser for structural layout verification.
 */
export class LayoutAnalyser implements QualityAnalyser {
  public readonly name = 'layout-analyser';
  public readonly category = 'layout';
  public readonly phase = 3 as const;

  /**
   * Evaluates document AST structure for layout and pagination constraints.
   */
  public async analyse(
    document: OpusDocument,
    _standard: ResolvedStandard,
    _policy?: PublisherPolicy
  ): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    const body = document.body;

    if (!body || body.length === 0) {
      diagnostics.push({
        id: `layout-empty-body-${document.id}`,
        category: 'layout',
        severity: 'error',
        phase: 3,
        code: 'EMPTY_DOCUMENT_BODY',
        message: 'Document body contains zero content blocks.',
        location: { blockIndex: null, blockId: null, field: 'body' },
        autoFixable: false,
        suggestion: 'Add manuscript body paragraphs or section headings.',
      });
      return diagnostics;
    }

    // Check for trailing isolated heading at end of document body
    const lastBlock = body[body.length - 1];
    if (lastBlock.type === 'heading') {
      diagnostics.push({
        id: `layout-trailing-heading-${lastBlock.id}`,
        category: 'layout',
        severity: 'warning',
        phase: 3,
        code: 'TRAILING_ISOLATED_HEADING',
        message: `Heading "${lastBlock.id}" is isolated at the end of document body with no subsequent content.`,
        location: { blockIndex: body.length - 1, blockId: lastBlock.id, field: 'type' },
        autoFixable: true,
        suggestion: 'Add content under this heading or remove the trailing section header.',
      });
    }

    // Check table cell column consistency
    body.forEach((block, idx) => {
      if (block.type === 'table') {
        const rowLengths = block.rows.map((r) => r.cells.length);
        const firstLen = rowLengths[0] || 0;
        const inconsistent = rowLengths.some((len) => len !== firstLen);

        if (inconsistent) {
          diagnostics.push({
            id: `layout-inconsistent-table-${block.id}`,
            category: 'layout',
            severity: 'warning',
            phase: 3,
            code: 'INCONSISTENT_TABLE_COLUMNS',
            message: `Table "${block.id}" has inconsistent cell counts across rows.`,
            location: { blockIndex: idx, blockId: block.id, field: 'rows' },
            autoFixable: false,
            suggestion: 'Use explicit colspan/rowspan attributes or pad table cells to align columns.',
          });
        }
      }
    });

    return diagnostics;
  }
}
