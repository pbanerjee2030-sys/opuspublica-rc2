import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function findLocalImageForJournal(name: string, slug: string): string | null {
  const nameClean = name.toLowerCase().trim();
  const slugClean = slug.toLowerCase().trim();
  
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) return null;

  const files = fs.readdirSync(publicDir);
  
  // Exact match
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (ext !== '.jpg' && ext !== '.png' && ext !== '.jpeg') continue;
    const base = path.basename(f, ext).toLowerCase().trim();
    
    if (base === nameClean || base === slugClean) return f;
    
    // Special overrides
    if (slugClean === 'global-perspectives' && base === 'gppd') return f;
    if (slugClean === 'voice-and-rights' && base === 'voice and rights') return f;
    if (slugClean === 'voice-rights' && base === 'voice and rights') return f;
  }
  
  // Partial matches
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (ext !== '.jpg' && ext !== '.png' && ext !== '.jpeg') continue;
    const base = path.basename(f, ext).toLowerCase().trim();
    if (nameClean.includes(base) || base.includes(nameClean)) return f;
  }
  
  return null;
}

async function uploadCovers() {
  try {
    console.log("Connecting to Supabase Storage...");
    
    // 1. Ensure 'covers' bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      throw new Error(`Error listing buckets: ${listError.message}`);
    }

    const bucketExists = buckets?.some(b => b.name === 'covers');
    if (!bucketExists) {
      console.log("Bucket 'covers' does not exist. Creating it...");
      const { error: createError } = await supabase.storage.createBucket('covers', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        fileSizeLimit: 5242880 // 5MB
      });
      if (createError) {
        throw new Error(`Failed to create covers bucket: ${createError.message}`);
      }
      console.log("Created public 'covers' bucket successfully.");
    } else {
      console.log("Public bucket 'covers' already exists.");
    }

    // 2. Query all journals
    console.log("Fetching journals list from the database...");
    const { data: journals, error: jError } = await supabase
      .from('journals')
      .select('id, name, slug');

    if (jError || !journals) {
      throw new Error(`Failed to query journals: ${jError?.message}`);
    }

    console.log(`Found ${journals.length} journals in database. Starting uploads...`);

    for (const journal of journals) {
      const imgFile = findLocalImageForJournal(journal.name, journal.slug);
      if (!imgFile) {
        console.log(`⚠️ No local cover image found matching journal: "${journal.name}" (${journal.slug})`);
        continue;
      }

      const localPath = path.join(process.cwd(), 'public', imgFile);
      console.log(`Found local cover file for "${journal.name}": ${imgFile}`);

      // Read file buffer
      const fileBuffer = fs.readFileSync(localPath);
      const fileExt = path.extname(imgFile).substring(1);
      const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
      const storagePath = `journal_${journal.slug}.${fileExt}`;

      // Upload file to covers bucket
      console.log(`Uploading ${imgFile} to covers/${storagePath}...`);
      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) {
        console.error(`❌ Failed to upload cover for journal ${journal.name}:`, uploadError.message);
        continue;
      }

      // Retrieve public URL
      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(storagePath);

      console.log(`Generated public URL: ${publicUrl}`);

      // Update journal record in database
      const { error: updateError } = await supabase
        .from('journals')
        .update({ cover_image: publicUrl })
        .eq('id', journal.id);

      if (updateError) {
        console.error(`❌ Failed to update database record for journal ${journal.name}:`, updateError.message);
      } else {
        console.log(`✅ Successfully updated cover image for "${journal.name}".`);
      }
    }

    console.log("\nFinished cover uploads execution.");

  } catch (error: any) {
    console.error("Cover upload script failure:", error.message);
    process.exit(1);
  }
}

uploadCovers();
