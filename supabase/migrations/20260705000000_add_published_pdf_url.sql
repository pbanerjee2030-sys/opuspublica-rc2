-- Add published_pdf_url column to articles
-- This stores the path to the house-styled PDF generated at publish time.
-- Separate from pdf_url (the author's raw upload, used during review).
ALTER TABLE articles ADD COLUMN IF NOT EXISTS published_pdf_url text;
