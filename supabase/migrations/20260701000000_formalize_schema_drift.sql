ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS orcid text;

ALTER TABLE public.article_authors
ADD COLUMN IF NOT EXISTS co_author_orcid text;
