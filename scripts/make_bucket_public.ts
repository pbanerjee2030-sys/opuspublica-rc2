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

async function run() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Updating publications bucket to PUBLIC...');
  const { data, error } = await supabase.storage.updateBucket('publications', {
    public: true,
    fileSizeLimit: 26214400, // 25MB
    allowedMimeTypes: ['application/pdf']
  });

  if (error) {
    console.error('Failed to update bucket:', error.message);
  } else {
    console.log('Successfully updated publications bucket to PUBLIC!', data);
  }

  console.log('Querying storage buckets for verification...');
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log(JSON.stringify(buckets, null, 2));
}

run();
