-- WORKSTREAM A — Historical Publication Provenance
-- Creates: public.publication_dates table + columns for authoritative date provenance
--
-- Distinguishes: historical/print date, online date, issue/volume date, DOI deposit date,
-- system creation timestamp, system update timestamp.
-- Historical dates are NOT represented by rewriting system timestamps.

-- ─────────────────────────────────────────────────────────────────────────────
-- Publication Date Provenance Table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.publication_dates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id      UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    book_id         UUID,  -- No FK to books (books may use slug-based identity)
    date_type       TEXT NOT NULL CHECK (date_type IN (
                        'print_publication',
                        'online_publication',
                        'issue_publication',
                        'doi_registration',
                        'doi_deposit',
                        'crossref_deposit',
                        'first_online',
                        'issued'
                    )),
    date_value      DATE NOT NULL,
    source          TEXT,  -- 'author' | 'editor' | 'crossref' | 'historical_record' | 'admin'
    evidence        TEXT,  -- Free-text evidence/justification for the date
    authorized_by   UUID,  -- Profile ID of the user who authorized this date
    determined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_authoritative BOOLEAN NOT NULL DEFAULT true,
    superseded_by   UUID REFERENCES public.publication_dates(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_target CHECK (article_id IS NOT NULL OR book_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_pub_dates_article ON public.publication_dates(article_id);
CREATE INDEX IF NOT EXISTS idx_pub_dates_book ON public.publication_dates(book_id);
CREATE INDEX IF NOT EXISTS idx_pub_dates_type ON public.publication_dates(date_type);
CREATE INDEX IF NOT EXISTS idx_pub_dates_authoritative ON public.publication_dates(is_authoritative) WHERE is_authoritative = true;

ALTER TABLE public.publication_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on publication_dates" ON public.publication_dates FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on publication_dates" ON public.publication_dates FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Add DOI deposit status columns (if not already present)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS doi_deposit_status TEXT DEFAULT 'not_submitted'
    CHECK (doi_deposit_status IN ('not_submitted', 'submitted', 'confirmed', 'failed'));
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS doi_deposit_status TEXT DEFAULT 'not_submitted'
    CHECK (doi_deposit_status IN ('not_submitted', 'submitted', 'confirmed', 'failed'));
