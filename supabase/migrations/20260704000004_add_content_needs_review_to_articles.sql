-- Migration: Add content_needs_review column to articles table
-- Created: 2026-07-04

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS content_needs_review boolean DEFAULT false;
