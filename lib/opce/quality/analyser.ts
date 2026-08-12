/**
 * Opus Publica Composition Engine (OPCE) — Quality Architecture Contracts
 *
 * Interfaces and data structures for layered publication quality analysis,
 * diagnostics, score calculation, and policy compliance reporting.
 */

import type { OpusDocument } from '../model/types';
import type { ResolvedStandard, PublisherPolicy } from '../standards/types';

/**
 * Responsibility: Pinpoints exact AST element or metadata field associated with a diagnostic issue.
 * Lifecycle: Created by QualityAnalyser (M3), displayed in QualityReportCard UI (M6).
 * Ownership: OPCE Quality Domain.
 * Intended Consumers: Quality Analysers (M3), QualityReportCard Component (M6).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface DiagnosticLocation {
  blockIndex: number | null;
  blockId: string | null;
  field: string | null;
}

/**
 * Responsibility: Individual quality or compliance diagnostic finding item.
 * Lifecycle: Produced by QualityAnalyser (M3), aggregated into QualityReport (M3), rendered in Dashboard UI (M6).
 * Ownership: OPCE Quality Domain.
 * Intended Consumers: Quality Coordinator (M3), QualityReportCard (M6).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface Diagnostic {
  id: string;
  category: 'layout' | 'metadata' | 'references' | 'accessibility' | 'compliance';
  severity: 'error' | 'warning' | 'info';
  phase: 1 | 2 | 3;
  code: string;
  message: string;
  location: DiagnosticLocation | null;
  autoFixable: boolean;
  suggestion: string | null;
}

/**
 * Responsibility: Consolidated diagnostic counters and deterministic quality score (0–100).
 * Lifecycle: Computed by QualityCoordinator (M3), displayed in Dashboard UI (M6).
 * Ownership: OPCE Quality Domain.
 * Intended Consumers: Quality Coordinator (M3), QualityReportCard (M6), Pipeline Orchestrator (M5).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface QualitySummary {
  errorCount: number;
  warningCount: number;
  infoCount: number;
  autoFixableCount: number;
  score: number;
}

/**
 * Responsibility: Full consolidated quality diagnostic report for an OpusDocument run.
 * Lifecycle: Produced by QualityCoordinator (M3), frozen inside PublicationPackage (M5), rendered in Dashboard UI (M6).
 * Ownership: OPCE Quality Domain.
 * Intended Consumers: Pipeline Orchestrator (M5), Dashboard UI (M6), Archival Package (M5).
 * Implementation Milestone: M0 (Contract Freeze).
 */
export interface QualityReport {
  documentId: string;
  timestamp: string;
  analysers: string[];
  diagnostics: Diagnostic[];
  summary: QualitySummary;
  passed: boolean;
}

/**
 * Responsibility: Interface contract for layered quality diagnostic engines across Phases 1, 2, and 3.
 * Lifecycle: Executed sequentially by QualityCoordinator during quality analysis pipeline (M3/M5).
 * Ownership: OPCE Quality Domain.
 * Intended Consumers: Quality Coordinator (M3).
 * Implementation Milestone: M0 (Contract Freeze), implemented in M3 (`MetadataAnalyser`, `ReferenceAnalyser`, etc.).
 */
export interface QualityAnalyser {
  readonly name: string;
  readonly category: Diagnostic['category'];
  readonly phase: 1 | 2 | 3;
  analyse(
    document: OpusDocument,
    standard: ResolvedStandard,
    policy?: PublisherPolicy
  ): Promise<Diagnostic[]>;
}
