-- Migration: Add DOI deposit tracking columns to books
-- Created: 2026-07-04

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS doi_deposit_status text DEFAULT 'not_submitted';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS doi_deposited_at timestamp with time zone;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS doi_deposit_error text;
