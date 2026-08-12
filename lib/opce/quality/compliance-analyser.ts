/**
 * Opus Publica Composition Engine (OPCE) — Compliance Quality Analyser
 *
 * Phase 2 quality analyser inspecting document compliance against PublisherPolicy rules:
 * mandatory metadata, declarations, licensing, ORCID policies, and Crossref readiness.
 */

import type { OpusDocument } from '../model/types';
import type { ResolvedStandard, PublisherPolicy } from '../standards/types';
import type { QualityAnalyser, Diagnostic } from './analyser';

/**
 * Phase 2 quality analyser for publisher policy and regulatory compliance.
 */
export class ComplianceAnalyser implements QualityAnalyser {
  public readonly name = 'compliance-analyser';
  public readonly category = 'compliance';
  public readonly phase = 2 as const;

  /**
   * Evaluates document against PublisherPolicy parameters.
   */
  public async analyse(
    document: OpusDocument,
    _standard: ResolvedStandard,
    policy?: PublisherPolicy
  ): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    if (!policy) {
      return diagnostics;
    }

    const meta = document.metadata;

    // Check mandatory metadata fields
    policy.requiredMetadata.forEach((field) => {
      const val = (meta as Record<string, any>)[field];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0)) {
        diagnostics.push({
          id: `comp-req-meta-${field}-${document.id}`,
          category: 'compliance',
          severity: 'error',
          phase: 2,
          code: 'POLICY_VIOLATION_MISSING_METADATA',
          message: `Publisher policy requires field "${field}", which is missing or empty.`,
          location: { blockIndex: null, blockId: null, field },
          autoFixable: false,
          suggestion: `Provide required metadata field "${field}".`,
        });
      }
    });

    // Check mandatory declarations
    policy.requiredDeclarations.forEach((declarationKey) => {
      const declVal = (meta.declarations as Record<string, any>)?.[declarationKey];
      if (!declVal || typeof declVal !== 'string' || declVal.trim() === '') {
        diagnostics.push({
          id: `comp-req-decl-${declarationKey}-${document.id}`,
          category: 'compliance',
          severity: 'error',
          phase: 2,
          code: 'POLICY_VIOLATION_MISSING_DECLARATION',
          message: `Publisher policy requires declaration "${declarationKey}", which is missing.`,
          location: { blockIndex: null, blockId: null, field: `declarations.${declarationKey}` },
          autoFixable: false,
          suggestion: `Provide declaration statement for "${declarationKey}".`,
        });
      }
    });

    // Check mandatory copyright license match
    if (policy.mandatoryLicense) {
      if (meta.copyright.licenseType !== policy.mandatoryLicense) {
        diagnostics.push({
          id: `comp-license-mismatch-${document.id}`,
          category: 'compliance',
          severity: 'error',
          phase: 2,
          code: 'POLICY_VIOLATION_LICENSE_MISMATCH',
          message: `Manuscript license "${meta.copyright.licenseType}" does not match mandatory publisher license "${policy.mandatoryLicense}".`,
          location: { blockIndex: null, blockId: null, field: 'copyright.licenseType' },
          autoFixable: false,
          suggestion: `Set copyright license to "${policy.mandatoryLicense}".`,
        });
      }
    }

    // Check author ORCID compliance
    if (policy.requireOrcidForCorrespondingAuthor) {
      const corresponding = meta.authors.find((a) => a.correspondingAuthor);
      if (corresponding && !corresponding.orcid) {
        diagnostics.push({
          id: `comp-orcid-corresponding-${document.id}`,
          category: 'compliance',
          severity: 'error',
          phase: 2,
          code: 'POLICY_VIOLATION_CORRESPONDING_ORCID_REQUIRED',
          message: `Publisher policy requires ORCID iD for corresponding author "${corresponding.name}".`,
          location: { blockIndex: null, blockId: null, field: 'authors' },
          autoFixable: false,
          suggestion: 'Provide ORCID iD for the corresponding author.',
        });
      }
    }

    if (policy.requireOrcidForAllAuthors) {
      const missingOrcids = meta.authors.filter((a) => !a.orcid);
      if (missingOrcids.length > 0) {
        diagnostics.push({
          id: `comp-orcid-all-${document.id}`,
          category: 'compliance',
          severity: 'error',
          phase: 2,
          code: 'POLICY_VIOLATION_ALL_ORCIDS_REQUIRED',
          message: `Publisher policy requires ORCID iDs for all authors (${missingOrcids.length} missing).`,
          location: { blockIndex: null, blockId: null, field: 'authors' },
          autoFixable: false,
          suggestion: 'Provide ORCID iDs for all manuscript authors.',
        });
      }
    }

    // Check abstract length constraints
    if (policy.minimumAbstractLength && meta.abstract) {
      if (meta.abstract.length < policy.minimumAbstractLength) {
        diagnostics.push({
          id: `comp-abstract-len-${document.id}`,
          category: 'compliance',
          severity: 'warning',
          phase: 2,
          code: 'POLICY_VIOLATION_ABSTRACT_TOO_SHORT',
          message: `Abstract length (${meta.abstract.length} chars) is below mandatory minimum (${policy.minimumAbstractLength} chars).`,
          location: { blockIndex: null, blockId: null, field: 'abstract' },
          autoFixable: false,
          suggestion: 'Expand abstract to satisfy publisher minimum length rules.',
        });
      }
    }

    // Check keyword count maximum
    if (policy.maximumKeywordCount && meta.keywords) {
      if (meta.keywords.length > policy.maximumKeywordCount) {
        diagnostics.push({
          id: `comp-keyword-count-${document.id}`,
          category: 'compliance',
          severity: 'warning',
          phase: 2,
          code: 'POLICY_VIOLATION_TOO_MANY_KEYWORDS',
          message: `Keyword count (${meta.keywords.length}) exceeds maximum limit (${policy.maximumKeywordCount}).`,
          location: { blockIndex: null, blockId: null, field: 'keywords' },
          autoFixable: false,
          suggestion: `Reduce keywords to ${policy.maximumKeywordCount} or fewer.`,
        });
      }
    }

    return diagnostics;
  }
}
