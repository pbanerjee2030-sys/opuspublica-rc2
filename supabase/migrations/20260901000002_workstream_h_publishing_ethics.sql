-- WORKSTREAM H — Publishing Ethics: Correction/Retraction/ExpressionOfWorkflows
-- Adds: article_status values for ethics workflows + ethics_case tracking

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend article status enum for ethics workflows
-- ─────────────────────────────────────────────────────────────────────────────

-- Add new status values (if not already present — using IF NOT EXISTS pattern)
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE public.articles ALTER COLUMN status TYPE TEXT;
ALTER TABLE public.articles ADD CONSTRAINT articles_status_check CHECK (status IN (
    'draft', 'submitted', 'in_review', 'revision_requested', 'accepted',
    'rejected', 'published', 'retracted', 'corrected',
    'expression_of_concern', 'withdrawn'
));

-- ─────────────────────────────────────────────────────────────────────────────
-- Ethics Case Tracking
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ethics_cases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id          UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    case_type           TEXT NOT NULL CHECK (case_type IN (
                            'correction',
                            'retraction',
                            'expression_of_concern',
                            'withdrawal',
                            'misconduct',
                            'plagiarism',
                            'authorship_dispute',
                            'appeal',
                            'complaint',
                            'coi_disclosure'
                        )),
    status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
                            'open', 'under_investigation', 'resolved', 'dismissed', 'escalated'
                        )),
    severity            TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
    description         TEXT NOT NULL,
    reported_by         UUID, -- Profile ID (nullable for anonymous reports)
    assigned_to         UUID, -- Profile ID of responsible editor
    resolution          TEXT,
    resolution_date      TIMESTAMPTZ,
    related_article_id  UUID REFERENCES public.articles(id), -- For corrections/retractions: the new article
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ethics_cases_article ON public.ethics_cases(article_id);
CREATE INDEX IF NOT EXISTS idx_ethics_cases_status ON public.ethics_cases(status);
CREATE INDEX IF NOT EXISTS idx_ethics_cases_type ON public.ethics_cases(case_type);

ALTER TABLE public.ethics_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on ethics_cases" ON public.ethics_cases FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on ethics_cases" ON public.ethics_cases FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Ethics Case Audit Log (append-only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ethics_case_audit (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID NOT NULL REFERENCES public.ethics_cases(id) ON DELETE CASCADE,
    action          TEXT NOT NULL, -- 'created', 'status_changed', 'resolved', 'escalated', etc.
    action_by       UUID, -- Profile ID
    previous_status TEXT,
    new_status      TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ethics_audit_case ON public.ethics_case_audit(case_id);

ALTER TABLE public.ethics_case_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on ethics_case_audit" ON public.ethics_case_audit FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on ethics_case_audit" ON public.ethics_case_audit FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
