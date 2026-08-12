import * as fs from 'fs';
import { chromium } from 'playwright';
import { renderArticleHtml } from './pdf-template';
import { getSupabaseAdmin } from './supabase-admin';

interface ArticleForPdf {
  id: string;
  title: string;
  abstract: string | null;
  content: string | null;
  keywords: string[] | string | null;
  doi: string | null;
  published_at: string | null;
  journal_name: string | null;
  journal_issn: string | null;
  authors: { name: string; affiliation: string | null }[];
}

/**
 * Generates a house-styled PDF for a published article.
 *
 * 1. Renders the article data into a styled HTML template
 * 2. Uses Playwright headless Chromium to convert to PDF
 * 3. Uploads the PDF buffer to Supabase Storage (publications/published/{articleId}.pdf)
 * 4. Returns the storage path
 */
export async function generatePublishedPdf(article: ArticleForPdf, customStoragePath?: string): Promise<string> {

  const html = renderArticleHtml(article);

  // Launch headless Chromium
  const browser = await chromium.launch({ headless: true });
  let pdfBuffer;
  try {
    const page = await browser.newPage();

    // Set content and wait for fonts to load
    await page.setContent(html, { waitUntil: 'networkidle' });

    // Generate PDF with A4 format
    pdfBuffer = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: false,
    });
  } finally {
    await browser.close();
  }

  // Upload to Supabase Storage
  const storagePath = customStoragePath || `published/${article.id}.pdf`;
  const supabaseAdmin = getSupabaseAdmin();

  const { error: uploadError } = await supabaseAdmin.storage
    .from('publications')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('[PDF Gen] Upload error:', uploadError);
    throw new Error(`Failed to upload published PDF: ${uploadError.message}`);
  }


  return storagePath;
}
