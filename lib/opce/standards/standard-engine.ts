/**
 * Opus Publica Composition Engine (OPCE) — Standard Engine
 *
 * Resolves per-journal publication standards and publisher policies deterministically
 * by deep-merging journal overrides over house default JSON configurations.
 */

import { createHash } from 'crypto';
import defaultStyleData from './opus-publica-default.json';
import defaultPolicyData from './opus-publica-default-policy.json';
import type { ResolvedStandard, PublisherPolicy, JournalStyleOverrides } from './types';
import { validateResolvedStandard, validatePublisherPolicy } from '../model/document-builder';
import { computeCanonicalChecksum } from '../canonical';

// Internal memory cache for resolved standards by checksum
const standardCache = new Map<string, ResolvedStandard>();
const policyCache = new Map<string, PublisherPolicy>();

/**
 * Deep merges target object with source overrides.
 */
function deepMerge<T extends Record<string, any>>(target: T, source?: Record<string, any> | null): T {
  if (!source) return JSON.parse(JSON.stringify(target));

  const output = JSON.parse(JSON.stringify(target));

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = output[key];

    if (sourceVal !== undefined && sourceVal !== null) {
      if (
        typeof sourceVal === 'object' &&
        !Array.isArray(sourceVal) &&
        typeof targetVal === 'object' &&
        !Array.isArray(targetVal)
      ) {
        output[key] = deepMerge(targetVal, sourceVal);
      } else {
        output[key] = JSON.parse(JSON.stringify(sourceVal));
      }
    }
  }

  return output;
}

/**
 * Resolves a complete, immutable ResolvedStandard by merging optional journal overrides over default style.
 * @param journalStyleOverrides Optional per-journal partial style overrides.
 * @returns Fully resolved and validated ResolvedStandard object.
 * @throws Error if the resolved standard fails schema validation.
 */
export function resolveStandard(journalStyleOverrides?: Partial<JournalStyleOverrides> | null): ResolvedStandard {
  const merged = deepMerge(defaultStyleData as ResolvedStandard, journalStyleOverrides as Record<string, any>);

  const validation = validateResolvedStandard(merged);
  if (!validation.valid) {
    throw new Error(`ResolvedStandard validation failed: ${validation.errors.join('; ')}`);
  }

  const checksum = computeStyleChecksum(merged);
  if (standardCache.has(checksum)) {
    return standardCache.get(checksum)!;
  }

  const frozenStandard = Object.freeze(merged) as ResolvedStandard;
  standardCache.set(checksum, frozenStandard);
  return frozenStandard;
}

/**
 * Resolves a complete, immutable PublisherPolicy by merging optional journal policy overrides over default policy.
 * @param journalPolicyOverrides Optional per-journal partial policy overrides.
 * @returns Fully resolved and validated PublisherPolicy object.
 * @throws Error if the resolved policy fails schema validation.
 */
export function resolvePolicy(journalPolicyOverrides?: Partial<PublisherPolicy> | null): PublisherPolicy {
  const merged = deepMerge(defaultPolicyData as PublisherPolicy, journalPolicyOverrides as Record<string, any>);

  const validation = validatePublisherPolicy(merged);
  if (!validation.valid) {
    throw new Error(`PublisherPolicy validation failed: ${validation.errors.join('; ')}`);
  }

  const checksum = computePolicyChecksum(merged);
  if (policyCache.has(checksum)) {
    return policyCache.get(checksum)!;
  }

  const frozenPolicy = Object.freeze(merged) as PublisherPolicy;
  policyCache.set(checksum, frozenPolicy);
  return frozenPolicy;
}

/**
 * Computes a deterministic 16-character SHA-256 checksum string for a ResolvedStandard.
 * @param standard The resolved publication standard.
 * @returns 16-character hexadecimal hash string.
 */
export function computeStyleChecksum(standard: ResolvedStandard): string {
  const sortedJson = JSON.stringify(standard, Object.keys(standard).sort());
  return computeCanonicalChecksum(sortedJson).slice(0, 16);
}

/**
 * Computes a deterministic 16-character SHA-256 checksum string for a PublisherPolicy.
 * @param policy The resolved publisher policy.
 * @returns 16-character hexadecimal hash string.
 */
export function computePolicyChecksum(policy: PublisherPolicy): string {
  const sortedJson = JSON.stringify(policy, Object.keys(policy).sort());
  return computeCanonicalChecksum(sortedJson).slice(0, 16);
}

/**
 * Clears the standard resolution and policy memory caches (for testing isolation).
 */
export function clearStandardCache(): void {
  standardCache.clear();
  policyCache.clear();
}
