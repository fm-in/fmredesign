-- ============================================================================
-- Blog CMS — blog_posts table
-- Apply via Supabase SQL editor.
--
-- WHY: Replace the hardcoded blog-data.ts with a proper CMS. Admin creates,
-- edits and publishes posts; public /blog reads from this table.
--
-- WHAT:
--   blog_posts — one row per post (draft, published or archived).
--     body_html      — rendered HTML for the public page (fast read path).
--     body_tiptap    — ProseMirror/TipTap JSON, editor source of truth.
--     tags           — [{name, slug}] jsonb array.
--     status         — draft / published / archived.
--     source         — manual / upload-docx / upload-md (for audit).
--     ai_assisted    — boolean, true if Groq auto-filled metadata.
--
-- STORAGE: The companion Supabase Storage bucket `blog-assets` (created
-- programmatically the first time the admin uploads an image) holds
-- cover images and inline post images. Public-read.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id                  text PRIMARY KEY,
  slug                text NOT NULL UNIQUE,
  title               text NOT NULL,
  excerpt             text,
  cover_image_url     text,
  cover_image_alt     text,

  -- Body (two representations — HTML for fast public render, TipTap JSON
  -- for lossless edits in the admin editor)
  body_html           text,
  body_tiptap         jsonb,
  word_count          integer NOT NULL DEFAULT 0,
  read_minutes        integer NOT NULL DEFAULT 1,

  -- Taxonomy / metadata
  tags                jsonb,   -- [{name, slug}]
  category            text,
  author_name         text,    -- denormalised — survives author deletion
  author_id           text,    -- soft FK to authorized_users.id
  author_avatar_url   text,

  -- SEO
  seo_title           text,
  seo_description     text,
  canonical_url       text,
  og_image_url        text,

  -- Publishing
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  featured            boolean NOT NULL DEFAULT false,
  published_at        timestamptz,
  scheduled_for       timestamptz,    -- for future Phase 2 scheduling

  -- Provenance — was this created manually or via file upload?
  source              text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','upload-docx','upload-md','seeded')),
  ai_assisted         boolean NOT NULL DEFAULT false,
  source_filename     text,

  -- Meta
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status        ON public.blog_posts (status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at  ON public.blog_posts (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured      ON public.blog_posts (featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_category      ON public.blog_posts (category);


-- ──────────────────────────────────────────────────────────────────────────
-- Public view — only `published` posts, no admin-only fields. The public
-- listing API reads from this so we never leak drafts or scheduled posts.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.blog_posts_public AS
SELECT
  id, slug, title, excerpt, cover_image_url, cover_image_alt,
  body_html, word_count, read_minutes,
  tags, category, author_name, author_avatar_url,
  seo_title, seo_description, canonical_url, og_image_url,
  featured, published_at,
  created_at, updated_at
FROM public.blog_posts
WHERE status = 'published'
  AND published_at IS NOT NULL
  AND published_at <= NOW();


-- ──────────────────────────────────────────────────────────────────────────
-- Auto-stamp published_at when status transitions to 'published'.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_blog_post_publish_stamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status <> 'published' AND NEW.status = 'published'
     AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;
  IF TG_OP = 'INSERT' AND NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_post_publish_stamp ON public.blog_posts;
CREATE TRIGGER trg_blog_post_publish_stamp
BEFORE INSERT OR UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.tg_blog_post_publish_stamp();


-- ──────────────────────────────────────────────────────────────────────────
-- Storage bucket setup — must be created via the Supabase Dashboard OR
-- via the Storage API. The admin image-upload route auto-creates it on
-- first use; this is a no-op SQL hint for the human reading the file.
--
--   Bucket name : blog-assets
--   Public      : true (covers + inline images need to be GET-readable)
--   Path layout : posts/<post-id>/<filename>
--                 covers/<post-id>/<filename>
-- ──────────────────────────────────────────────────────────────────────────
