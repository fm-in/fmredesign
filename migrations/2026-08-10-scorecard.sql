-- ============================================================================
-- Marketing health scorecard submissions
-- ============================================================================
-- A public, self-serve diagnostic. A visitor answers ~11 questions, gets a
-- score and a written report, and gives us an email address to send it to.
--
-- Deliberately NOT written into `leads`. A completed scorecard is interest,
-- not an enquiry; mixing the two would inflate the pipeline and make the one
-- number worth watching -- genuine inbound enquiries -- meaningless. Admin
-- converts a submission to a lead by hand, and `lead_id` records that it
-- happened.
--
-- Only `answers` is authoritative. `overall_score`, `band` and
-- `dimension_scores` are derived server-side from those answers by
-- src/lib/scorecard/scoring.ts and stored so the report can be reproduced
-- exactly as the visitor saw it, even after the question set is edited.
-- The client's own arithmetic is never trusted or persisted.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.scorecard_submissions (
  id                text PRIMARY KEY,

  -- Contact
  name              text NOT NULL,
  email             text NOT NULL,
  company           text,
  phone             text,

  -- Submission
  answers           jsonb NOT NULL,
  overall_score     integer NOT NULL,
  band              text NOT NULL,
  dimension_scores  jsonb NOT NULL,

  -- Which revision of the question set produced this. Without it, a report
  -- regenerated after an edit to questions.ts would silently disagree with
  -- the one the visitor was shown.
  question_set_version text NOT NULL DEFAULT 'v1',

  -- Workflow
  status            text NOT NULL DEFAULT 'new',
  lead_id           text REFERENCES public.leads(id) ON DELETE SET NULL,
  notes             text,

  -- Attribution. See migrations/2026-08-10-capture-metadata.sql for why this
  -- is captured at write time and cannot be added later.
  ip_address        text,
  user_agent        text,

  created_at        timestamp with time zone NOT NULL DEFAULT now(),
  updated_at        timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scorecard_submissions_created_at_idx
  ON public.scorecard_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS scorecard_submissions_email_idx
  ON public.scorecard_submissions (lower(email));

CREATE INDEX IF NOT EXISTS scorecard_submissions_status_idx
  ON public.scorecard_submissions (status);

-- ----------------------------------------------------------------------------
-- Row level security
-- ----------------------------------------------------------------------------
-- MANDATORY. A table created here without this is readable by `anon` -- every
-- submission, including names, emails and phone numbers, exposed through the
-- public PostgREST endpoint. The service role bypasses RLS, which is what the
-- API routes use, so enabling it costs nothing and closes the hole.
ALTER TABLE public.scorecard_submissions ENABLE ROW LEVEL SECURITY;

-- No policies are defined on purpose: with RLS enabled and no policy, anon and
-- authenticated can do nothing at all. Every legitimate read and write goes
-- through getSupabaseAdmin() (service role), which is not subject to RLS.
