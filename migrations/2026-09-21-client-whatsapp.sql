-- ---------------------------------------------------------------------------
-- Knowing a client by the number they message from.
--
-- `clients.phone` already exists, but it is free text: "+91 98765 43210",
-- "09876543210", "98765-43210 (Priya)". A webhook hands us "919876543210" and
-- nothing matches. Leads solved this with `phone_e164` in
-- 2026-09-15-sales-foundation.sql; this is the same column for clients, done
-- the same way so one resolver can read both.
--
-- Apply in the Supabase SQL editor. Safe to re-run.
-- ---------------------------------------------------------------------------

alter table public.clients
  add column if not exists phone_e164 text;

-- Best-effort backfill, matching the leads migration exactly.
--
-- It handles the two shapes that are unambiguous: a bare ten-digit Indian
-- mobile, and twelve digits already starting 91. Anything else — a landline
-- with an STD code, an international client, a cell holding two numbers — is
-- left null on purpose. A wrong number here does not fail silently: it shows
-- one client the invoice position of another, so a gap is the safer error.
update public.clients
set phone_e164 = case
  when length(regexp_replace(phone, '\D', '', 'g')) = 10
    then '+91' || regexp_replace(phone, '\D', '', 'g')
  when length(regexp_replace(phone, '\D', '', 'g')) = 12
    and regexp_replace(phone, '\D', '', 'g') like '91%'
    then '+' || regexp_replace(phone, '\D', '', 'g')
  else null
end
where phone_e164 is null and phone is not null;

create index if not exists clients_phone_e164_lookup_idx
  on public.clients (phone_e164) where phone_e164 is not null;

-- ---------------------------------------------------------------------------
-- Afterwards, check how far the backfill got and what it could not read:
--
--   select count(*) filter (where phone_e164 is not null) as matched,
--          count(*) filter (where phone is not null and phone_e164 is null) as unreadable,
--          count(*) filter (where phone is null) as no_number
--   from public.clients;
--
--   select id, name, phone from public.clients
--   where phone is not null and phone_e164 is null;
--
-- Two numbers resolving to the same E.164 would let either client see the
-- other's position, so this should return nothing:
--
--   select phone_e164, count(*), array_agg(name)
--   from public.clients where phone_e164 is not null
--   group by phone_e164 having count(*) > 1;
-- ---------------------------------------------------------------------------
