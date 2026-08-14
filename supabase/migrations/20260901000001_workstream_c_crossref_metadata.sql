-- WORKSTREAM C — Crossref Readiness: Article metadata fields
-- Adds: authors structured data, affiliations, references, funding, license, relationships

-- ─────────────────────────────────────────────────────────────────────────────
-- Article Authors (structured, not just junction table)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.article_authors_structured (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id      UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    author_order    INTEGER NOT NULL DEFAULT 0,
    given_name      TEXT NOT NULL,
    family_name     TEXT NOT NULL,
    orcid           TEXT, -- ORCID iD (authenticated only — see ORCID auth column)
    orcid_authenticated BOOLEAN NOT NULL DEFAULT false,
    email           TEXT,
    corresponding   BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_authors_article ON public.article_authors_structured(article_id);
CREATE INDEX IF NOT EXISTS idx_article_authors_orcid ON public.article_authors_structured(orcid) WHERE orcid IS NOT NULL;

ALTER TABLE public.article_authors_structured ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on article_authors_structured" ON public.article_authors_structured FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on article_authors_structured" ON public.article_authors_structured FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Author Affiliations
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.author_affiliations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID NOT NULL REFERENCES public.article_authors_structured(id) ON DELETE CASCADE,
    institution     TEXT NOT NULL,
    ror_id          TEXT, -- Research Organization Registry ID
    department      TEXT,
    country         TEXT,
    city            TEXT,
    author_order    INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_author_affiliations_author ON public.author_affiliations(author_id);

ALTER TABLE public.author_affiliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on author_affiliations" ON public.author_affiliations FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on author_affiliations" ON public.author_affiliations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Article References
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.article_references (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id      UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    reference_order INTEGER NOT NULL DEFAULT 0,
    citation_text   TEXT NOT NULL, -- Full citation text
    doi             TEXT, -- If the reference has a DOI
    title           TEXT,
    authors         TEXT, -- Semicolon-separated author names
    journal_title   TEXT,
    year            INTEGER,
    volume          TEXT,
    issue           TEXT,
    pages           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_references_article ON public.article_references(article_id);

ALTER TABLE public.article_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on article_references" ON public.article_references FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on article_references" ON public.article_references FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Article Funding Information
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.article_funding (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id      UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    funder_name     TEXT NOT NULL,
    funder_doi      TEXT, -- Crossref Funder Registry DOI
    award_number    TEXT,
    award_title     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_funding_article ON public.article_funding(article_id);

ALTER TABLE public.article_funding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on article_funding" ON public.article_funding FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on article_funding" ON public.article_funding FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Article License Information
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS license_url TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS license_type TEXT DEFAULT 'CC-BY'
    CHECK (license_type IN ('CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'CC-BY-ND', 'CC-BY-NC-SA', 'CC-BY-NC-ND', 'CC0', 'custom'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Article Relationships (corrections, retractions, expressions of concern)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.article_relationships (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_article_id   UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    target_article_id   UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    relationship_type   TEXT NOT NULL CHECK (relationship_type IN (
                            'isCorrectionOf',
                            'isRetractionOf',
                            'isExpressionOfConcernOf',
                            'isCommentOn',
                            'isReplyTo',
                            'isBasedOn',
                            'hasRelated',
                            'isSupplementTo',
                            'isPreprintOf',
                            'isVersionOf',
                            'isTranslationOf'
                        )),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_not_self CHECK (source_article_id != target_article_id)
);

CREATE INDEX IF NOT EXISTS idx_article_rel_source ON public.article_relationships(source_article_id);
CREATE INDEX IF NOT EXISTS idx_article_rel_target ON public.article_relationships(target_article_id);

ALTER TABLE public.article_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on article_relationships" ON public.article_relationships FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on article_relationships" ON public.article_relationships FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Journal compliance metadata fields
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS publisher_name TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS peer_review_model TEXT DEFAULT 'double-blind'
    CHECK (peer_review_model IN ('double-blind', 'single-blind', 'open', 'post-publication'));
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS publication_frequency TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS apc_policy TEXT DEFAULT 'no_apc'; -- Diamond OA
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS waiver_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS copyright_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS plagiarism_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS ethics_statement TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS correction_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS retraction_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS appeals_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS complaints_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS preservation_policy TEXT;
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS editorial_board JSONB; -- array of {name, affiliation, role}
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS doi_prefix TEXT;
