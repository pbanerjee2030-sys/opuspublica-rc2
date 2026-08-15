export interface RequirementConfig {
  formRequired: string[];
  manuscriptRequired: string[];
}

export type RequirementRegistry = Record<string, Record<string, RequirementConfig>>;

// The canonical definitions for Opus Publica journal compliance requirements.
export const SUBMISSION_REQUIREMENTS: RequirementRegistry = {
  'Global Perspectives': {
    'Report / Working Paper': {
      formRequired: [
        'authors',
        'author_email',
        'corresponding_author',
        'corresponding_author_email',
        'funding_declaration',
        'conflict_of_interest_declaration',
        'license',
        'article_type'
      ],
      manuscriptRequired: [
        'manuscript_file',
        'abstract'
      ]
    },
    'Journal Article': {
      formRequired: [
        'authors',
        'author_email',
        'orcid',
        'affiliations',
        'corresponding_author',
        'corresponding_author_email',
        'funding_declaration',
        'conflict_of_interest_declaration',
        'license',
        'article_type'
      ],
      manuscriptRequired: [
        'manuscript_file',
        'abstract',
        'references'
      ]
    }
  }
};

/**
 * Helper to get the requirements for a specific journal and article type.
 * Falls back to an empty requirement set if not found.
 */
export function getRequirements(journal: string, articleType: string): RequirementConfig {
  const journalReqs = SUBMISSION_REQUIREMENTS[journal];
  if (journalReqs) {
    const typeReqs = journalReqs[articleType];
    if (typeReqs) {
      return typeReqs;
    }
  }
  
  // Default minimal fallback
  return {
    formRequired: ['authors', 'article_type'],
    manuscriptRequired: ['manuscript_file']
  };
}
