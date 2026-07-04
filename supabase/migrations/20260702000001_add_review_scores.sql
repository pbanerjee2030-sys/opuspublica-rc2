-- Add scores jsonb column to reviewer_assignments for structured review ratings
-- Structure: { originality: 1-5, rigor: 1-5, clarity: 1-5, significance: 1-5 }

ALTER TABLE public.reviewer_assignments ADD COLUMN IF NOT EXISTS scores jsonb;
