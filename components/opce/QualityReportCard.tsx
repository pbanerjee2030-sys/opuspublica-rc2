'use client';

/**
 * Opus Publica Composition Engine (OPCE) — Quality Report Card Component
 *
 * Renders quality report score, diagnostic counters, and itemized issues
 * categorized by phase and severity.
 */

import React, { useState } from 'react';
import type { QualityReport, Diagnostic } from '@/lib/opce';
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

export interface QualityReportCardProps {
  report: QualityReport | null;
  isLoading?: boolean;
}

export const QualityReportCard: React.FC<QualityReportCardProps> = ({ report, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg border border-[#E0D7C2] animate-pulse">
        <div className="h-6 w-48 bg-[#F4EFE2] rounded mb-4"></div>
        <div className="h-16 bg-[#FCFAF4] rounded mb-4"></div>
        <div className="h-24 bg-[#F4EFE2] rounded"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 bg-[#FCFAF4] rounded-lg border border-[#E0D7C2] text-center text-[#5A5245]">
        <p>No quality analysis report available. Run composition to generate quality diagnostics.</p>
      </div>
    );
  }

  const { summary, diagnostics, passed } = report;
  const scoreColor = summary.score >= 80 ? 'text-green-700 bg-green-50 border-green-200' : summary.score >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200';

  // Group diagnostics into specific categories requested in Phase 8
  const categories: Record<string, Diagnostic[]> = {
    'Structural': diagnostics.filter(d => d.phase === 1 || d.code.includes('STRUCT')),
    'Metadata': diagnostics.filter(d => d.category === 'metadata' || d.code.includes('META')),
    'Accessibility': diagnostics.filter(d => d.category === 'accessibility' || d.code.includes('A11Y') || d.code.includes('ALT')),
    'References': diagnostics.filter(d => d.category === 'references' || d.code.includes('REF')),
    'Layout': diagnostics.filter(d => d.category === 'layout' || d.code.includes('LAYOUT')),
    'Compliance': diagnostics.filter(d => d.category === 'compliance' || d.code.includes('COMPLY')),
  };

  // Group any leftovers into the appropriate category or Structural
  diagnostics.forEach(d => {
    const isCategorized = Object.values(categories).some(cat => cat.includes(d));
    if (!isCategorized) {
      categories['Structural'].push(d);
    }
  });

  return (
    <div className="bg-white rounded-lg border border-[#E0D7C2] overflow-hidden">
      {/* Header Summary */}
      <div className="p-6 border-b border-[#E0D7C2] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-[#0F2C4A]">Quality Diagnostics</h3>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {passed ? 'PASSED' : 'ISSUES DETECTED'}
            </span>
          </div>
          <p className="text-xs text-[#5A5245] mt-1">
            Evaluated across {report.analysers.length} analysers at {new Date(report.timestamp).toLocaleTimeString()}
          </p>
        </div>

        {/* Score Badge */}
        <div className={`flex flex-col items-center justify-center p-3 rounded-lg border min-w-[100px] shadow-sm ${scoreColor}`}>
          <span className="text-3xl font-bold">{summary.score}</span>
          <span className="text-[10px] uppercase font-semibold tracking-wider">Overall Score</span>
        </div>
      </div>

      {/* Counter Metrics */}
      <div className="grid grid-cols-4 divide-x divide-[#E0D7C2] bg-[#FCFAF4] border-b border-[#E0D7C2] text-center py-3 text-sm">
        <div className="flex flex-col items-center justify-center">
          <span className="block font-bold text-red-700 flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> {summary.errorCount}</span>
          <span className="text-[10px] uppercase font-semibold text-[#5A5245] tracking-wide mt-0.5">Errors</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="block font-bold text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/> {summary.warningCount}</span>
          <span className="text-[10px] uppercase font-semibold text-[#5A5245] tracking-wide mt-0.5">Warnings</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="block font-bold text-blue-700 flex items-center gap-1"><Info className="w-3.5 h-3.5"/> {summary.infoCount}</span>
          <span className="text-[10px] uppercase font-semibold text-[#5A5245] tracking-wide mt-0.5">Info</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="block font-bold text-[#0F2C4A] flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> {summary.autoFixableCount}</span>
          <span className="text-[10px] uppercase font-semibold text-[#5A5245] tracking-wide mt-0.5">Auto-Fixable</span>
        </div>
      </div>

      {/* Diagnostic Expandable Categories */}
      <div className="p-4 max-h-[500px] overflow-y-auto space-y-3 bg-[#FCFAF4]">
        {Object.entries(categories).map(([catName, diags]) => (
          <ExpandableCategory key={catName} title={catName} diagnostics={diags} />
        ))}
      </div>
    </div>
  );
};

const ExpandableCategory: React.FC<{ title: string; diagnostics: Diagnostic[] }> = ({ title, diagnostics }) => {
  const [expanded, setExpanded] = useState(false);
  const hasErrors = diagnostics.some(d => d.severity === 'error');
  const hasWarnings = diagnostics.some(d => d.severity === 'warning');

  const statusColor = hasErrors ? 'text-red-700' : hasWarnings ? 'text-amber-600' : 'text-green-700';
  const StatusIcon = hasErrors ? XCircle : hasWarnings ? AlertTriangle : CheckCircle2;

  return (
    <div className="border border-[#E0D7C2] rounded-lg bg-white overflow-hidden shadow-sm transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-white hover:bg-[#F4EFE2] transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-[#5A5245]" /> : <ChevronRight className="w-4 h-4 text-[#5A5245]" />}
          <span className="font-semibold text-[#0F2C4A] text-sm">{title}</span>
          <span className="text-[10px] bg-[#E0D7C2] text-[#0F2C4A] font-bold px-2 py-0.5 rounded-full">{diagnostics.length}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${statusColor}`}>
          <StatusIcon className="w-4 h-4" />
          {hasErrors ? 'Action Required' : hasWarnings ? 'Review Suggested' : 'Passed'}
        </div>
      </button>

      {expanded && (
        <div className="p-4 border-t border-[#E0D7C2] bg-[#FCFAF4] space-y-3">
          {diagnostics.length === 0 ? (
            <p className="text-xs text-[#5A5245] italic">No issues detected in this category.</p>
          ) : (
            diagnostics.map((diag) => <DiagnosticRow key={diag.id} diagnostic={diag} />)
          )}
        </div>
      )}
    </div>
  );
};

const DiagnosticRow: React.FC<{ diagnostic: Diagnostic }> = ({ diagnostic }) => {
  const badgeStyle =
    diagnostic.severity === 'error'
      ? 'bg-red-100 text-red-800 border-red-300'
      : diagnostic.severity === 'warning'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-blue-100 text-blue-800 border-blue-300';

  return (
    <div className="p-3 rounded-md border border-[#E0D7C2] bg-white text-xs space-y-1.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wider ${badgeStyle}`}>
            {diagnostic.severity}
          </span>
          <span className="font-mono text-[#5A5245] font-semibold">{diagnostic.code}</span>
        </div>
        {diagnostic.location?.field && (
          <span className="font-mono text-[10px] text-[#5A5245] bg-[#F4EFE2] px-1.5 py-0.5 rounded">field: {diagnostic.location.field}</span>
        )}
      </div>

      <p className="text-[#23201A] font-medium leading-relaxed">{diagnostic.message}</p>

      {diagnostic.suggestion && (
        <p className="text-[#5A5245] italic mt-1 bg-[#FCFAF4] p-2 rounded border border-[#E0D7C2]">
          <span className="font-semibold text-[#0F2C4A]">Recommendation:</span> {diagnostic.suggestion}
        </p>
      )}
    </div>
  );
};
