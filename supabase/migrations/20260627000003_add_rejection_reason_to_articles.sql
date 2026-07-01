-- Add rejection_reason column to articles table
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS rejection_reason text;
