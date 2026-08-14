-- WORKSTREAM H — Local Dark Archive
--
-- Authority: rc2-post-remediation-governance-decisions.md §4
--
-- Implements a local "dark archive" using automated BagIt exports
-- to immutable cloud storage. External networks (CLOCKSS/Portico/LOCKSS)
-- remain post-launch objectives requiring organizational agreements.

CREATE TABLE IF NOT EXISTS public.preservation_packages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id          UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    book_id            UUID,
    package_type       TEXT NOT NULL CHECK (package_type IN ('article', 'book')),
    bagit_version      TEXT NOT NULL DEFAULT '1.0',
    manifest_checksum  TEXT NOT NULL,
    package_checksum   TEXT NOT NULL,
    storage_uri         TEXT NOT NULL,
    storage_provider   TEXT NOT NULL DEFAULT 'local',
    is_immutable        BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at         TIMESTAMPTZ,
    verification_result TEXT,
    CONSTRAINT chk_target CHECK (article_id IS NOT NULL OR book_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_preservation_article ON public.preservation_packages(article_id);
CREATE INDEX IF NOT EXISTS idx_preservation_book ON public.preservation_packages(book_id);

ALTER TABLE public.preservation_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admins ALL on preservation_packages" ON public.preservation_packages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
