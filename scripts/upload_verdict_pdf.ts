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
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ARTICLE_ID = '12cc3ce1-6fa8-4f2f-85c4-d40c957c6198';

async function run() {
  try {
    console.log(`Fetching article with ID: ${ARTICLE_ID}...`);
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', ARTICLE_ID)
      .single();

    if (fetchError || !article) {
      throw new Error(`Failed to fetch article: ${fetchError?.message || 'Not found'}`);
    }

    console.log('Article columns:', Object.keys(article));
    console.log('Current PDF URL:', article.pdf_url);
    
    // Determine PDF storage path
    let storagePath = article.pdf_url;
    if (!storagePath || !storagePath.startsWith('articles/')) {
      storagePath = `articles/${ARTICLE_ID}.pdf`;
    }
    console.log(`Target PDF storage path: ${storagePath}`);

    // Read the local PDF file
    const localPdfPath = path.join(process.cwd(), 'public', 'pdfs', 'the-socio-economic-impact-of-judicial-verdicts.pdf');
    if (!fs.existsSync(localPdfPath)) {
      throw new Error(`Local PDF file not found at: ${localPdfPath}`);
    }
    const pdfBuffer = fs.readFileSync(localPdfPath);

    console.log('Uploading PDF to publications bucket...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('publications')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }
    console.log('PDF upload succeeded!', uploadData);

    // Update the articles.pdf_url in database
    console.log('Updating articles table pdf_url...');
    const updatePayload: any = { pdf_url: storagePath };

    // Check if cover_image column exists
    const hasCoverImageCol = 'cover_image' in article;
    if (hasCoverImageCol) {
      console.log('Detected cover_image column in articles table. Checking for cover image file...');
      const localImagePath = path.join(process.cwd(), 'public', 'socio-economic impact.jpeg');
      if (fs.existsSync(localImagePath)) {
        const imageBuffer = fs.readFileSync(localImagePath);
        const imageStoragePath = `covers/${ARTICLE_ID}.jpeg`;
        
        console.log('Uploading cover image to covers bucket...');
        const { error: imageUploadError } = await supabase.storage
          .from('covers')
          .upload(imageStoragePath, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (imageUploadError) {
          console.error('Failed to upload cover image:', imageUploadError.message);
        } else {
          console.log('Cover image upload succeeded!');
          updatePayload.cover_image = imageStoragePath;
        }
      } else {
        console.log(`Local cover image not found at: ${localImagePath}`);
      }
    }

    const { error: updateError } = await supabase
      .from('articles')
      .update(updatePayload)
      .eq('id', ARTICLE_ID);

    if (updateError) {
      throw new Error(`Failed to update articles table: ${updateError.message}`);
    }
    console.log('Database update completed successfully!');
  } catch (err: any) {
    console.error('Execution failed:', err.message);
  }
}

run();
