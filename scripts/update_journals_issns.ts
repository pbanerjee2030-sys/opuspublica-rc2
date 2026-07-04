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

const issnMap: Record<string, string> = {
  'global-perspectives': '3050-4589',
  'voice-rights': '3050-4503',
  'expressions': '3050-4538',
  'migration-matters': '3050-4597'
};

async function run() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials:', { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey });
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Updating journal ISSNs in database...');

  for (const [slug, issn] of Object.entries(issnMap)) {
    console.log(`Updating ${slug} with ISSN ${issn}...`);
    const { data, error } = await supabase
      .from('journals')
      .update({ issn })
      .eq('slug', slug)
      .select();

    if (error) {
      console.error(`Failed to update ${slug}:`, error.message);
    } else {
      console.log(`Successfully updated ${slug}!`, data);
    }
  }

  console.log('Verification: Querying updated journals...');
  const { data: verifiedJournals } = await supabase
    .from('journals')
    .select('name, slug, issn')
    .in('slug', Object.keys(issnMap));
  
  console.log(verifiedJournals);
}

run();
