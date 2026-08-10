-- ============================================================================
-- Capture metadata: ip_address + user_agent on public submission tables
-- ============================================================================
-- Why
-- ----
-- Every public form writes a row that we later have to judge as genuine or
-- bot. Today only `admin_audit_log` records who made a request; `leads`,
-- `enrollments` and `talent_applications` record nothing about the client.
-- That judgement CANNOT be reconstructed after the fact -- once the row is
-- written without it, the signal is gone permanently.
--
-- We already know this site has a bot problem: six enrolment attempts were
-- caught only by the Gmail dot-abuse heuristic in `src/lib/spam-guard.ts`.
-- Anything subtler than that is currently invisible.
--
-- Both columns are NULLABLE with no default, so this migration is safe to run
-- against live tables and requires no backfill. Existing rows keep NULL,
-- which correctly means "unknown", not "no IP".
--
-- Note on `user_agent`: store it RAW (length-capped in application code only).
-- Do not trim or normalise it. Malformed user-agents are themselves the
-- signal -- a known bot fleet is identifiable purely by a stray leading
-- quote character in the string.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE public.talent_applications
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Country x engagement is the cleanest bot filter, but the cheapest first cut
-- is "many rows, one IP". Partial indexes keep these off the NULL backlog.
CREATE INDEX IF NOT EXISTS leads_ip_address_idx
  ON public.leads (ip_address) WHERE ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS enrollments_ip_address_idx
  ON public.enrollments (ip_address) WHERE ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS talent_applications_ip_address_idx
  ON public.talent_applications (ip_address) WHERE ip_address IS NOT NULL;
