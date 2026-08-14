-- WORKSTREAM A — Historical Publication Provenance
--
-- Authority: rc2-post-remediation-governance-decisions.md §2
--
-- INVARIANT: articles.published_at continues to represent the actual
-- system-level online publication event. Historical dates are
-- independent governed assertions in a separate table.
--
-- Crossref mapping preserves online vs print/historical semantics.

CREATE TABLE IF NOT EXISTS public.publication_dates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id          UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    book_id            UUID,
    date_type           TEXT NOT NULL CHECK (date_type IN (
                            'print_publication',
                            'online_publication',
                            'issue_publication',
                            'doi_registration',
                            'doi_deposit',
                            'crossref_deposit',
                            'first_online',
                            'issued'
                        )),
    date_value          DATE NOT NULL,
    source              TEXT NOT NULL CHECK (source IN (
                            'author', 'editor', 'crossref',
                            'historical_record', 'admin', 'system'
                        )),
    evidence            TEXT,
    asserting_authority UUID REFERENCES public.profiles(id),
    assertion_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN (
                            'pending', 'verified', 'rejected'
                        )),
    superseded_by       UUID REFERENCES public.publication_dates(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_target CHECK (article_id IS NOT NULL OR book_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_pub_dates_article ON public.publication_dates(article_id);
CREATE INDEX IF NOT EXISTS idx_pub_dates_type ON public.publication_dates(date_type);
CREATE INDEX IF NOT EXISTS idx_pub_dates_authoritative ON public.publication_dates(verification_status) WHERE verification_status = 'verified';

ALTER TABLE public.publication_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on publication_dates" ON public.publication_dates
    FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on publication_dates" ON public.publication_dates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
    );
