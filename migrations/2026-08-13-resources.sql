-- ============================================================================
-- Resources — one table for every content type the hub publishes
-- ============================================================================
-- Why one table and not several
-- -----------------------------
-- The hub serves three intents at once: professionals wanting what is latest,
-- aspiring marketers wanting to learn, and business owners wanting to
-- understand. Those want different CONTENT TYPES, not different systems.
-- Keeping them in one relation means the feed query, search, related-content,
-- sitemap and ISR wiring are written once, and adding a type later is a row
-- value rather than a migration.
--
-- `type` values in use:
--   news      aggregated headline + excerpt + outbound link. Never the full
--             article -- that is both the copyright position and the reason
--             running this stays cheap.
--   guide     original long-form, ours
--   checklist original, actionable, usually the gated download
--   template  original, downloadable
--   tool      interactive, lives at its own route (e.g. /scorecard)
--   glossary  short explainer, for people learning the vocabulary
--
-- Layering (borrowed from a reference implementation that learned it the
-- hard way):
--   Layer 1  keyword relevance scoring -- works with no API key at all
--   Layer 2  entity dedup, so one press release is not eight identical cards
--   Layer 3  LLM enrichment -- EVERY llm_* column is NULLABLE, so the whole
--            pipeline runs without an API key and nothing breaks. Ship
--            without AI, add it later.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resources (
  id                text PRIMARY KEY,
  type              text NOT NULL,

  -- Original content is addressed by slug; aggregated news links out instead,
  -- so slug is nullable and unique only where present.
  slug              text,
  title             text NOT NULL,
  excerpt           text,
  body_html         text,

  -- Aggregation. `source_url` is the dedup primitive: upsert on it and a
  -- re-run of the scraper is idempotent rather than duplicating the feed.
  source_url        text,
  source_name       text,
  source_logo_url   text,

  -- Classification
  category          text,
  tags              jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Which of the three intents this serves. An array because a good piece
  -- often serves two.
  audience          jsonb NOT NULL DEFAULT '[]'::jsonb,
  region            text,

  -- Editorial
  status            text NOT NULL DEFAULT 'published',
  featured          boolean NOT NULL DEFAULT false,
  cover_image_url   text,
  read_minutes      integer,
  author_name       text,

  -- Layer 1 — keyword relevance, computed by src/config/scrapers.ts
  relevance_score   integer,

  -- Layer 2 — entity dedup. `duplicate_of` NULL means this row is canonical.
  -- Feed queries return canonicals only; the rest can power "also covered by".
  dedup_key         text,
  duplicate_of      text REFERENCES public.resources(id) ON DELETE SET NULL,

  -- Layer 3 — LLM enrichment. ALL NULLABLE, ALL OPTIONAL.
  llm_relevance     integer,
  llm_audience      text,
  llm_actionability text,
  llm_summary       text,
  llm_model         text,
  llm_scored_at     timestamp with time zone,

  -- SEO
  seo_title         text,
  seo_description   text,

  published_at      timestamp with time zone,
  scraped_at        timestamp with time zone,
  created_at        timestamp with time zone NOT NULL DEFAULT now(),
  updated_at        timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique only where present: many news rows have no slug, many original
-- pieces have no source_url. A plain UNIQUE would collapse all the NULLs in
-- some engines and blocks nothing useful here.
CREATE UNIQUE INDEX IF NOT EXISTS resources_slug_key
  ON public.resources (slug) WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS resources_source_url_key
  ON public.resources (source_url) WHERE source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS resources_type_status_published_idx
  ON public.resources (type, status, published_at DESC);

CREATE INDEX IF NOT EXISTS resources_published_at_idx
  ON public.resources (published_at DESC) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS resources_dedup_key_idx
  ON public.resources (dedup_key) WHERE dedup_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS resources_duplicate_of_idx
  ON public.resources (duplicate_of) WHERE duplicate_of IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Feed health
-- ----------------------------------------------------------------------------
-- The feed LIST lives in src/config/scrapers.ts, because a change to that file
-- is the moderation action and should ship via PR. This table holds only the
-- runtime state that code cannot know: whether a feed answered, and when it
-- last produced anything.
--
-- A feed that dies silently is the classic failure of an aggregator -- the
-- site keeps working, just with progressively less in it, and nobody notices
-- for months.
CREATE TABLE IF NOT EXISTS public.resource_feed_health (
  feed_id           text PRIMARY KEY,
  last_checked_at   timestamp with time zone,
  last_success_at   timestamp with time zone,
  last_item_at      timestamp with time zone,
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_error        text,
  items_last_run    integer,
  updated_at        timestamp with time zone NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Row level security
-- ----------------------------------------------------------------------------
-- MANDATORY. Without this, a table created here is readable and writable by
-- `anon` through the public PostgREST endpoint. Reads go through a view or
-- the service role; writes are service-role only.
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_feed_health ENABLE ROW LEVEL SECURITY;

-- Published resources are public BY DESIGN, so this one table does get a
-- read policy rather than routing every public page through the service role.
-- Drafts, scheduled and archived rows stay invisible.
DROP POLICY IF EXISTS resources_public_read ON public.resources;
CREATE POLICY resources_public_read ON public.resources
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND duplicate_of IS NULL);

-- No policy on resource_feed_health: operational data, service role only.
