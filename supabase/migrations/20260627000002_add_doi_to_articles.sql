-- Migration: Add DOI column to articles table
-- Created: 2026-06-27

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS doi text UNIQUE;
