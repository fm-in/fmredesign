-- Sales foundation (Phase 0 + 1)
-- Spec: docs/superpowers/specs/2026-09-15-sales-phase-0-1-design.md
--
-- Apply by hand in the Supabase SQL editor BEFORE deploying the code that
-- depends on it. Safe to run more than once.

begin;

-- 1. leads: ad, booking and phone-only leads do not have these fields
alter table public.leads alter column email drop not null;
alter table public.leads alter column company drop not null;
alter table public.leads alter column project_description drop not null;
alter table public.leads alter column primary_challenge drop not null;

-- 2. leads: new columns
alter table public.leads
  add column if not exists owner_id text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists landing_page text,
  add column if not exists referrer text,
  add column if not exists gclid text,
  add column if not exists fbclid text,
  add column if not exists source_detail text,
  add column if not exists external_source_id text,
  add column if not exists phone_e164 text,
  add column if not exists consent_basis text,
  add column if not exists consent_evidence jsonb,
  add column if not exists consent_captured_at timestamptz,
  add column if not exists deal_value numeric,
  add column if not exists currency text,
  add column if not exists lost_reason text,
  add column if not exists first_response_at timestamptz,
  add column if not exists last_activity_at timestamptz,
  add column if not exists stage_changed_at timestamptz,
  add column if not exists sequence_key text,
  add column if not exists sequence_step integer,
  add column if not exists sequence_status text,
  add column if not exists sequence_stop_reason text;

-- 3. leads: replace the source CHECK (its generated name is not recorded).
--    NOT VALID skips existing rows only when the constraint is added. Every row an
--    UPDATE touches is checked again, and the backfill in step 4 updates nearly every
--    lead, so one legacy `source` value outside this list aborts the whole transaction.
--    Run this verify query first; it must return no rows (fix any it returns):
--      select source, count(*) from public.leads
--      where source not in ('website_form', 'referral', 'social_media', 'google_ads', 'cold_outreach', 'event',
--        'partner', 'other', 'meta_lead_ads', 'google_lead_form', 'connector', 'cal_booking', 'scorecard')
--      group by source;
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.leads'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%source%'
  loop
    execute format('alter table public.leads drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.leads add constraint leads_source_check check (source in (
  'website_form', 'referral', 'social_media', 'google_ads', 'cold_outreach', 'event', 'partner', 'other',
  'meta_lead_ads', 'google_lead_form', 'connector', 'cal_booking', 'scorecard'
)) not valid;

alter table public.leads drop constraint if exists leads_consent_basis_check;
alter table public.leads add constraint leads_consent_basis_check
  check (consent_basis is null or consent_basis in ('inbound_request', 'consent', 'none')) not valid;

alter table public.leads drop constraint if exists leads_sequence_status_check;
alter table public.leads add constraint leads_sequence_status_check
  check (sequence_status is null or sequence_status in ('active', 'completed', 'stopped')) not valid;

-- 4. leads: backfill
update public.leads l
set owner_id = u.id
from public.authorized_users u
where l.owner_id is null
  and l.assigned_to is not null
  and lower(trim(u.name)) = lower(trim(l.assigned_to));

update public.leads
set phone_e164 = case
  when length(regexp_replace(phone, '\D', '', 'g')) = 10
    then '+91' || regexp_replace(phone, '\D', '', 'g')
  when length(regexp_replace(phone, '\D', '', 'g')) = 12
    and regexp_replace(phone, '\D', '', 'g') like '91%'
    then '+' || regexp_replace(phone, '\D', '', 'g')
  else null
end
where phone_e164 is null and phone is not null;

update public.leads set last_activity_at = coalesce(updated_at, created_at, now()) where last_activity_at is null;
update public.leads set stage_changed_at = coalesce(updated_at, created_at, now()) where stage_changed_at is null;
update public.leads set consent_basis = 'inbound_request' where consent_basis is null and source = 'website_form';

-- 5. leads: indexes
create index if not exists leads_phone_e164_idx on public.leads (phone_e164) where phone_e164 is not null;
create unique index if not exists leads_source_external_uidx
  on public.leads (source, external_source_id) where external_source_id is not null;
create index if not exists leads_owner_idx on public.leads (owner_id);
-- Intake finds a returning person by their normalised email with an equality match.
create index if not exists leads_email_idx on public.leads (email);

-- 6. webhook_logs: idempotency key for sales webhooks
alter table public.webhook_logs add column if not exists external_id text;
create unique index if not exists webhook_logs_provider_external_uidx
  on public.webhook_logs (provider, external_id) where external_id is not null;

-- 7. team and settings
alter table public.authorized_users add column if not exists in_sales_rotation boolean not null default false;
alter table public.admin_settings add column if not exists sales jsonb not null
  default '{"automationEnabled": false, "bookingLink": "fm-in/15min"}'::jsonb;

-- 8. grant the new sales permissions to existing admins and managers
update public.authorized_users
set permissions = case
  when coalesce(trim(permissions), '') = '' then 'sales.read,sales.write'
  else permissions || ',sales.read,sales.write'
end
where role in ('admin', 'manager')
  and coalesce(permissions, '') not like '%sales.read%'
  and coalesce(permissions, '') <> 'full_access';

-- 9. new tables
create table if not exists public.lead_activities (
  id text primary key,
  lead_id text not null references public.leads(id) on delete cascade,
  type text not null,
  channel text,
  direction text check (direction is null or direction in ('in', 'out')),
  subject text,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  provider_message_id text,
  actor_id text,
  actor_name text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists lead_activities_lead_idx on public.lead_activities (lead_id, occurred_at desc);
create index if not exists lead_activities_provider_msg_idx
  on public.lead_activities (provider_message_id) where provider_message_id is not null;

create table if not exists public.sales_tasks (
  id text primary key,
  lead_id text not null references public.leads(id) on delete cascade,
  owner_id text,
  type text not null check (type in ('call', 'whatsapp', 'linkedin', 'instagram', 'email', 'follow_up', 'custom')),
  title text not null,
  draft_body text,
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'done', 'skipped')),
  completed_at timestamptz,
  completed_by text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists sales_tasks_owner_idx on public.sales_tasks (owner_id, status, due_at);
create index if not exists sales_tasks_lead_idx on public.sales_tasks (lead_id);

create table if not exists public.meetings (
  id text primary key,
  lead_id text not null references public.leads(id) on delete cascade,
  provider text not null default 'calcom',
  external_uid text not null unique,
  title text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'cancelled', 'completed', 'no_show')),
  meeting_url text,
  attendee_email text,
  owner_id text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meetings_lead_idx on public.meetings (lead_id, starts_at desc);

create table if not exists public.suppression_list (
  id text primary key,
  email text,
  phone_e164 text,
  reason text not null check (reason in ('unsubscribed', 'bounced', 'complaint', 'deletion_request', 'manual')),
  lead_id text,
  created_at timestamptz not null default now(),
  constraint suppression_has_contact check (email is not null or phone_e164 is not null)
);
create unique index if not exists suppression_email_uidx on public.suppression_list (lower(email)) where email is not null;
create unique index if not exists suppression_phone_uidx on public.suppression_list (phone_e164) where phone_e164 is not null;

-- Service-role access only; the anon key must not read any of these.
alter table public.lead_activities enable row level security;
alter table public.sales_tasks enable row level security;
alter table public.meetings enable row level security;
alter table public.suppression_list enable row level security;

-- 10. carry existing free-text notes into the timeline
insert into public.lead_activities (id, lead_id, type, body, actor_name, occurred_at)
select 'act_import_' || l.id, l.id, 'note', l.notes, 'Imported note', coalesce(l.updated_at, l.created_at, now())
from public.leads l
where coalesce(trim(l.notes), '') <> ''
on conflict (id) do nothing;

commit;

-- Verify after applying:
--   select column_name from information_schema.columns
--   where table_name = 'leads' and column_name in ('owner_id', 'phone_e164', 'sequence_status');
--   select count(*) from public.lead_activities;
