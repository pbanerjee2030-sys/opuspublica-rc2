
/**
 * Opus Publica Composition Engine (OPCE) — Quality Coordinator & Engine
 *
 * Coordinates execution of multi-phase quality analysers, isolates fault exceptions,
 * deduplicates findings, aggregates summary metrics, and computes deterministic quality scores.
 */

import type { OpusDocument } from '../model/types';
import type { ResolvedStandard, PublisherPolicy } from '../standards/types';
import type { QualityAnalyser, QualityReport, Diagnostic, QualitySummary } from './analyser';
import { MetadataAnalyser } from './metadata-analyser';
import { ReferenceAnalyser } from './reference-analyser';
import { AccessibilityAnalyser } from './accessibility-analyser';
import { ComplianceAnalyser } from './compliance-analyser';
import { LayoutAnalyser } from './layout-analyser';

/**
 * Orchestrator engine coordinating quality analysers across Phases 1, 2, and 3.
 */
export class QualityCoordinator {
  private static registeredAnalysers: QualityAnalyser[] = [
    new MetadataAnalyser(),
    new ReferenceAnalyser(),
    new AccessibilityAnalyser(),
    new ComplianceAnalyser(),
    new LayoutAnalyser(),
  ];

  /**
   * Registers a custom quality analyser instance.
   */
  public static registerAnalyser(analyser: QualityAnalyser): void {
    if (!analyser || !analyser.name) {
      throw new Error('Invalid analyser registration: name is required');
    }
    this.registeredAnalysers.push(analyser);
  }

  /**
   * Resets registered analysers to the default set.
   */
  public static resetToDefaults(): void {
    this.registeredAnalysers = [
      new MetadataAnalyser(),
      new ReferenceAnalyser(),
      new AccessibilityAnalyser(),
      new ComplianceAnalyser(),
      new LayoutAnalyser(),
    ];
  }

  /**
   * Clears all registered analysers (for testing isolation).
   */
  public static clear(): void {
    this.registeredAnalysers = [];
  }

  /**
   * Returns all currently registered quality analysers sorted by phase (1 -> 2 -> 3).
   */
  public static getRegisteredAnalysers(): QualityAnalyser[] {
    return [...this.registeredAnalysers].sort((a, b) => a.phase - b.phase);
  }

  /**
   * Runs the complete phase-ordered quality analysis pipeline against an OpusDocument.
   * @param document The target OpusDocument AST.
   * @param standard The resolved publication standard.
   * @param policy Optional publisher policy.
   * @returns Immutable QualityReport containing itemized diagnostics and summary score.
   */
  public static async runAnalysis(
    document: OpusDocument,
    standard: ResolvedStandard,
    policy?: PublisherPolicy
  ): Promise<QualityReport> {

/*
    document: OpusDocument,
    standard: ResolvedStandard,
    policy?: PublisherPolicy
  ): Promise<QualityReport> {
*/
    const analysers = this.getRegisteredAnalysers();
    const executedAnalyserNames: string[] = [];
    const rawDiagnostics: Diagnostic[] = [];

    for (const analyser of analysers) {
      executedAnalyserNames.push(analyser.name);
      try {

        const findings = await analyser.analyse(document, standard, policy);
        if (Array.isArray(findings)) {
          rawDiagnostics.push(...findings);
        }
      } catch (err: any) {
        // Analyser fault isolation: record system diagnostic error without crashing pipeline
        rawDiagnostics.push({
          id: `sys-analyser-fault-${analyser.name}-${document.id}`,
          category: analyser.category,
          severity: 'error',
          phase: analyser.phase,
          code: 'ANALYSER_FAULT_EXCEEDED',
          message: `Quality analyser "${analyser.name}" encountered a runtime exception: ${err?.message || err}`,
          location: null,
          autoFixable: false,
          suggestion: 'Report analyser internal error to system administrator.',
        });
      }
    }

    // Deduplicate diagnostics by ID
    const seenIds = new Set<string>();
    const deduplicatedDiagnostics: Diagnostic[] = [];

    for (const diag of rawDiagnostics) {
      if (!seenIds.has(diag.id)) {
        seenIds.add(diag.id);
        deduplicatedDiagnostics.push(diag);
      }
    }

    // Sort diagnostics by phase (1 -> 2 -> 3), then severity (error -> warning -> info)
    const severityOrder = { error: 1, warning: 2, info: 3 };
    deduplicatedDiagnostics.sort((a, b) => {
      if (a.phase !== b.phase) return a.phase - b.phase;
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const summary = this.computeSummary(deduplicatedDiagnostics);

    return Object.freeze({
      documentId: document.id,
      timestamp: new Date().toISOString(),
      analysers: executedAnalyserNames,
      diagnostics: deduplicatedDiagnostics,
      summary,
      passed: summary.errorCount === 0,
    });
  }

  /**
   * Calculates summary metric counts and deterministic quality score.
   * Score formula: max(0, 100 - (errors * 15 + warnings * 5))
   */
  private static computeSummary(diagnostics: Diagnostic[]): QualitySummary {
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let autoFixableCount = 0;

    diagnostics.forEach((d) => {
      if (d.severity === 'error') errorCount++;
      else if (d.severity === 'warning') warningCount++;
      else if (d.severity === 'info') infoCount++;

      if (d.autoFixable) autoFixableCount++;
    });

    const penalty = errorCount * 15 + warningCount * 5;
    const score = Math.max(0, 100 - penalty);

    return {
      errorCount,
      warningCount,
      infoCount,
      autoFixableCount,
      score,
    };
  }
}
