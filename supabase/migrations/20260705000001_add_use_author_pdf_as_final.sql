-- Add use_author_pdf_as_final column to articles
-- When enabled, the publish action skips house-PDF generation entirely
-- and published_pdf_url is set directly to the author's original pdf_url.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS use_author_pdf_as_final boolean DEFAULT false NOT NULL;
