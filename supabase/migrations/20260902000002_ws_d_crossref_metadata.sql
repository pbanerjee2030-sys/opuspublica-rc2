-- WORKSTREAM D — Crossref Technical Integration: Metadata Schema
--
-- Authority: rc2-post-remediation-governance-decisions.md §5
--
-- Creates structured metadata tables for Crossref deposit generation.
-- Deposit is triggered ONLY by successful Release Gate authorization.

-- ─────────────────────────────────────────────────────────────────────────────
-- Structured Article Authors (with ORCID authentication flag)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.article_authors_structured (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id              UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    author_order            INTEGER NOT NULL DEFAULT 0,
    given_name              TEXT NOT NULL,
    family_name             TEXT NOT NULL,
    orcid                   TEXT,
    orcid_authenticated     BOOLEAN NOT NULL DEFAULT false,
    email                   TEXT,
    corresponding           BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_struct_authors_article ON public.article_authors_structured(article_id);
CREATE INDEX IF NOT EXISTS idx_struct_authors_orcid ON public.article_authors_structured(orcid) WHERE orcid IS NOT NULL;

ALTER TABLE public.article_authors_structured ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on article_authors_structured" ON public.article_authors_structured
    FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on article_authors_structured" ON public.article_authors_structured
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Author Affiliations (ROR-linked)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.author_affiliations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID NOT NULL REFERENCES public.article_authors_structured(id) ON DELETE CASCADE,
    institution     TEXT NOT NULL,
    ror_id          TEXT,
    department      TEXT,
    country         TEXT,
    city            TEXT,
    affiliation_order INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliations_author ON public.author_affiliations(author_id);

ALTER TABLE public.author_affiliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on author_affiliations" ON public.author_affiliations
    FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on author_affiliations" ON public.author_affiliations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Article References (structured, DOI-linked)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.article_references (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id      UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    reference_order INTEGER NOT NULL DEFAULT 0,
    citation_text   TEXT NOT NULL,
    doi             TEXT,
    title           TEXT,
    authors_text    TEXT,
    journal_title   TEXT,
    year            INTEGER,
    volume          TEXT,
    issue           TEXT,
    pages           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_references_article ON public.article_references(article_id);

ALTER TABLE public.article_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on article_references" ON public.article_references
    FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on article_references" ON public.article_references
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Article Funding (Crossref Funder Registry)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.article_funding (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id      UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    funder_name     TEXT NOT NULL,
    funder_doi      TEXT,
    award_number    TEXT,
    award_title     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funding_article ON public.article_funding(article_id);

ALTER TABLE public.article_funding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on article_funding" ON public.article_funding
    FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on article_funding" ON public.article_funding
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Article License + Journal Compliance Fields
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS license_url TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS license_type TEXT DEFAULT 'CC-BY';

ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS publisher_name TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS peer_review_model TEXT DEFAULT 'double-blind';
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS publication_frequency TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS apc_policy TEXT DEFAULT 'no_apc';
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS waiver_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS copyright_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS plagiarism_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS ethics_statement TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS correction_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS retraction_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS appeals_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS complaints_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS preservation_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS editorial_board JSONB;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS doi_prefix TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Crossref Deposit Queue
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.crossref_deposit_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id      UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    authorization_id TEXT NOT NULL,
    deposit_status  TEXT NOT NULL DEFAULT 'pending' CHECK (deposit_status IN (
                        'pending', 'depositing', 'confirmed', 'failed', 'redeposit'
                    )),
    deposit_xml     TEXT,
    crossref_response TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_retries     INTEGER NOT NULL DEFAULT 5,
    last_error      TEXT,
    deposited_at    TIMESTAMPTZ,
    confirmed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crossref_queue_article ON public.crossref_deposit_queue(article_id);
CREATE INDEX IF NOT EXISTS idx_crossref_queue_status ON public.crossref_deposit_queue(deposit_status);

ALTER TABLE public.crossref_deposit_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admins ALL on crossref_deposit_queue" ON public.crossref_deposit_queue
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
