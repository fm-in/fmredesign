-- ============================================================================
-- FM Academy — programs & enrollments
-- Apply via Supabase SQL editor.
--
-- WHY: New revenue stream — sell workshops, multi-week cohorts, self-paced
-- courses and 1:1 strategy calls. Phase 1 ships workshop + cohort; the
-- `format` column is the only thing that needs to widen to support the
-- later two formats, so the same tables work for everything.
--
-- WHAT:
--   programs     — every saleable learning product (workshop / cohort /
--                  self-paced course / 1:1 call). Admin CRUDs these via
--                  /admin/academy. Public surface at /academy and
--                  /academy/[slug].
--   enrollments  — one row per buyer × program. Phase 1 records the
--                  reservation; admin shares the Razorpay payment link
--                  manually, then flips the row to `paid`. Phase 2 will
--                  flip to `paid` automatically via a Razorpay webhook.
--
-- NAMING:
--   * `program_*` everywhere — workshops/cohorts/courses/1:1 are all
--     "programs" in code, distinguished by `format`. Keeps the URL,
--     table and admin surface uniform regardless of format.
--   * Reusable for international currencies later via a `currency` column
--     even though Phase 1 is INR-only.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- programs
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.programs (
  id                      text PRIMARY KEY,
  slug                    text NOT NULL UNIQUE,
  title                   text NOT NULL,
  format                  text NOT NULL CHECK (format IN ('workshop','cohort','self_paced','one_on_one')),
  status                  text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed','archived')),

  short_description       text,
  long_description        text,
  cover_image_url         text,

  -- Pricing
  price_inr               numeric(12,2) NOT NULL DEFAULT 0,
  early_bird_price_inr    numeric(12,2),
  early_bird_until        timestamptz,
  currency                text NOT NULL DEFAULT 'INR',

  -- Scheduling (workshop & cohort)
  starts_at               timestamptz,
  ends_at                 timestamptz,
  schedule                jsonb,     -- list of {date, time, topic}
  seats_total             integer,
  seats_taken             integer NOT NULL DEFAULT 0,

  -- Marketing content (rendered on /academy/[slug])
  outcomes                jsonb,     -- ["Learn X", "Build Y", ...]
  syllabus                jsonb,     -- [{title, items: [...]}]
  faq                     jsonb,     -- [{q, a}]
  testimonials            jsonb,     -- [{name, role, quote, image_url?}]

  -- Delivery (revealed in confirmation email after payment)
  delivery_zoom_url       text,
  delivery_whatsapp_url   text,
  delivery_notion_url     text,

  -- Instructor surface (denormalised for now — Phase 2 can link to team_members)
  instructor_name         text,
  instructor_bio          text,
  instructor_image_url    text,

  -- Payment (Phase 1 = paste a Razorpay payment link from the Razorpay
  -- dashboard. Phase 2 will replace this with proper API checkout.)
  payment_link_url        text,

  -- Meta
  created_by              text,
  created_at              timestamptz NOT NULL DEFAULT NOW(),
  updated_at              timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programs_status        ON public.programs (status);
CREATE INDEX IF NOT EXISTS idx_programs_format        ON public.programs (format);
CREATE INDEX IF NOT EXISTS idx_programs_starts_at     ON public.programs (starts_at);


-- ──────────────────────────────────────────────────────────────────────────
-- enrollments
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enrollments (
  id                      text PRIMARY KEY,
  program_id              text NOT NULL REFERENCES public.programs(id) ON DELETE RESTRICT,

  -- Buyer (could be an existing client; could be a fresh prospect — we
  -- don't require a `users` link, so anonymous purchases work cleanly.)
  buyer_name              text NOT NULL,
  buyer_email             text NOT NULL,
  buyer_phone             text,
  buyer_company           text,
  buyer_message           text,      -- "Why are you joining?" — useful pre-cohort

  -- Payment ledger
  amount_inr              numeric(12,2) NOT NULL DEFAULT 0,
  currency                text NOT NULL DEFAULT 'INR',
  razorpay_payment_id     text,
  razorpay_order_id       text,
  status                  text NOT NULL DEFAULT 'reserved' CHECK (status IN (
                            'reserved','paid','failed','refunded','cancelled'
                          )),
  payment_link_shared_at  timestamptz,
  paid_at                 timestamptz,

  -- Lifecycle
  invite_sent_at          timestamptz,
  completed_at            timestamptz,

  -- Meta
  notes                   text,      -- admin-only freeform
  created_at              timestamptz NOT NULL DEFAULT NOW(),
  updated_at              timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollments_program     ON public.enrollments (program_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status      ON public.enrollments (status);
CREATE INDEX IF NOT EXISTS idx_enrollments_buyer_email ON public.enrollments (buyer_email);
CREATE INDEX IF NOT EXISTS idx_enrollments_created_at  ON public.enrollments (created_at DESC);


-- ──────────────────────────────────────────────────────────────────────────
-- Helper view: public listing — only `open` programs with masked fields.
-- The public API selects from this view so we never accidentally leak
-- delivery URLs or admin-only fields to non-buyers.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.programs_public AS
SELECT
  id, slug, title, format, status,
  short_description, long_description, cover_image_url,
  price_inr, early_bird_price_inr, early_bird_until, currency,
  starts_at, ends_at, schedule, seats_total, seats_taken,
  outcomes, syllabus, faq, testimonials,
  instructor_name, instructor_bio, instructor_image_url,
  payment_link_url,
  created_at, updated_at
FROM public.programs
WHERE status = 'open';


-- ──────────────────────────────────────────────────────────────────────────
-- Trigger: keep `programs.seats_taken` in sync with paid enrollments.
-- A row counts toward seats_taken once it transitions to `paid` (not
-- `reserved` — reservations should not block paying customers from the
-- last seat).
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_enrollment_seats_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- New paid enrollment
  IF TG_OP = 'INSERT' AND NEW.status = 'paid' THEN
    UPDATE public.programs
       SET seats_taken = seats_taken + 1,
           updated_at  = NOW()
     WHERE id = NEW.program_id;
  END IF;

  -- Status transitions on existing enrollment
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'paid' AND NEW.status = 'paid' THEN
      UPDATE public.programs
         SET seats_taken = seats_taken + 1,
             updated_at  = NOW()
       WHERE id = NEW.program_id;
    ELSIF OLD.status = 'paid' AND NEW.status <> 'paid' THEN
      UPDATE public.programs
         SET seats_taken = GREATEST(0, seats_taken - 1),
             updated_at  = NOW()
       WHERE id = NEW.program_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_enrollment_seats_count ON public.enrollments;
CREATE TRIGGER trg_enrollment_seats_count
AFTER INSERT OR UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.tg_enrollment_seats_count();


-- ──────────────────────────────────────────────────────────────────────────
-- payment_events — Razorpay webhook idempotency ledger
--
-- WHY: Razorpay retries webhook deliveries until it sees 2xx. Without an
-- idempotency table we'd double-credit enrollments on retries. We store the
-- razorpay event id (unique) and the action we took, so a replay is a
-- no-op fast path.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_events (
  id                      text PRIMARY KEY,        -- Razorpay event id
  source                  text NOT NULL DEFAULT 'razorpay',
  event_type              text NOT NULL,           -- e.g. payment.captured
  enrollment_id           text REFERENCES public.enrollments(id) ON DELETE SET NULL,
  razorpay_order_id       text,
  razorpay_payment_id     text,
  payload                 jsonb NOT NULL,          -- full webhook body for audit
  processed_at            timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_enrollment ON public.payment_events (enrollment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_order      ON public.payment_events (razorpay_order_id);


-- ──────────────────────────────────────────────────────────────────────────
-- Smoke-test (after applying):
--
--   INSERT INTO programs (id, slug, title, format, status, price_inr,
--                         short_description, instructor_name)
--   VALUES ('prog-test-1','test-workshop','Test Workshop','workshop','draft',999,
--           'Smoke test program','FM Team');
--
--   SELECT * FROM programs WHERE id='prog-test-1';
--   DELETE FROM programs WHERE id='prog-test-1';
-- ──────────────────────────────────────────────────────────────────────────
