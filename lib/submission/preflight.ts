import { getRequirements } from './requirements';

export interface AuthorData {
  name?: string;
  email?: string;
  orcid?: string;
  affiliations?: string[];
  isCorresponding?: boolean;
}

export interface SubmissionForm {
  authors?: AuthorData[];
  funding_declaration?: string;
  conflict_of_interest_declaration?: string;
  license?: string;
  article_type?: string;
  [key: string]: any;
}

export interface ManuscriptData {
  title?: string;
  abstract?: string;
  keywords?: string[];
  references?: any[];
  hasContent?: boolean; // Represents manuscript_file existence conceptually
  [key: string]: any;
}

export interface PreflightResult {
  complete: boolean;
  completenessPercent: number;
  errors: string[];
  warnings: string[];
  derivedMetadata: Record<string, any>;
  missingRequiredFields: string[];
}

export function validateSubmissionCompleteness(params: {
  journal: string;
  articleType: string;
  submissionForm: SubmissionForm;
  manuscript: ManuscriptData;
}): PreflightResult {
  const { journal, articleType, submissionForm, manuscript } = params;
  
  const reqs = getRequirements(journal, articleType);
  const missingRequiredFields: string[] = [];
  const errors: string[] = [];
  
  const totalReqs = reqs.formRequired.length + reqs.manuscriptRequired.length;
  let metReqs = 0;

  // 1. Check FORM_REQUIRED
  for (const field of reqs.formRequired) {
    let hasField = false;

    if (field === 'authors') {
      hasField = !!(submissionForm.authors && submissionForm.authors.length > 0);
    } else if (field === 'author_email') {
      hasField = !!(submissionForm.authors && submissionForm.authors.every(a => !!a.email));
    } else if (field === 'orcid') {
      const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/;
      hasField = !!(submissionForm.authors && submissionForm.authors.every(a => a.orcid && orcidRegex.test(a.orcid)));
    } else if (field === 'affiliations') {
      hasField = !!(submissionForm.authors && submissionForm.authors.every(a => a.affiliations && a.affiliations.length > 0));
    } else if (field === 'corresponding_author') {
      hasField = !!(submissionForm.authors && submissionForm.authors.some(a => a.isCorresponding));
    } else if (field === 'corresponding_author_email') {
      const corrAuthor = submissionForm.authors?.find(a => a.isCorresponding);
      hasField = !!(corrAuthor && corrAuthor.email);
    } else {
      // General top-level field check on the form
      hasField = !!submissionForm[field];
    }

    if (!hasField) {
      missingRequiredFields.push(field);
    } else {
      metReqs++;
    }
  }

  // 2. Check MANUSCRIPT_REQUIRED
  // Remember: Do not assume that absence from manuscript means absence from submission data for admin fields.
  // But for MANUSCRIPT_REQUIRED fields, they specifically MUST be in the manuscript.
  for (const field of reqs.manuscriptRequired) {
    let hasField = false;

    if (field === 'manuscript_file') {
      hasField = !!manuscript.hasContent;
    } else if (field === 'abstract') {
      hasField = !!manuscript.abstract;
    } else if (field === 'references') {
      hasField = !!(manuscript.references && manuscript.references.length > 0);
    } else {
      hasField = !!manuscript[field];
    }

    if (!hasField) {
      missingRequiredFields.push(`manuscript_${field}`);
    } else {
      metReqs++;
    }
  }

  // 3. Derived metadata
  const derivedMetadata = {
    title: manuscript.title || null,
    author_names: manuscript.authors || null,
    abstract: manuscript.abstract || null,
    keywords: manuscript.keywords || null,
    references: manuscript.references || null,
  };

  const complete = missingRequiredFields.length === 0;
  const completenessPercent = totalReqs > 0 ? Math.round((metReqs / totalReqs) * 100) : 100;

  if (!complete) {
    errors.push('Submission is incomplete. Missing required fields.');
  }

  return {
    complete,
    completenessPercent,
    errors,
    warnings: [],
    derivedMetadata,
    missingRequiredFields
  };
}
