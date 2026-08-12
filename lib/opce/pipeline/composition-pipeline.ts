
/**
 * Opus Publica Composition Engine (OPCE) — Composition Pipeline
 *
 * Orchestrates the end-to-end composition lifecycle across subsystem stages:
 * Adapter Ingestion -> Standard Resolution -> Quality Analysis -> Rendering -> Package Construction.
 */

import { generateSessionId, generateCanonicalPackagePath } from '../canonical';

import type {
  OpusDocument,
  CompositionSession,
  CompositionResult,
  ComposeOptions,
  PublicationContext,
} from '../model/types';

import { AdapterRegistry } from '../adapters/adapter-registry';
import { resolveStandard, resolvePolicy, computeStyleChecksum } from '../standards/standard-engine';
import { QualityCoordinator } from '../quality/coordinator';
import { RenderingCoordinator } from '../renderers/rendering-coordinator';
import { PublicationPackageBuilder } from '../package/package-builder';
import type { RenderedOutput, PublicationPackage } from '../package/types';
import { generatePublishedPdf } from '@/lib/generate-pdf';
import { DeterministicBlockClassifier } from '../adapters/html-adapter';
/**
 * Pipeline options for executing composition on an article manuscript.
 */
export interface PipelineExecutionOptions extends ComposeOptions {
  publication: PublicationContext;
}

/**
 * End-to-end composition pipeline orchestrator engine.
 */
export class CompositionPipeline {
  /**
   * Executes the full composition pipeline for a manuscript.
   * @param options Pipeline execution parameters.
   * @returns Promise resolving to CompositionResult.
   */
  public static async execute(options: PipelineExecutionOptions): Promise<CompositionResult> {

    const startTime = Date.now();
    const sessionId = generateSessionId();

    const session: CompositionSession = {
      id: sessionId,
      articleId: options.publication.identifiers.articleId,
      initiatedBy: options.initiatedBy,
      initiatedAt: new Date().toISOString(),
      completedAt: null,
      renderMode: options.mode,
      status: 'running',
      inputs: {
        documentVersion: '1.0.0',
        styleChecksum: '',
        adapterUsed: 'html-adapter',
        opceVersion: '1.0.0',
      },
      outputs: null,
      approval: null,
      failureReason: null,
    };

    try {
      // Stage 1: Resolve Standard & Policy
      const standard = resolveStandard(options.journalStyleOverrides || null);
      const policy = resolvePolicy(null);
      const styleChecksum = computeStyleChecksum(standard);
      session.inputs.styleChecksum = styleChecksum;

      // Stage 2: Ingest Manuscript -> OpusDocument AST
      const document: OpusDocument = await AdapterRegistry.parseManuscript(
        options.publication.article.manuscriptHtml,
        'text/html',
        {
          articleId: options.publication.identifiers.articleId,
          journalId: options.publication.identifiers.journalId,
          publicationContext: options.publication,
        }
      );



      // Stage 2.5: Canonical AST Enforcement (Filter out metadata blocks)
      const forbiddenCategories = [
        'Title', 'Author List', 'Affiliations', 'ORCID', 'Corresponding Author',
        'Publisher Metadata', 'Journal Metadata', 'Working Paper Metadata',
        'Abstract', 'Keywords', 'Running Header', 'Running Footer',
        'Table of Contents', 'Microsoft Word TOC', 'Word Fields', 'EndNote Fields', 'Hidden Metadata'
      ];
      
      const beforeCount = document.body.length;
      let foundScholarly = false;
      const cleanBlocks = [];
      const removedCategories = new Set<string>();

      for (const block of document.body) {
        const category = DeterministicBlockClassifier.classify(block, options.publication);
        if (forbiddenCategories.includes(category)) {
          removedCategories.add(category);
          continue; // discard
        }
        
        if (['Body Content', 'References', 'Appendix', 'Supplementary Material'].includes(category)) {
          foundScholarly = true;
          cleanBlocks.push(block);
        } else if (category === 'Unknown') {
          if (foundScholarly) {
            cleanBlocks.push(block);
          } else {
             removedCategories.add('Unknown Pre-Scholarly');
          }
        }
      }
      
      document.body = cleanBlocks.length > 0 ? cleanBlocks : [ { type: 'paragraph', children: [{ type: 'text', text: 'No content available.' }] } as any ];
      const afterCount = document.body.length;
      


      // Stage 3: Quality Analysis -> QualityReport
      const qualityReport = await QualityCoordinator.runAnalysis(document, standard, policy);

      // Stage 4: Render Intermediate Format (HTML)
      const renderedHtml = await RenderingCoordinator.renderDocument(document, standard, 'html');
      const htmlString = typeof renderedHtml === 'string' ? renderedHtml : renderedHtml.toString('utf-8');

      const packageStoragePath = `${generateCanonicalPackagePath(options.publication.identifiers.articleId, sessionId)}/package.json`;
      const htmlStoragePath = `${generateCanonicalPackagePath(options.publication.identifiers.articleId, sessionId)}/preview.html`;

      // Stage 5: Register Rendered Outputs & Build PublicationPackage
      const htmlOutput: RenderedOutput = PublicationPackageBuilder.createRenderedOutput(
        'html',
        htmlStoragePath,
        htmlString
      );

      const renderDurationMs = Date.now() - startTime;

      const pkg = PublicationPackageBuilder.buildPackage(
        {
          articleId: options.publication.identifiers.articleId,
          createdBy: options.initiatedBy,
          renderMode: options.mode,
          document,
          resolvedStandard: standard,
          qualityReport,
          adapterUsed: 'html-adapter',
          styleChecksum,
          sessionId,
          renderDurationMs,
          doi: options.publication.article.doi,
        },
        [htmlOutput]
      );

      let pdfStoragePath: string | null = null;
      if (options.mode === 'publication') {
        try {
          const articleForPdf = {
            id: options.publication.identifiers.articleId,
            title: options.publication.article.title,
            abstract: options.publication.article.abstract,
            content: htmlString,
            keywords: options.publication.article.keywords,
            doi: options.publication.article.doi,
            published_at: options.publication.article.chronology.publishedAt || new Date().toISOString(),
            journal_name: options.publication.journal.name,
            journal_issn: options.publication.journal.issn,
            authors: options.publication.authors.map(a => ({
              name: a.name,
              affiliation: a.affiliations.map(aff => aff.name).join(', ') || null
            }))
          };
          pdfStoragePath = await generatePublishedPdf(articleForPdf);
        } catch (pdfErr: any) {
          console.error('[OPCE] Failed to generate PDF in pipeline:', pdfErr);
        }
      }

      // Finalize Session Status
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      session.outputs = {
        packageStoragePath,
        pdfStoragePath,
        qualityScore: qualityReport.summary.score,
        errorCount: qualityReport.summary.errorCount,
        warningCount: qualityReport.summary.warningCount,
        renderDurationMs,
      };

      return {
        success: true,
        sessionId,
        document,
        qualityReport,
        renderedOutputs: pkg.renderedOutputs,
        htmlPreview: htmlString,
        packageStoragePath,
        pdfStoragePath,
        renderDurationMs,
        styleChecksum: styleChecksum,
        error: null,
      };
    } catch (error: any) {
      session.status = 'failed';
      session.failureReason = error?.message || String(error);
      session.completedAt = new Date().toISOString();

      return {
        success: false,
        sessionId,
        document: null as any,
        qualityReport: null as any,
        renderedOutputs: [],
        packageStoragePath: '',
        pdfStoragePath: null,
        renderDurationMs: Date.now() - startTime,
        styleChecksum: session.inputs.styleChecksum || '',
        error: session.failureReason,
      };
    }
  }
}

/**
 * Helper generating consistent journal ID from article ID for test context.
 */
function documentJournalId(articleId: string): string {
  return `j-${articleId}`;
}
