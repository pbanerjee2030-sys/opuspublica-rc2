import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

let supabaseUrl = '';
let supabaseServiceKey = '';

// Load env parameters from .env.local in workspace root
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
          supabaseUrl = value.trim();
        } else if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
          supabaseServiceKey = value.trim();
        }
      }
    });
  }
} catch (err) {
  console.error('Failed to load .env.local manually:', err);
}

const mappings = [
  {
    article_id: 'e863739b-4042-4be7-8c34-d1d3d78379ce', // Migration, Security Threats...
    profile_id: 'aff40ff8-9ff5-47ae-a79c-936a374def00', // Arindam Bhattacharya
    co_author_name: null
  },
  {
    article_id: '8c982667-62a4-41e9-bc14-543f3f475a19', // Sustainable Art...
    profile_id: null,
    co_author_name: 'Priyasa Banerjee'
  },
  {
    article_id: 'd62511c5-be8d-45cb-b6f6-8237d229bfc0', // Examining the Jurisdictional Challenges...
    profile_id: 'aff40ff8-9ff5-47ae-a79c-936a374def00', // Arindam Bhattacharya
    co_author_name: null
  },
  {
    article_id: '12cc3ce1-6fa8-4f2f-85c4-d40c957c6198', // The Socio-Economic Impact of Judicial Verdicts
    profile_id: 'ae7c2502-e4fd-49b7-98b7-3fe5c4358d3a', // Arindam Bhattacharya (admin)
    co_author_name: null
  }
];

async function run() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Clearing existing article authors table...');
  const { error: deleteError } = await supabase
    .from('article_authors')
    .delete()
    .neq('article_id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('Failed to clear article_authors:', deleteError.message);
    return;
  }
  console.log('Cleared successfully!');

  console.log('Inserting correct article authors mappings...');
  const { data: insertedData, error: insertError } = await supabase
    .from('article_authors')
    .insert(mappings as any)
    .select();

  if (insertError) {
    console.error('Failed to insert mappings:', insertError.message);
  } else {
    console.log('Successfully inserted mappings!', insertedData);
  }

  console.log('Verification: Querying article_authors table with profiles...');
  const { data: verifiedAuthors } = await supabase
    .from('article_authors')
    .select('*, profiles(*)');
  console.log(JSON.stringify(verifiedAuthors, null, 2));
}

run();
