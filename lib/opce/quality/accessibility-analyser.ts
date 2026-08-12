/**
 * Opus Publica Composition Engine (OPCE) — Accessibility Quality Analyser
 *
 * Phase 1 quality analyser inspecting document accessibility features:
 * figure alt text presence, table header declarations, and heading hierarchy gaps.
 */

import type { OpusDocument } from '../model/types';
import type { ResolvedStandard, PublisherPolicy } from '../standards/types';
import type { QualityAnalyser, Diagnostic } from './analyser';
import { traverseDocument, OpusASTVisitor } from '../model/document-builder';

/**
 * Phase 1 quality analyser for accessibility and WCAG-aligned structure.
 */
export class AccessibilityAnalyser implements QualityAnalyser {
  public readonly name = 'accessibility-analyser';
  public readonly category = 'accessibility';
  public readonly phase = 1 as const;

  /**
   * Analyses document AST for accessibility and structural compliance.
   */
  public async analyse(
    document: OpusDocument,
    _standard: ResolvedStandard,
    _policy?: PublisherPolicy
  ): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    let lastHeadingLevel = 0;

    const visitor: OpusASTVisitor = {
      visitBlock: (block, index) => {
        // Check Figure Alt Text
        if (block.type === 'figure') {
          if (!block.alt || block.alt.trim() === '') {
            diagnostics.push({
              id: `a11y-fig-alt-${block.id}`,
              category: 'accessibility',
              severity: 'warning',
              phase: 1,
              code: 'MISSING_ALT_TEXT',
              message: `Figure "${block.label || block.id}" is missing alternative text description (alt text).`,
              location: { blockIndex: index, blockId: block.id, field: 'alt' },
              autoFixable: false,
              suggestion: 'Provide descriptive alt text for screen readers and accessibility tools.',
            });
          }
        }

        // Check Table Headers
        if (block.type === 'table') {
          if (!block.header || block.header.length === 0) {
            diagnostics.push({
              id: `a11y-tbl-header-${block.id}`,
              category: 'accessibility',
              severity: 'warning',
              phase: 1,
              code: 'MISSING_TABLE_HEADER',
              message: `Table "${block.label || block.id}" does not specify explicit table column headers.`,
              location: { blockIndex: index, blockId: block.id, field: 'header' },
              autoFixable: false,
              suggestion: 'Add a <thead> row to improve table structural accessibility.',
            });
          }
        }

        // Check Heading Hierarchy Gaps (e.g. H1 followed directly by H3)
        if (block.type === 'heading') {
          const currentLevel = block.level;
          if (lastHeadingLevel > 0 && currentLevel > lastHeadingLevel + 1) {
            diagnostics.push({
              id: `a11y-heading-gap-${block.id}`,
              category: 'accessibility',
              severity: 'info',
              phase: 1,
              code: 'HEADING_DEPTH_GAP',
              message: `Heading "${block.id}" jumps from H${lastHeadingLevel} to H${currentLevel}, skipping H${lastHeadingLevel + 1}.`,
              location: { blockIndex: index, blockId: block.id, field: 'level' },
              autoFixable: false,
              suggestion: 'Maintain sequential heading depth hierarchy for screen reader navigation.',
            });
          }
          lastHeadingLevel = currentLevel;
        }
      },
    };

    traverseDocument(document, visitor);
    return diagnostics;
  }
}
