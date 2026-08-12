import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

let localEnv = {};
try {
  const envOutput = execSync('npx supabase status -o env', { encoding: 'utf8' });
  localEnv = dotenv.parse(envOutput);
} catch (e) {
  console.log('Warning: could not fetch local supabase env via CLI:', e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || localEnv.API_URL || 'http://localhost:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || localEnv.ANON_KEY;

if (!serviceRoleKey) {
  console.error("Service role key is required for test setup");
  process.exit(1);
}
if (!anonKey) {
  console.error("Anon key is required for test client");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function setupTestUser(email, role) {
  const password = `TestPass_${crypto.randomUUID()}`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role }
  });
  if (error) {
    throw new Error(`Failed to create user ${email}: ${error.message}`);
  }

  const client = createClient(supabaseUrl, anonKey);
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password
  });
  if (signInError) {
    throw new Error(`Failed to sign in ${email}: ${signInError.message}`);
  }
  return { user: data.user, client };
}

async function cleanupUser(userId) {
  if (userId) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  console.log('--- Running WP-01-02 Runtime Verification ---');

  let editorUser = null;
  let authorUser = null;

  try {
    const editorSetup = await setupTestUser(`wp0102.runtime.editor.${Date.now()}@example.local`, 'editor');
    editorUser = editorSetup.user;
    const editorClient = editorSetup.client;

    const authorSetup = await setupTestUser(`wp0102.runtime.author.${Date.now()}@example.local`, 'author');
    authorUser = authorSetup.user;
    const authorClient = authorSetup.client;

    // IMPORTANT TEST DATA CORRECTION: Get or create a valid journal
    let journalId = '00000000-0000-0000-0000-000000000000';
    const { data: existingJournal } = await supabaseAdmin.from('journals').select('id').limit(1).maybeSingle();
    if (existingJournal) {
      journalId = existingJournal.id;
    } else {
      journalId = crypto.randomUUID();
      try {
        execSync(`docker exec supabase_db_opuspublica psql -U postgres -d postgres -c "INSERT INTO public.journals (id, name, slug) VALUES ('${journalId}', 'Test Journal', 'test-journal-${Date.now()}')"`, { stdio: 'ignore' });
      } catch (err) {
        throw new Error(`Failed to create test journal via psql: ${err.message}`);
      }
    }

    const submissionId = crypto.randomUUID();
    const articleId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const intentHash = crypto.randomUUID();

    const payload = {
      title: 'Test Submission',
      abstract: 'Test Abstract',
      content: 'Test Content',
      journalId: journalId,
      storagePath: 'test/path.pdf'
    };

    // Test 1: Negative Authorization Test (Anonymous / unauthenticated)
    const unauthClient = createClient(supabaseUrl, anonKey); // No user signed in
    const { error: unauthError } = await unauthClient.rpc('submit_article_transition', {
      p_submission_id: crypto.randomUUID(),
      p_article_id: crypto.randomUUID(),
      p_idempotency_key: crypto.randomUUID(),
      p_intent_hash: crypto.randomUUID(),
      p_payload: payload
    });
    
    if (unauthError) {
      assert(true, `Anonymous submission DENIED (${unauthError.message})`);
    } else {
      assert(false, `Anonymous submission ALLOWED (Security Defect!)`);
    }

    // Test 2: Submission creation via RPC using Author
    const authorSubmissionId = crypto.randomUUID();
    const authorArticleId = crypto.randomUUID();
    const { data: authorResult, error: authorSubmitError } = await authorClient.rpc('submit_article_transition', {
      p_submission_id: authorSubmissionId,
      p_article_id: authorArticleId,
      p_idempotency_key: crypto.randomUUID(),
      p_intent_hash: crypto.randomUUID(),
      p_payload: payload
    });

    if (authorSubmitError) {
      assert(false, `Author submission FAILED: ${authorSubmitError.message}`);
    } else {
      assert(authorResult?.success === true, 'Author submission PASS');
    }

    // Test 3: Submission creation via RPC using Editor
    const { data: result1, error: error1 } = await editorClient.rpc('submit_article_transition', {
      p_submission_id: submissionId,
      p_article_id: articleId,
      p_idempotency_key: idempotencyKey,
      p_intent_hash: intentHash,
      p_payload: payload
    });

    if (error1) {
      console.error('RPC Error (Editor):', error1.message);
      assert(false, 'Editor submission FAILED');
    } else {
      assert(result1?.success === true, 'Editor submission PASS');
      assert(result1?.submission_id === submissionId, 'Submission identity PASS');
      assert(result1?.article_id === articleId, 'Article identity PASS');
    }

    // Test 4: Duplicate submission idempotency
    const { data: result2, error: error2 } = await editorClient.rpc('submit_article_transition', {
      p_submission_id: crypto.randomUUID(),
      p_article_id: crypto.randomUUID(),
      p_idempotency_key: idempotencyKey,
      p_intent_hash: intentHash,
      p_payload: payload
    });

    if (error2) {
      console.error('RPC Error 2 (Editor):', error2.message);
      assert(false, 'Idempotent replay FAILED');
    } else {
      assert(result2?.success === true, 'Idempotent replay PASS');
    }

    // Test 5: Conflicting idempotency
    const { data: result3, error: error3 } = await editorClient.rpc('submit_article_transition', {
      p_submission_id: submissionId,
      p_article_id: crypto.randomUUID(),
      p_idempotency_key: crypto.randomUUID(),
      p_intent_hash: crypto.randomUUID(),
      p_payload: payload
    });

    assert(error3 !== null, 'Conflict detection PASS');
    
    // Test 6: Governance privilege regression
    try {
      const q = `SET ROLE governance_ingest_role; SELECT public.submit_article_transition('00000000-0000-0000-0000-000000000000'::uuid,'00000000-0000-0000-0000-000000000000'::uuid,'test','test','{}'::jsonb);`;
      const output = execSync(`docker exec supabase_db_opuspublica psql -U postgres -d postgres -c "${q}"`, { stdio: 'pipe', encoding: 'utf8' });
      // If it doesn't throw, it might still have failed inside the JSON output
      if (output.includes('permission denied')) {
        assert(true, 'Governance submission DENIED (Regression Test PASS)');
      } else {
        assert(false, 'Governance submission ALLOWED (Regression Test FAILED!)');
      }
    } catch (e) {
      const output = e.stdout?.toString() || e.stderr?.toString() || e.message;
      if (output.includes('permission denied')) {
        assert(true, 'Governance submission DENIED (Regression Test PASS)');
      } else {
        console.error('Unexpected error during Governance check:', output);
        assert(false, 'Governance submission FAILED (Unknown Error)');
      }
    }

    // Verify the DB records (Using read-only PSQL connection)
    const psql = (query) => {
      try {
        const output = execSync(`docker exec supabase_db_opuspublica psql -U postgres -d postgres -t -c "${query}"`, { encoding: 'utf8' }).trim();
        return output ? output.split('|').map(s => s.trim()) : null;
      } catch (e) {
        return null;
      }
    };

    const submissionRow = psql(`SELECT submission_state, submission_submitted_by_user_id FROM public.submissions WHERE submission_id = '${submissionId}'`);
    assert(submissionRow !== null, 'Submission record exists');
    if (submissionRow) {
      assert(submissionRow[0] === 'Submitted', 'Submission state is Submitted');
      assert(submissionRow[1] === editorUser.id, 'Submission owner is correct');
    }
    
    const articleRow = psql(`SELECT id FROM public.articles WHERE id = '${articleId}'`);
    assert(articleRow !== null, 'Article record exists independently');

    const eventRow = psql(`SELECT id FROM public.outbox WHERE payload->>'submission_id' = '${submissionId}'`);
    assert(eventRow !== null, 'ArticleSubmitted PASS');
    if (eventRow) {
      assert(eventRow[0] !== submissionId && eventRow[0] !== articleId, 'Independent event_id PASS');
    }

  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    // Cleanup
    await cleanupUser(editorUser?.id);
    await cleanupUser(authorUser?.id);
    // Cleanup temporary journal
    try {
      execSync(`docker exec supabase_db_opuspublica psql -U postgres -d postgres -c "DELETE FROM public.journals WHERE id = '00000000-0000-0000-0000-000000000000' OR name = 'Test Journal';"`, { stdio: 'ignore' });
    } catch (e) {}
    console.log(`\nTests completed: ${passed} passed, ${failed} failed`);
  }
}

runTests();
