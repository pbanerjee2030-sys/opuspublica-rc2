-- Migration: Add Canonical Artifact Columns to Articles Table

ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS canonical_session_id UUID,

ADD COLUMN IF NOT EXISTS canonical_checksum TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);
