-- ---------------------------------------------------------------------------
-- The numbers the first backfill could not read.
--
-- 2026-09-21-client-whatsapp.sql only handled the two unambiguous Indian
-- shapes, so a client stored as "+44 790-333-2774" was left null. A number
-- that already carries its own "+" has told us its country code — there is
-- nothing to infer and nothing to guess at, so it can be normalised by
-- stripping everything that is not a digit.
--
-- Deliberately still narrow: a number with no "+" and not ten digits is left
-- alone, because "0223456789" could be an Indian landline with an STD code or
-- a number from anywhere, and a wrong match shows one client another's
-- invoice position.
--
-- Apply in the Supabase SQL editor. Safe to re-run.
-- ---------------------------------------------------------------------------

update public.clients
set phone_e164 = '+' || regexp_replace(phone, '\D', '', 'g')
where phone_e164 is null
  and phone like '+%'
  -- E.164 allows 7 to 15 digits. Anything outside that is not a phone number.
  and length(regexp_replace(phone, '\D', '', 'g')) between 7 and 15;

-- ---------------------------------------------------------------------------
-- What is left unreadable afterwards, if anything:
--
--   select id, name, phone from public.clients
--   where phone is not null and phone_e164 is null;
-- ---------------------------------------------------------------------------
