-- WORKSTREAM B — Ethics / Article Lifecycle (Append-Only Events)
--
-- Authority: rc2-post-remediation-governance-decisions.md §1
--
-- CRITICAL: Does NOT alter the certified articles.status state model.
-- Does NOT add retracted/withdrawn/corrected/expression_of_concern to the
-- frozen ArticleStatus state machine.
--
-- Implements an APPROVED append-only ethics/publication event stream.
-- The current scholarly-record state is DERIVED from the event history.

CREATE TABLE IF NOT EXISTS public.article_lifecycle_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id          UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    event_type          TEXT NOT NULL CHECK (event_type IN (
                            'CORRECTION',
                            'RETRACTION',
                            'EXPRESSION_OF_CONCERN',
                            'WITHDRAWAL'
                        )),
    effective_date      DATE NOT NULL,
    authority           UUID REFERENCES public.profiles(id),
    evidence            TEXT,
    rationale           TEXT,
    related_article_id  UUID REFERENCES public.articles(id),
    prior_event_id      UUID REFERENCES public.article_lifecycle_events(id),
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_article ON public.article_lifecycle_events(article_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_type ON public.article_lifecycle_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_active ON public.article_lifecycle_events(article_id, is_active) WHERE is_active = true;

ALTER TABLE public.article_lifecycle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public SELECT on article_lifecycle_events" ON public.article_lifecycle_events
    FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on article_lifecycle_events" ON public.article_lifecycle_events
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Article Relationships (Crossref relationship types)
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
CREATE POLICY "Allow public SELECT on article_relationships" ON public.article_relationships
    FOR SELECT USING (true);
CREATE POLICY "Allow admins and editors ALL on article_relationships" ON public.article_relationships
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
    );
