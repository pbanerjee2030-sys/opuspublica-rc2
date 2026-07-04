-- Migration: Add keywords, conflict of interest, data availability, and ethics approval columns to articles
-- Created: 2026-07-04

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS keywords text[];
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS conflict_of_interest_statement text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS data_availability_statement text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS ethics_approval_statement text;
