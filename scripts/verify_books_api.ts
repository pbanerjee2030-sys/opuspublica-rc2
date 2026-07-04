import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function runTest() {
  console.log('--- Starting Books API CRUD Integration Test with Audit Log Checks ---');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase env vars are missing.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('1. Logging in as admin_test@opuspublica.org...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin_test@opuspublica.org',
    password: 'Password123!'
  });

  if (authError || !authData.session) {
    console.error('Failed to log in:', authError?.message || 'No session returned');
    process.exit(1);
  }

  const accessToken = authData.session.access_token;
  console.log('Logged in successfully! Token acquired.');

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  // Perform cleanup of any pre-existing test book
  console.log('Cleaning up any pre-existing "verification-test-book"...');
  await supabase.from('books').delete().eq('slug', 'verification-test-book');

  const testBookPayload = {
    title: "Verification Test Book",
    subtitle: "A testing subtitle",
    slug: "verification-test-book",
    cover_image: "/books/grace-cover.jpg",
    isbn: "9798227366277",
    isbn_ebook: "9798227366278",
    publication_date: "2026",
    pages: 100,
    language: "English",
    format: "Paperback, E-book",
    price: "$19.99",
    status: "Available Now",
    is_available: true,
    description: "A short description for verification.",
    long_description: "A detailed description for verification testing.",
    authors: [{"name": "Test Verification Writer", "role": "Lead Author"}],
    testimonials: [{"quote": "Great book for testing!", "author": "Test Validator", "title": "QA Lead"}],
    table_of_contents: ["Introduction", "Verification Methods", "Conclusion"],
    categories: ["Science", "Testing"],
    tags: ["verification", "automated"]
  };

  console.log('\n2. Creating the test book via POST /api/admin/data?entity=books...');
  const createRes = await fetch('http://localhost:3000/api/admin/data?entity=books', {
    method: 'POST',
    headers,
    body: JSON.stringify(testBookPayload)
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error(`Failed to create book: ${createRes.status} ${createRes.statusText}\n${errorText}`);
    process.exit(1);
  }

  const createResult = await createRes.json();
  const createdBook = createResult.data;
  console.log('Test book created successfully with ID:', createdBook.id);

  console.log('\n3. Verifying JSONB round-trip correctness of properties...');
  
  // Verify array equality helper
  const arraysEqual = (a: any[], b: any[]) => 
    a.length === b.length && a.every((val, index) => val === b[index]);

  // Key-order independent object equality helper
  const objectsEqual = (a: any, b: any) => {
    if (!a || !b) return a === b;
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => a[key] === b[key]);
  };

  const errors: string[] = [];

  if (createdBook.title !== testBookPayload.title) errors.push(`Title mismatch: expected "${testBookPayload.title}", got "${createdBook.title}"`);
  if (createdBook.slug !== testBookPayload.slug) errors.push(`Slug mismatch: expected "${testBookPayload.slug}", got "${createdBook.slug}"`);
  if (createdBook.pages !== testBookPayload.pages) errors.push(`Pages mismatch: expected ${testBookPayload.pages}, got ${createdBook.pages}`);
  if (createdBook.price !== testBookPayload.price) errors.push(`Price mismatch: expected "${testBookPayload.price}", got "${createdBook.price}"`);
  
  // JSONB Authors
  if (!createdBook.authors || createdBook.authors.length !== 1 || !objectsEqual(createdBook.authors[0], testBookPayload.authors[0])) {
    errors.push(`Authors array mismatch:\nExpected: ${JSON.stringify(testBookPayload.authors)}\nGot: ${JSON.stringify(createdBook.authors)}`);
  }

  // JSONB Testimonials
  if (!createdBook.testimonials || createdBook.testimonials.length !== 1 || !objectsEqual(createdBook.testimonials[0], testBookPayload.testimonials[0])) {
    errors.push(`Testimonials array mismatch:\nExpected: ${JSON.stringify(testBookPayload.testimonials)}\nGot: ${JSON.stringify(createdBook.testimonials)}`);
  }

  // JSONB Table of Contents
  if (!createdBook.table_of_contents || !arraysEqual(createdBook.table_of_contents, testBookPayload.table_of_contents)) {
    errors.push(`Table of Contents mismatch:\nExpected: ${JSON.stringify(testBookPayload.table_of_contents)}\nGot: ${JSON.stringify(createdBook.table_of_contents)}`);
  }

  // JSONB Categories
  if (!createdBook.categories || !arraysEqual(createdBook.categories, testBookPayload.categories)) {
    errors.push(`Categories mismatch:\nExpected: ${JSON.stringify(testBookPayload.categories)}\nGot: ${JSON.stringify(createdBook.categories)}`);
  }

  // JSONB Tags
  if (!createdBook.tags || !arraysEqual(createdBook.tags, testBookPayload.tags)) {
    errors.push(`Tags mismatch:\nExpected: ${JSON.stringify(testBookPayload.tags)}\nGot: ${JSON.stringify(createdBook.tags)}`);
  }

  if (errors.length > 0) {
    console.error('❌ JSONB Round-trip verification FAILED:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  } else {
    console.log('✅ All fields (including dynamic JSONB arrays/objects) round-tripped perfectly!');
  }

  console.log('\n4. Verifying audit_log entry for book creation...');
  const { data: createAudit, error: createAuditErr } = await supabase
    .from('audit_log')
    .select('*')
    .eq('action', 'book_created')
    .eq('target_id', createdBook.id)
    .single();

  if (createAuditErr || !createAudit) {
    console.error('Audit log for book_created not found:', createAuditErr?.message);
    process.exit(1);
  }
  if (createAudit.target_type !== 'book') {
    console.error(`Audit log target_type mismatch: expected "book", got "${createAudit.target_type}"`);
    process.exit(1);
  }
  console.log('✅ Verified: Audit log entry for book_created target_type is correctly "book".');

  console.log('\n5. Verifying public SELECT access to the test book...');
  const { data: publicBooks, error: publicError } = await supabase
    .from('books')
    .select('*')
    .eq('slug', 'verification-test-book');

  if (publicError) {
    console.error('Failed public query:', publicError.message);
    process.exit(1);
  }

  if (!publicBooks || publicBooks.length === 0) {
    console.error('Test book was not visible publicly!');
    process.exit(1);
  }
  console.log('✅ Verified public access policy works (SELECT allowed).');

  console.log('\n6. Verifying public detailed view URL page loads...');
  const pageRes = await fetch('http://localhost:3000/books/verification-test-book');
  if (pageRes.status === 200) {
    console.log('✅ Public page http://localhost:3000/books/verification-test-book loaded successfully (Status 200).');
  } else {
    console.error(`Failed to load book page: ${pageRes.status} ${pageRes.statusText}`);
    process.exit(1);
  }

  console.log('\n7. Modifying price of "Echoes of the Himalayas" (ID: d74f26b5-0c7f-4428-98f9-4b2a6fcf1479)...');
  const patchRes = await fetch('http://localhost:3000/api/admin/data?entity=books', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      id: 'd74f26b5-0c7f-4428-98f9-4b2a6fcf1479',
      price: '$99.99'
    })
  });

  if (!patchRes.ok) {
    const errorText = await patchRes.text();
    console.error(`Failed to modify price: ${patchRes.status} ${patchRes.statusText}\n${errorText}`);
    process.exit(1);
  }
  console.log('Price modified in admin backend.');

  console.log('Verifying price change reflected publicly...');
  const { data: updatedBookData } = await supabase
    .from('books')
    .select('price')
    .eq('id', 'd74f26b5-0c7f-4428-98f9-4b2a6fcf1479')
    .single();

  if (updatedBookData?.price === '$99.99') {
    console.log('✅ Verified price updated to $99.99 publicly.');
  } else {
    console.error(`Failed to update price publicly. Got: ${updatedBookData?.price}`);
    process.exit(1);
  }

  console.log('Verifying audit_log entry for book update...');
  const { data: updateAudit, error: updateAuditErr } = await supabase
    .from('audit_log')
    .select('*')
    .eq('action', 'book_updated')
    .eq('target_id', 'd74f26b5-0c7f-4428-98f9-4b2a6fcf1479')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (updateAuditErr || !updateAudit) {
    console.error('Audit log for book_updated not found:', updateAuditErr?.message);
    process.exit(1);
  }
  if (updateAudit.target_type !== 'book') {
    console.error(`Audit log target_type mismatch for update: expected "book", got "${updateAudit.target_type}"`);
    process.exit(1);
  }
  console.log('✅ Verified: Audit log entry for book_updated target_type is correctly "book".');

  console.log('\n8. Restoring price of "Echoes of the Himalayas" back to $21.99...');
  const restoreRes = await fetch('http://localhost:3000/api/admin/data?entity=books', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      id: 'd74f26b5-0c7f-4428-98f9-4b2a6fcf1479',
      price: '$21.99'
    })
  });

  if (!restoreRes.ok) {
    console.error('Failed to restore price:', restoreRes.statusText);
    process.exit(1);
  }
  console.log('✅ Price successfully restored.');

  console.log('\n9. Deleting the test book...');
  const deleteRes = await fetch(`http://localhost:3000/api/admin/data?entity=books&id=${createdBook.id}`, {
    method: 'DELETE',
    headers
  });

  if (!deleteRes.ok) {
    console.error('Failed to delete book:', deleteRes.statusText);
    process.exit(1);
  }
  console.log('Test book deleted successfully from admin.');

  console.log('Verifying deletion publicly...');
  const { data: deletedBooks } = await supabase
    .from('books')
    .select('*')
    .eq('slug', 'verification-test-book');

  if (!deletedBooks || deletedBooks.length === 0) {
    console.log('✅ Verified test book is completely gone from the public database view.');
  } else {
    console.error('Error: Book still exists publicly!');
    process.exit(1);
  }

  console.log('Verifying audit_log entry for book deletion...');
  const { data: deleteAudit, error: deleteAuditErr } = await supabase
    .from('audit_log')
    .select('*')
    .eq('action', 'book_deleted')
    .eq('target_id', createdBook.id)
    .single();

  if (deleteAuditErr || !deleteAudit) {
    console.error('Audit log for book_deleted not found:', deleteAuditErr?.message);
    process.exit(1);
  }
  if (deleteAudit.target_type !== 'book') {
    console.error(`Audit log target_type mismatch for delete: expected "book", got "${deleteAudit.target_type}"`);
    process.exit(1);
  }
  console.log('✅ Verified: Audit log entry for book_deleted target_type is correctly "book".');

  console.log('\n--- All integration and audit log checks passed successfully! ---');
}

runTest().catch(e => {
  console.error('Unhandled error during verification test:', e);
  process.exit(1);
});
