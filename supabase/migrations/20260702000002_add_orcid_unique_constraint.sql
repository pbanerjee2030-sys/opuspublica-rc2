-- Mission 9 follow-up: enforce ORCID uniqueness at the database level.
-- The callback route (app/api/auth/orcid/callback/route.ts) already checks
-- uniqueness in application code before writing, but that check-then-write
-- is not atomic: two simultaneous callbacks could both pass the check
-- before either commits, letting two profiles claim the same ORCID iD.
-- This constraint closes that race condition as a second, authoritative
-- line of defense. Safe to re-run.

-- Partial unique index (not a table-level UNIQUE constraint) so that
-- multiple profiles with orcid = NULL (i.e. not yet connected) remain
-- valid — Postgres treats NULLs as distinct under UNIQUE, but a plain
-- UNIQUE constraint on a nullable text column is the same behavior;
-- using a partial index here to be explicit and to keep it easy to drop
-- independently of the column definition if needed.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_orcid_unique
    ON public.profiles (orcid)
    WHERE orcid IS NOT NULL;

-- If the app-level check and this index ever disagree (e.g. this index
-- fails to apply because duplicate orcid values already exist in the
-- table), the CREATE UNIQUE INDEX statement above will fail loudly with
-- a clear Postgres error identifying the conflicting rows — run this
-- first to check before applying, if you have any doubt:
--
-- SELECT orcid, array_agg(id) FROM public.profiles
-- WHERE orcid IS NOT NULL GROUP BY orcid HAVING count(*) > 1;
