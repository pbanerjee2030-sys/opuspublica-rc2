import { submitArticle } from '../../app/actions/submitArticle';

// Mock rbac
vi.mock('@/lib/rbac', () => ({
  withActionAuth: (_: any, fn: any) => fn
}));

// Mock mammoth
vi.mock('mammoth', () => ({
  convertToHtml: vi.fn().mockResolvedValue({ value: '<p>Mock HTML <span class="references">Ref 1</span></p>' })
}));

// Mock OPCE
vi.mock('@/lib/opce', () => ({
  normalizeManuscript: vi.fn().mockResolvedValue('<p>Normalized HTML <span class="references">Ref 1</span></p>')
}));

// Mock supabaseAdmin
const mockRemove = vi.fn().mockResolvedValue({ data: null, error: null });
const mockUpload = vi.fn().mockResolvedValue({ data: null, error: null });

const mockRpc = vi.fn().mockImplementation((fnName, args) => {
  if (fnName === 'submit_article_transition') {
    const validTypes = ['Journal Article', 'Book Review', 'Editorial', 'Correction', 'Brief Report', 'Review Article', 'Book', 'Report / Working Paper'];
    if (args.p_payload && args.p_payload.articleType && !validTypes.includes(args.p_payload.articleType)) {
      return Promise.resolve({ data: null, error: { message: 'new row for relation "articles" violates check constraint "check_article_type"' } });
    }
  }
  return Promise.resolve({ data: { success: true, article_id: 'a1', submission_id: 's1' }, error: null });
});
const mockSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }), single: vi.fn().mockResolvedValue({ data: { name: 'Global Perspectives' } }) }) });

const mockSupabaseAdmin = {
  storage: {
    from: vi.fn().mockReturnValue({ upload: mockUpload, remove: mockRemove })
  },
  from: vi.fn().mockReturnValue({ select: mockSelect }),
  rpc: mockRpc
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({ rpc: mockRpc })
}));

describe('Runtime Integration: submitArticle + Preflight Engine', () => {
  const ctx = {
    supabaseAdmin: mockSupabaseAdmin,
    user: { id: 'user-1' }
  };

  const basePayload = {
    idempotencyKey: 'test-123',
    title: 'From Diagnosis to Delivery',
    abstract: 'Abstract text',
    content: 'Content',
    journalId: 'journal-uuid',
    articleType: 'Report / Working Paper',
    pdfFile: {
      name: 'manuscript.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      base64: 'base64data'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Scenario A: Complete Form, Manuscript omits admin fields', async () => {
    const payload = {
      ...basePayload,
      coAuthors: [
        {
          name: 'Victor Samuel',
          email: 'victor.samuel@aunetwork.org',
          orcid: '0009-0002-4823-962X',
          isCorresponding: true,
          affiliations: ['AUN']
        }
      ],
      funderName: 'AUN',
      funderAwardNumber: '123',
      conflictOfInterestStatement: 'None',
      license: 'CC-BY',
      keywords: ['SDG 9']
    };

    // @ts-ignore
    const res = await submitArticle(ctx, payload as any);
    expect(res.success).toBe(true);
    expect(res.articleId).toBe('a1');
    expect(mockUpload).toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalled();
  });

  test('Scenario B: Incomplete Form, Manuscript has admin fields', async () => {
    // Missing email, funding, coi, license in the form payload
    const payload = {
      ...basePayload,
      coAuthors: [
        {
          name: 'Victor Samuel',
          orcid: '0009-0002-4823-962X',
          isCorresponding: true // email missing
        }
      ]
    };

    // @ts-ignore
    const res = await submitArticle(ctx, payload as any);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Validation Error: Submission is incomplete.');
    // Check consolidated missing fields
    expect(res.missingRequiredFields).toContain('author_email');
    expect(res.missingRequiredFields).toContain('corresponding_author_email');
    expect(res.missingRequiredFields).toContain('funding_declaration');
    expect(res.missingRequiredFields).toContain('conflict_of_interest_declaration');
    expect(res.missingRequiredFields).toContain('license');

    // Make sure we did NOT call the transition RPC
    expect(mockRpc).not.toHaveBeenCalled();
    // Make sure we cleaned up storage
    expect(mockRemove).toHaveBeenCalled();
  });

  test('Scenario C: Multiple fields missing (Consolidated correction list)', async () => {
    const payload = {
      ...basePayload,
      articleType: 'Journal Article',
      coAuthors: [
        {
          name: 'Victor Samuel',
          isCorresponding: true 
        }
      ]
    };

    // @ts-ignore
    const res = await submitArticle(ctx, payload as any);
    expect(res.success).toBe(false);
    expect(res.missingRequiredFields).toEqual(expect.arrayContaining([
      'author_email',
      'orcid',
      'affiliations',
      'corresponding_author_email',
      'funding_declaration',
      'conflict_of_interest_declaration',
      'license'
    ]));
  });

  test('Scenario D: articleType = "Report / Working Paper" survives unchanged', async () => {
    const payload = {
      ...basePayload,
      articleType: 'Report / Working Paper',
      coAuthors: [
        { name: 'Test', email: 'test@test.com', isCorresponding: true, orcid: '0000-0000-0000-0000', affiliations: ['Test'] }
      ],
      funderName: 'Test', funderAwardNumber: '1', conflictOfInterestStatement: 'None', license: 'CC-BY', keywords: ['SDG 9']
    };
    // @ts-ignore
    const res = await submitArticle(ctx, payload as any);
    expect(res.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('submit_article_transition', expect.objectContaining({
      p_payload: expect.objectContaining({ articleType: 'Report / Working Paper' })
    }));
  });

  test('Scenario E: articleType = "Journal Article" survives unchanged', async () => {
    const payload = {
      ...basePayload,
      articleType: 'Journal Article',
      coAuthors: [
        { name: 'Test', email: 'test@test.com', isCorresponding: true, orcid: '0000-0000-0000-0000', affiliations: ['Test'] }
      ],
      funderName: 'Test', funderAwardNumber: '1', conflictOfInterestStatement: 'None', license: 'CC-BY', keywords: ['SDG 9']
    };
    // @ts-ignore
    const res = await submitArticle(ctx, payload as any);
    expect(res.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('submit_article_transition', expect.objectContaining({
      p_payload: expect.objectContaining({ articleType: 'Journal Article' })
    }));
  });

  test('Scenario F: articleType = "Book" survives unchanged', async () => {
    const payload = {
      ...basePayload,
      articleType: 'Book',
      coAuthors: [
        { name: 'Test', email: 'test@test.com', isCorresponding: true, orcid: '0000-0000-0000-0000', affiliations: ['Test'] }
      ],
      funderName: 'Test', funderAwardNumber: '1', conflictOfInterestStatement: 'None', license: 'CC-BY', keywords: ['SDG 9']
    };
    // @ts-ignore
    const res = await submitArticle(ctx, payload as any);
    expect(res.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('submit_article_transition', expect.objectContaining({
      p_payload: expect.objectContaining({ articleType: 'Book' })
    }));
  });

  test('Scenario G: Missing articleType is NOT converted to another value and is blocked', async () => {
    const payload = {
      ...basePayload,
      coAuthors: [
        { name: 'Test', email: 'test@test.com', isCorresponding: true, orcid: '0000-0000-0000-0000', affiliations: ['Test'] }
      ],
      funderName: 'Test', funderAwardNumber: '1', conflictOfInterestStatement: 'None', license: 'CC-BY', keywords: ['SDG 9']
    };
    delete (payload as any).articleType;
    
    // @ts-ignore
    const res = await submitArticle(ctx, payload as any);
    expect(res.success).toBe(false);
    expect(res.missingRequiredFields).toContain('article_type');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('Scenario H: Invalid articleType is rejected', async () => {
    const payload = {
      ...basePayload,
      articleType: 'Invalid Type',
      coAuthors: [
        { name: 'Test', email: 'test@test.com', isCorresponding: true, orcid: '0000-0000-0000-0000', affiliations: ['Test'] }
      ],
      funderName: 'Test', funderAwardNumber: '1', conflictOfInterestStatement: 'None', license: 'CC-BY', keywords: ['SDG 9']
    };
    
    // @ts-ignore
    const res = await submitArticle(ctx, payload as any);
    expect(res.success).toBe(false);
    // Even if validation rules fall back, if it's missing from the form, it will fail.
    // Wait, getRequirements falls back to minimal requirements.
    // The fallback requires 'article_type' to be present.
    // However, if we pass 'Invalid Type', the Preflight model checks if it's there.
    // The preflight doesn't currently strictly reject unknown types, it just uses default requirements.
    // Let's verify what the preflight actually does.
  });
});
