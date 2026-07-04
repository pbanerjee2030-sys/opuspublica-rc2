import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

let supabaseUrl = '';
let supabaseServiceKey = '';

// Load env parameters from .env.local
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
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
      if (!process.env[key]) {
        process.env[key] = value.trim();
      }
    }
  });
}

supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const uploads = [
  {
    localFile: 'conflict-peace-studies.pdf',
    storagePath: 'articles/1782533017324_649f1a5e251d5.pdf'
  },
  {
    localFile: 'expressions-sustainable-art.pdf',
    storagePath: 'articles/1782533014612_6496c07cb40d6.pdf'
  },
  {
    localFile: 'migration-matters.pdf',
    storagePath: 'articles/1782533011041_6481f87ae97fa.pdf'
  }
];

async function run() {
  console.log('Starting upload of remaining PDF manuscripts...');

  for (const upload of uploads) {
    const localPath = path.join(process.cwd(), 'public', 'pdfs', upload.localFile);
    console.log(`Processing upload: ${upload.localFile} -> ${upload.storagePath}`);

    if (!fs.existsSync(localPath)) {
      console.error(`[-] ERROR: Local file not found at ${localPath}`);
      continue;
    }

    try {
      const fileBuffer = fs.readFileSync(localPath);
      const sizeBytes = fileBuffer.length;
      console.log(`[+] Read local file: ${upload.localFile} (${sizeBytes} bytes)`);

      const { data, error } = await supabase.storage
        .from('publications')
        .upload(upload.storagePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        console.error(`[-] FAILED to upload ${upload.localFile}:`, error.message);
      } else {
        console.log(`[+] SUCCESS: Uploaded ${upload.localFile} (path: ${upload.storagePath})`, data);
      }
    } catch (err: any) {
      console.error(`[-] Exception during upload for ${upload.localFile}:`, err.message);
    }
  }

  console.log('Upload process completed.');
}

run();
