/**
 * Opus Publica — Centralized Administrative Authorization Helper Module
 *
 * Provides centralized helper functions for evaluating administrative capabilities.
 * Does not alter permissions or behavior; isolates role evaluation.
 */

export interface UserRoleHolder {
  role?: string | null;
}

export type RoleOrUser = string | UserRoleHolder | null | undefined;

/**
 * Extracts the string role from a role string or user object containing a role property.
 */
function extractRole(input: RoleOrUser): string | null {
  if (!input) return null;
  if (typeof input === 'string') return input;
  return input.role || null;
}

/**
 * Evaluates whether the given role or user is authorized to edit retrospective publication timelines.
 */
export function canEditPublicationTimeline(roleOrUser: RoleOrUser): boolean {
  return extractRole(roleOrUser) === 'admin';
}

/**
 * Evaluates whether the given role or user is authorized to edit scholarly publication metadata.
 */
export function canEditArticleMetadata(roleOrUser: RoleOrUser): boolean {
  return extractRole(roleOrUser) === 'admin';
}

/**
 * Evaluates whether the given role or user is authorized to manage platform branding settings.
 */
export function canManageBranding(roleOrUser: RoleOrUser): boolean {
  return extractRole(roleOrUser) === 'admin';
}

/**
 * Evaluates whether the given role or user is authorized to manage composition packages.
 */
export function canManagePublicationPackage(roleOrUser: RoleOrUser): boolean {
  return extractRole(roleOrUser) === 'admin';
}
