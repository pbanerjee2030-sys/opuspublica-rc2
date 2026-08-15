import { validateSubmissionCompleteness } from '../../lib/submission/preflight';

describe('Submission Preflight / Completeness Engine', () => {
  const completeReportForm = {
    authors: [
      {
        name: 'Victor Samuel',
        email: 'victor.samuel@aunetwork.org',
        isCorresponding: true
      }
    ],
    funding_declaration: 'Advocacy Unified Network',
    conflict_of_interest_declaration: 'None',
    license: 'CC-BY',
    article_type: 'Report / Working Paper'
  };

  const completeReportManuscript = {
    hasContent: true,
    title: 'From Diagnosis to Delivery',
    abstract: 'This is an abstract',
    keywords: ['SDG 9']
  };

  const completeJournalForm = {
    ...completeReportForm,
    article_type: 'Journal Article',
    authors: [
      {
        name: 'Victor Samuel',
        email: 'victor.samuel@aunetwork.org',
        orcid: '0009-0002-4823-962X',
        affiliations: ['AUN'],
        isCorresponding: true
      }
    ]
  };

  const completeJournalManuscript = {
    ...completeReportManuscript,
    references: ['Ref 1'],
    tables_figures: true
  };

  test('A. Complete submission (Report / Working Paper)', () => {
    const result = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Report / Working Paper',
      submissionForm: completeReportForm,
      manuscript: completeReportManuscript
    });
    expect(result.complete).toBe(true);
    expect(result.missingRequiredFields).toHaveLength(0);
    expect(result.completenessPercent).toBe(100);
  });

  test('B. Missing one field', () => {
    const result = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Report / Working Paper',
      submissionForm: { ...completeReportForm, license: '' },
      manuscript: completeReportManuscript
    });
    expect(result.complete).toBe(false);
    expect(result.missingRequiredFields).toContain('license');
    expect(result.missingRequiredFields).toHaveLength(1);
  });

  test('C. Missing multiple fields (Consolidated response)', () => {
    const result = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Report / Working Paper',
      submissionForm: {
        ...completeReportForm,
        license: '',
        funding_declaration: ''
      },
      manuscript: {
        ...completeReportManuscript,
        abstract: ''
      }
    });
    expect(result.complete).toBe(false);
    expect(result.missingRequiredFields).toContain('license');
    expect(result.missingRequiredFields).toContain('funding_declaration');
    expect(result.missingRequiredFields).toContain('manuscript_abstract');
    expect(result.missingRequiredFields.length).toBeGreaterThan(1);
  });

  test('D. Manuscript contains metadata but form omits required fields', () => {
    // Manuscript has COI text, but form omits it
    const result = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Report / Working Paper',
      submissionForm: {
        ...completeReportForm,
        conflict_of_interest_declaration: ''
      },
      manuscript: {
        ...completeReportManuscript,
        conflict_of_interest_declaration: 'None' // Form should take precedence, so it should still fail
      }
    });
    expect(result.complete).toBe(false);
    expect(result.missingRequiredFields).toContain('conflict_of_interest_declaration');
  });

  test('E. Form contains metadata absent from manuscript', () => {
    // Form has COI, manuscript doesn't. Should pass because form is canonical.
    const result = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Report / Working Paper',
      submissionForm: completeReportForm,
      manuscript: {
        ...completeReportManuscript,
        conflict_of_interest_declaration: ''
      }
    });
    expect(result.complete).toBe(true);
  });

  test('F. Report/Working Paper has different requirements from Journal Article', () => {
    // Report does not need references/affiliations, Journal does.
    const reportResult = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Report / Working Paper',
      submissionForm: completeReportForm, // Missing affiliations/orcid
      manuscript: completeReportManuscript // Missing references
    });
    expect(reportResult.complete).toBe(true);

    const journalResult = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Journal Article',
      submissionForm: completeReportForm, // Missing affiliations/orcid
      manuscript: completeReportManuscript // Missing references
    });
    expect(journalResult.complete).toBe(false);
    expect(journalResult.missingRequiredFields).toContain('orcid');
    expect(journalResult.missingRequiredFields).toContain('affiliations');
    expect(journalResult.missingRequiredFields).toContain('manuscript_references');
  });

  test('G. Invalid ORCID', () => {
    // Modify preflight.ts to actually validate ORCID format
    const result = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Journal Article',
      submissionForm: {
        ...completeJournalForm,
        authors: [
          { ...completeJournalForm.authors[0], orcid: 'invalid-orcid' }
        ]
      },
      manuscript: completeJournalManuscript
    });
    expect(result.complete).toBe(false);
    expect(result.missingRequiredFields).toContain('orcid');
  });

  test('H. Missing corresponding-author email', () => {
    const result = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Report / Working Paper',
      submissionForm: {
        ...completeReportForm,
        authors: [
          { name: 'Victor Samuel', isCorresponding: true } // missing email
        ]
      },
      manuscript: completeReportManuscript
    });
    expect(result.complete).toBe(false);
    expect(result.missingRequiredFields).toContain('corresponding_author_email');
    expect(result.missingRequiredFields).toContain('author_email');
  });

  test('I. Missing funding declaration', () => {
    const result = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Report / Working Paper',
      submissionForm: { ...completeReportForm, funding_declaration: '' },
      manuscript: completeReportManuscript
    });
    expect(result.complete).toBe(false);
    expect(result.missingRequiredFields).toContain('funding_declaration');
  });

  test('J. Missing COI', () => {
    const result = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Report / Working Paper',
      submissionForm: { ...completeReportForm, conflict_of_interest_declaration: '' },
      manuscript: completeReportManuscript
    });
    expect(result.complete).toBe(false);
    expect(result.missingRequiredFields).toContain('conflict_of_interest_declaration');
  });

  test('K. Missing license', () => {
    const result = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Report / Working Paper',
      submissionForm: { ...completeReportForm, license: '' },
      manuscript: completeReportManuscript
    });
    expect(result.complete).toBe(false);
    expect(result.missingRequiredFields).toContain('license');
  });

  test('L. Missing affiliation (Journal Article)', () => {
    const result = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Journal Article',
      submissionForm: {
        ...completeJournalForm,
        authors: [
          { name: 'Victor', orcid: '0000-0000-0000-0000', email: 'v@a.com', isCorresponding: true, affiliations: [] }
        ]
      },
      manuscript: completeJournalManuscript
    });
    expect(result.complete).toBe(false);
    expect(result.missingRequiredFields).toContain('affiliations');
  });

  test('M. Current Global Perspectives Article (Regression Case)', () => {
    // Current Global Perspectives working paper with its deficiencies as per previous governed review findings
    const result = validateSubmissionCompleteness({
      journal: 'Global Perspectives',
      articleType: 'Report / Working Paper',
      submissionForm: {
        // Form is missing emails in the DB prior to correction
        authors: [
          { name: 'Victor Samuel', orcid: '0009-0002-4823-962X', isCorresponding: true },
          { name: 'Francisca Oliviera', orcid: '0009-0002-1103-7725', isCorresponding: false }
        ],
        // Missing COI and Funding and License initially
        conflict_of_interest_declaration: '',
        funding_declaration: '',
        license: '',
        article_type: 'Report / Working Paper'
      },
      manuscript: {
        hasContent: true,
        abstract: '...'
      }
    });
    expect(result.complete).toBe(false);
    // Should catch all these at once
    expect(result.missingRequiredFields).toContain('author_email');
    expect(result.missingRequiredFields).toContain('corresponding_author_email');
    expect(result.missingRequiredFields).toContain('conflict_of_interest_declaration');
    expect(result.missingRequiredFields).toContain('funding_declaration');
    expect(result.missingRequiredFields).toContain('license');
  });
});
