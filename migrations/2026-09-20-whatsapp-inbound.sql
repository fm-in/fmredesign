-- WhatsApp inbound: a source for leads that arrive by message, and a
-- per-channel do-not-contact list.
--
-- Apply before deploying the inbound handler.

-- 1. `whatsapp` becomes a lead source.
--    Someone who messages the business number without ever filling a form is
--    a lead, and `ingestLead` is the only way a lead may be created — so the
--    constraint has to allow the value before the handler can use it.
alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads add constraint leads_source_check check (source in (
  'website_form', 'referral', 'social_media', 'google_ads', 'cold_outreach', 'event', 'partner', 'other',
  'meta_lead_ads', 'google_lead_form', 'connector', 'cal_booking', 'scorecard', 'whatsapp'
)) not valid;

-- 2. The do-not-contact list gains a channel.
--
--    It was built as "one do-not-contact list for every channel", which was
--    right while email was the only channel. With two, it silently overreaches:
--    `sendSalesEmail` calls `isSuppressed({ email, phoneE164 })`, which returns
--    true if EITHER identifier is listed. So a WhatsApp "STOP" — stored against
--    phone_e164 — would also stop that person's email. Someone asking us to
--    stop messaging them on WhatsApp has not asked us to stop sending their
--    invoice.
--
--    NULL keeps the old meaning: suppressed everywhere. Only channel-specific
--    opt-outs set a value, so existing rows need no backfill.
alter table public.suppression_list add column if not exists channel text;

alter table public.suppression_list drop constraint if exists suppression_channel_check;
alter table public.suppression_list add constraint suppression_channel_check
  check (channel is null or channel in ('email', 'whatsapp')) not valid;

-- The unique indexes below replace the unconditional ones, which would now
-- reject a WhatsApp opt-out for someone already unsubscribed from email.
drop index if exists suppression_email_uidx;
drop index if exists suppression_phone_uidx;

create unique index if not exists suppression_email_channel_uidx
  on public.suppression_list (lower(email), coalesce(channel, '*')) where email is not null;
create unique index if not exists suppression_phone_channel_uidx
  on public.suppression_list (phone_e164, coalesce(channel, '*')) where phone_e164 is not null;

-- 3. Inbound WhatsApp is matched to a lead by phone, on every message.
create index if not exists leads_phone_e164_lookup_idx
  on public.leads (phone_e164) where phone_e164 is not null;
