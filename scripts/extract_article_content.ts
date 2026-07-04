import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
const pdf = require('pdf-parse');

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function run() {
  console.log('--- Starting PDF Full-text Extraction and Update Script ---');

  // Fetch all articles that have a PDF and are NOT test articles
  // Pre-existing articles will have status = 'published'
  const { data: articles, error: fetchError } = await supabase
    .from('articles')
    .select('id, title, pdf_url, status')
    .eq('status', 'published');

  if (fetchError || !articles) {
    console.error('Error fetching articles:', fetchError?.message);
    process.exit(1);
  }

  console.log(`Found ${articles.length} published articles to process.`);

  for (const article of articles) {
    console.log(`\nProcessing Article ID: ${article.id}`);
    console.log(`Title: "${article.title}"`);

    if (!article.pdf_url) {
      console.log('No pdf_url found for this article. Skipping.');
      continue;
    }

    try {
      console.log(`Downloading PDF from storage bucket: ${article.pdf_url}`);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('publications')
        .download(article.pdf_url);

      if (downloadError || !fileData) {
        console.error(`❌ Download failed for ${article.pdf_url}:`, downloadError?.message);
        continue;
      }

      console.log('Converting Blob to Uint8Array and parsing PDF...');
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      const parser = new pdf.PDFParse(uint8);
      await parser.load();
      const parsedPdf = await parser.getText();
      const rawText = parsedPdf.text || '';

      if (!rawText.trim()) {
        console.log('Extracted text is empty. Skipping.');
        continue;
      }

      console.log(`Extracted raw text of length: ${rawText.length}`);

      // Basic cleanup:
      // 1. Collapse inline spaces & tabs
      let cleaned = rawText.replace(/[ \t\f\v]+/g, ' ');
      // 2. Normalize line endings
      cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // 3. Separate paragraphs by checking for double newlines
      const rawParagraphs = cleaned.split(/\n\s*\n+/);
      const paragraphs = rawParagraphs
        .map((p: string) => p.replace(/\n+/g, ' ').trim()) // collapse single newlines to spaces inside paragraph
        .filter((p: string) => p.length > 10); // ignore short layout headers/footers/page numbers

      console.log(`Re-constructed ${paragraphs.length} paragraphs.`);

      const draftHtml = paragraphs.map((p: string) => `<p>${escapeHtml(p)}</p>`).join('\n');

      console.log('Updating article row in database...');
      const { error: updateError } = await supabase
        .from('articles')
        .update({
          content: draftHtml,
          content_needs_review: true
        })
        .eq('id', article.id);

      if (updateError) {
        console.error(`❌ DB Update failed for article ${article.id}:`, updateError.message);
      } else {
        console.log(`✅ Successfully updated article ${article.id} with extracted draft text!`);
      }

    } catch (err: any) {
      console.error(`❌ Error parsing PDF for article ${article.id}:`, err.message || err);
    }
  }

  console.log('\n--- Full-text extraction and DB update complete! ---');
}

run();
