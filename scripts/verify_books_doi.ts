import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function runTest() {
  console.log('--- Starting Book DOI Minting Integration Test ---');

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
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  // Cleanup pre-existing test books
  console.log('Cleaning up previous test books...');
  await supabase.from('books').delete().in('slug', ['verification-doi-book', 'verification-no-isbn-book']);

  const bookWithIsbnPayload = {
    title: "Verification DOI Book",
    subtitle: "A testing subtitle",
    slug: "verification-doi-book",
    cover_image: "/books/grace-cover.jpg",
    isbn: "9798227366277",
    isbn_ebook: "9798227366278",
    publication_date: "2026",
    pages: 120,
    language: "English",
    format: "Paperback, E-book",
    price: "$19.99",
    status: "Available Now",
    is_available: true,
    description: "A short description for verification.",
    long_description: "A detailed description for verification testing.",
    doi: "10.5555/verification-doi-book",
    authors: [
      { name: "John Doe", role: "Lead Author" },
      { name: "Jane Smith", role: "Co-Author" }
    ]
  };

  const bookWithoutIsbnPayload = {
    title: "Verification No ISBN Book",
    subtitle: "No ISBN description",
    slug: "verification-no-isbn-book",
    cover_image: "/books/grace-cover.jpg",
    isbn: "",
    isbn_ebook: "",
    publication_date: "2026",
    pages: 80,
    language: "English",
    format: "E-book",
    price: "$0.00",
    status: "Available Now",
    is_available: true,
    description: "Testing book without ISBN.",
    doi: "10.5555/verification-no-isbn-book",
    authors: [{ name: "Only Author", role: "Author" }]
  };

  console.log('\n2. Creating test books in database...');
  const create1 = await fetch('http://localhost:3000/api/admin/data?entity=books', {
    method: 'POST',
    headers,
    body: JSON.stringify(bookWithIsbnPayload)
  });
  if (!create1.ok) {
    console.error('Failed to create book 1:', await create1.text());
    process.exit(1);
  }
  const book1 = (await create1.json()).data;

  const create2 = await fetch('http://localhost:3000/api/admin/data?entity=books', {
    method: 'POST',
    headers,
    body: JSON.stringify(bookWithoutIsbnPayload)
  });
  if (!create2.ok) {
    console.error('Failed to create book 2:', await create2.text());
    process.exit(1);
  }
  const book2 = (await create2.json()).data;

  console.log(`Created books. IDs: Book1=${book1.id}, Book2=${book2.id}`);

  console.log('\n3. Triggering DOI Minting for Book 1 (With Print & E-book ISBNs)...');
  const mint1Res = await fetch('http://localhost:3000/api/doi/mint?type=book', {
    method: 'POST',
    headers,
    body: JSON.stringify({ bookId: book1.id })
  });

  const mint1Data = await mint1Res.json();
  if (!mint1Data.xml) {
    console.error('No XML returned in mint response:', mint1Data);
    process.exit(1);
  }

  const xml1 = mint1Data.xml;
  console.log('XML 1 retrieved. Validating tags...');

  const errors: string[] = [];

  // Check monograph book type schema
  if (!xml1.includes('<book book_type="monograph">')) errors.push('Missing <book book_type="monograph"> schema root.');
  if (!xml1.includes('<book_metadata language="en">')) errors.push('Missing <book_metadata language="en">.');
  if (!xml1.includes('<titles><title>Verification DOI Book</title></titles>')) errors.push('Titles block is incorrect.');
  
  // Contributors check
  if (!xml1.includes('sequence="first" contributor_role="author"')) errors.push('First contributor author sequence is incorrect.');
  if (!xml1.includes('<given_name>John</given_name>')) errors.push('First contributor given_name is missing.');
  if (!xml1.includes('<surname>Doe</surname>')) errors.push('First contributor surname is missing.');
  if (!xml1.includes('sequence="additional" contributor_role="author"')) errors.push('Additional contributor author sequence is incorrect.');
  if (!xml1.includes('<given_name>Jane</given_name>')) errors.push('Additional contributor given_name is missing.');
  if (!xml1.includes('<surname>Smith</surname>')) errors.push('Additional contributor surname is missing.');

  // Date check
  if (!xml1.includes('<publication_date>\n          <year>2026</year>\n        </publication_date>')) errors.push('Publication date year is incorrect.');
  
  // ISBN check
  if (!xml1.includes('<isbn media_type="print">9798227366277</isbn>')) errors.push('Print ISBN is incorrect/missing.');
  if (!xml1.includes('<isbn media_type="electronic">9798227366278</isbn>')) errors.push('Electronic ISBN is incorrect/missing.');

  // Publisher and DOI check
  if (!xml1.includes('<publisher>\n          <publisher_name>Opus Publica</publisher_name>\n        </publisher>')) errors.push('Publisher block is incorrect.');
  if (!xml1.includes('<doi>10.5555/verification-doi-book</doi>')) errors.push('DOI data value is incorrect.');
  if (!xml1.includes('<resource>https://localhost:3000/books/verification-doi-book</resource>') &&
      !xml1.includes('<resource>http://localhost:3000/books/verification-doi-book</resource>')) {
    errors.push('Resource URL data value is incorrect.');
  }

  if (errors.length > 0) {
    console.error('❌ Book 1 XML Validation FAILED:');
    errors.forEach(e => console.error(`  - ${e}`));
    console.log('\nXML content generated:\n', xml1);
    process.exit(1);
  } else {
    console.log('✅ Book 1 (With ISBNs) generated XML is perfectly valid and structurally correct!');
  }

  console.log('\n4. Triggering DOI Minting for Book 2 (No ISBN - fallback check)...');
  const mint2Res = await fetch('http://localhost:3000/api/doi/mint?type=book', {
    method: 'POST',
    headers,
    body: JSON.stringify({ bookId: book2.id })
  });

  const mint2Data = await mint2Res.json();
  const xml2 = mint2Data.xml;

  if (!xml2) {
    console.error('No XML returned for book 2:', mint2Data);
    process.exit(1);
  }

  console.log('XML 2 retrieved. Validating fallback noisbn tag...');
  
  if (!xml2.includes('<noisbn reason="archive_volume"/>')) {
    console.error('❌ Fallback <noisbn reason="archive_volume"/> tag not found in XML!');
    console.log('\nXML content generated:\n', xml2);
    process.exit(1);
  } else {
    console.log('✅ Book 2 (No ISBN) fallback <noisbn reason="archive_volume"/> validation passed!');
  }

  console.log('\n5. Cleaning up test books...');
  await supabase.from('books').delete().in('slug', ['verification-doi-book', 'verification-no-isbn-book']);
  console.log('Test books removed.');

  console.log('\n--- All Crossref Book DOI Minting XML validation tests passed successfully! ---');
}

runTest().catch(e => {
  console.error('Unexpected error during XML test:', e);
  process.exit(1);
});
