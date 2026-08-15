-- ============================================================================
-- Fix: resources unique indexes must be TOTAL, not partial
-- ============================================================================
-- 2026-08-13-resources.sql created these as partial indexes:
--
--   CREATE UNIQUE INDEX resources_source_url_key
--     ON public.resources (source_url) WHERE source_url IS NOT NULL;
--
-- The first live ingestion failed on all 17 feeds with:
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
--
-- Postgres will not use a PARTIAL index to infer an ON CONFLICT target unless
-- the statement repeats the same WHERE predicate, and PostgREST's upsert does
-- not emit one. So `upsert(..., { onConflict: 'source_url' })` had nothing to
-- match and every insert was rejected.
--
-- The partial predicate was also unnecessary. The original comment claimed a
-- plain UNIQUE "would collapse all the NULLs" — that is true of some engines
-- but NOT of PostgreSQL, where NULLs are distinct in a unique index by
-- default. Many rows may hold NULL slug or NULL source_url under a total
-- unique index; news rows have no slug and original posts have no source_url,
-- and both remain perfectly legal.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

DROP INDEX IF EXISTS public.resources_slug_key;
DROP INDEX IF EXISTS public.resources_source_url_key;

-- Total, not partial. NULLs stay distinct, so multiple NULLs are still fine.
CREATE UNIQUE INDEX IF NOT EXISTS resources_slug_key
  ON public.resources (slug);

CREATE UNIQUE INDEX IF NOT EXISTS resources_source_url_key
  ON public.resources (source_url);
