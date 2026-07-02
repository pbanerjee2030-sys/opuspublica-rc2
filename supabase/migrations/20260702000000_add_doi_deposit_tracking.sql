-- Add DOI deposit tracking columns to articles
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS doi_deposit_status text DEFAULT 'not_submitted';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS doi_deposited_at timestamp with time zone;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS doi_deposit_error text;
