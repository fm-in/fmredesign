# Sales Automation — Phase 0 + 1 Design

- **Date:** 2026-09-15
- **Branch:** `feat/sales-foundation` (stacked on `design/system-consolidation`)
- **Status:** Architecture + data model approved in chat; this document is the full spec for review.

## Goal

Every inbound lead — website, ads, bookings — lands in one pipeline, gets an owner and a
first response within minutes, is followed up automatically until it replies or books, and
every touch is visible on one timeline. Built natively on the existing stack
(Supabase, Inngest, Resend, Cal.com, existing AI providers). AgentWorks and Observatory are
not dependencies.

**Principle:** simple, reliable pieces. One intake function, one timeline, one sequence, one
settings switch. Anything that can wait for a later phase does.

## Scope

**In:** Phase 0 fixes; lead intake from website forms, Meta Lead Ads, Google Ads (incl.
YouTube) lead forms, Cal.com, and a generic connector webhook (Zapier/Make — LinkedIn until
Lead Sync is approved, Quora, Snapchat, JustDial, IndiaMART); owner assignment; AI lead
brief; instant email reply + one follow-up sequence; reply/bounce handling; tasks with
drafted messages for human-sent channels; meetings + pre-call brief; lead detail page;
unsubscribe; sales settings.

**Out (later phases):** WhatsApp Cloud API automation (needs Meta business verification +
coexistence onboarding first — Phase 1 uses one-click WhatsApp drafts sent from the Business
app), Instagram inbound, cold email tool, outbound prospecting, proposal view tracking,
reporting, AgentWorks chat leads (its widget has no outgoing webhook), Reddit (native lead
forms are being discontinued).

## 1. Data model

One migration: `migrations/2026-09-15-sales-foundation.sql`, applied by hand in the Supabase
SQL editor **before** the code deploys. IDs follow the existing `prefix_<base36 time>_<random>`
text convention.

### Changes to existing tables

**`leads`**
- Drop NOT NULL on `company`, `project_description`, `primary_challenge` (ad and booking
  leads don't have them).
- Add `owner_id text` (an `authorized_users.id`, or `system-admin`; no FK, matching existing
  style). Backfill from `assigned_to` by name; `assigned_to` stays in sync for now.
- Attribution: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`,
  `landing_page`, `referrer`, `gclid`, `fbclid`, `source_detail` (campaign/form name),
  `external_source_id` (platform lead id).
- Contact: `phone_e164`.
- Consent: `consent_basis` (`inbound_request` | `consent` | `none`), `consent_evidence jsonb`
  (form id/text, ad form id, IP, timestamp), `consent_captured_at`.
- Pipeline: `deal_value numeric`, `currency`, `lost_reason`, `first_response_at`,
  `last_activity_at`, `stage_changed_at`.
- Sequence state (one active sequence per lead): `sequence_key`, `sequence_step`,
  `sequence_status` (`active` | `completed` | `stopped`), `sequence_stop_reason`.
- Replace the `source` CHECK with: existing values + `meta_lead_ads`, `google_lead_form`,
  `connector`, `cal_booking`, `scorecard`.
- Indexes: `lower(email)`, `phone_e164`, `(source, external_source_id)`, `owner_id`.

**`webhook_logs`** — add `external_id text` + unique index on `(provider, external_id)` where
`external_id is not null`. Used for idempotency of sales webhooks.

**`authorized_users`** — add `in_sales_rotation boolean default false`.

**`admin_settings`** — add `sales jsonb` with
`{ automationEnabled: false, bookingLink: 'fm-in/15min' }`.

### New tables

| Table | Columns (key ones) |
|---|---|
| `lead_activities` | `id`, `lead_id`, `type` (note, form_submitted, email_sent, email_received, email_bounced, task_created, task_completed, meeting_booked, meeting_rescheduled, meeting_cancelled, meeting_completed, stage_changed, owner_changed, ai_brief, unsubscribed), `channel`, `direction` (in/out), `subject`, `body`, `metadata jsonb`, `provider_message_id`, `actor_id`, `actor_name`, `occurred_at`, `created_at`. Append-only. Index `(lead_id, occurred_at desc)`, `provider_message_id`. The existing `notes` text is migrated in as the first `note` activity. |
| `sales_tasks` | `id`, `lead_id`, `owner_id`, `type` (call, whatsapp, linkedin, instagram, email, follow_up, custom), `title`, `draft_body`, `due_at`, `status` (open, done, skipped), `completed_at`, `completed_by`, `created_by`, `created_at`. Index `(owner_id, status, due_at)`. |
| `meetings` | `id`, `lead_id`, `provider` (`calcom`), `external_uid` unique, `title`, `starts_at`, `ends_at`, `status` (booked, cancelled, completed, no_show), `meeting_url`, `attendee_email`, `owner_id`, `raw jsonb`, `created_at`, `updated_at`. |
| `suppression_list` | `id`, `email` (lowercased, unique when not null), `phone_e164` (unique when not null), `reason` (unsubscribed, bounced, complaint, deletion_request, manual), `lead_id`, `created_at`. |

## 2. Intake

### `ingestLead(input, context)` — `src/lib/sales/intake/ingest.ts`

The single entry point. Every source produces a `LeadInput`
(`name`, `email?`, `phone?`, `company?`, `message?`, `source`, `sourceDetail?`,
`externalSourceId?`, attribution fields, `consent`, `customFields?`, `raw?`) and calls it.

1. **Normalise:** trim, lowercase email, phone → E.164 (default country India).
2. **Reject** if neither email nor phone is present.
3. **Match an existing lead** (not `archived`), in order: `(source, external_source_id)` →
   email → `phone_e164`.
   - **Match:** fill empty fields only, record a `form_submitted` activity, bump
     `last_activity_at`, emit `sales/lead.resubmitted`. Stage and owner are untouched.
   - **No match:** insert with status `new`, consent fields and attribution; record a
     `form_submitted` activity; emit `sales/lead.created`.
4. Return `{ leadId, created }`.

Pure helpers (`normalise`, `matchOrder`, `mergeEmptyFields`) are separated from the DB calls
so they can be unit-tested.

### Sources

All sales webhooks live in one route, `src/app/api/webhooks/sales/[source]/route.ts`, backed
by a small adapter registry in `src/lib/sales/intake/adapters/`. Each adapter exports
`verify(request, rawBody)` and `handle(payload)`. The route: verify → log to `webhook_logs`
(provider `sales:<source>`, `external_id`) → duplicate `external_id` returns 200 without
reprocessing → invalid signature returns 401 (never processed) → adapter handles → 200.
If the adapter's env vars are missing, the route returns 503 `not configured`.

| Source | Entry + verification | Behaviour |
|---|---|---|
| Website forms | Existing `/api/leads` POST (contact, get-started) | Adds the missing `checkSpam`, sends first-touch attribution, calls `ingestLead` with `consent_basis = inbound_request` and the form's consent text as evidence. |
| Scorecard | Existing admin "To lead" action | Calls `ingestLead` with `source = scorecard`. |
| Meta Lead Ads | `GET/POST /api/webhooks/sales/meta`. GET answers `hub.challenge` using `META_LEADS_VERIFY_TOKEN`. POST verifies `X-Hub-Signature-256` with `META_APP_SECRET`. | Each `leadgen` change emits Inngest `sales/meta.leadgen`. The function loads the Page token from `social_accounts` by `page_id` (`decryptToken`), fetches `/{leadgen_id}?fields=field_data,created_time,ad_name,campaign_name,form_id`, maps `full_name`, `email`, `phone_number`, `company_name`, and puts the other answers in `custom_fields`. Fetching in Inngest keeps the webhook fast and retries Graph failures. |
| Google Ads / YouTube | `POST /api/webhooks/sales/google`. Verifies `google_key` equals `GOOGLE_ADS_LEAD_KEY`. | Maps `user_column_data` by `column_id`. `is_test` leads are stored with tag `test`. Dedupes on `lead_id`. Responds `200 {}`. |
| Connector (Zapier/Make) | `POST /api/webhooks/sales/connector` with `Authorization: Bearer LEAD_CONNECTOR_SECRET` (timing-safe compare). | Documented JSON body: `{ platform, externalId, name, email, phone, company, message, campaign, formName, consentText }`. `platform` goes into `source_detail`. |
| Cal.com | `POST /api/webhooks/sales/calcom`. Verifies `x-cal-signature-256` HMAC with `CALCOM_WEBHOOK_SECRET`. | See §3 Meetings. |
| Resend | `POST /api/webhooks/sales/resend`. Uses `resend.webhooks.verify()` with `RESEND_WEBHOOK_SECRET`. | See §3 Replies and bounces. |

**First-touch attribution (public site):** a small client helper stores `utm_*`, `gclid`,
`fbclid`, landing page and referrer in `localStorage` on the first visit and adds them to
form posts. `CalButton` passes `metadata[leadId]` when a lead id is known (the get-started
thank-you state), and the existing `Cal is not defined` console error is fixed.

## 3. Automation (Inngest)

Everything is gated by `admin_settings.sales.automationEnabled`. With it off, leads, owners,
briefs, tasks and meetings still work; nothing is sent to the lead.

### On `sales/lead.created` — `sales-lead-created`

1. **Score.** Existing fit score (`calculateLeadScore`) + intent points by source:
   `cal_booking` 40, ad form with budget answered 25, website form 20, scorecard 15,
   connector 10. Sets `lead_score` and `priority`.
2. **Assign owner.** Among `in_sales_rotation` users, pick the one whose most recent
   assignment is oldest. Record an `owner_changed` activity and notify the owner. No
   rotation members → leave unassigned and `notifyAdmins`.
3. **AI brief** (skipped if no AI provider is configured). Five lines: who they are, what
   they asked for, likely fit, suggested service, suggested opening line. Stored as an
   `ai_brief` activity.
4. **First-touch task** for the owner, due in 1 hour: type `whatsapp` if a phone is
   present, else `call`. `draft_body` is written by AI, or a template if AI is unavailable.
5. **If automation is on, the lead has an email, isn't suppressed, and the source isn't
   `cal_booking`:** send the instant reply and start sequence `inbound-v1`.

### Sequence `inbound-v1` — `sales-sequence-inbound-v1`

Defined in code as a list of steps. The function has
`cancelOn: sales/sequence.stop` matching `data.leadId`.

| When | Step |
|---|---|
| Immediately | Email 1: thanks, what happens next, booking link (with `metadata[leadId]`), WhatsApp link. Sets `first_response_at`. |
| +2 days | Email 2: one relevant proof point (case study or scorecard link) + booking link. |
| +4 days | Task for owner: "Call / WhatsApp follow-up", with draft. |
| +6 days | Email 3: short close-the-loop note. Sequence `completed`. |

- Before every step, a pure `shouldContinue(lead, now)` re-reads the lead and checks:
  automation on, not suppressed, no booked meeting, stage still `new` or `contacted`,
  `sequence_status = active`.
- Emails are only sent 09:00–19:00 IST; outside that, the step sleeps until 09:00.
- **`sales/sequence.stop` is sent on:** reply received, meeting booked, stage moved beyond
  `contacted`, unsubscribe, bounce/complaint, owner clicks "Stop sequence". Each sets
  `sequence_status = stopped` with a reason.
- **Every email:** from `FreakingMinds <hello@freakingminds.in>`; reply-to
  `SALES_REPLY_TO` (a Resend receiving address); `List-Unsubscribe` and
  `List-Unsubscribe-Post` headers; footer unsubscribe link; logged as `email_sent` with the
  Resend id. Templates live alongside the existing ones in `src/lib/email/send.ts`.
- **Resend policy:** these emails go only to people who contacted FreakingMinds (forms, ad
  forms, bookings). No cold email is ever sent through Resend.

### Replies and bounces — Resend webhook

- **`email.received`:** match the lead by sender email. Record `email_received` with the
  body, send `sales/sequence.stop` (reason `replied`), forward the email to the owner's
  inbox (`resend.emails.receiving.forward`), notify the owner. Unknown sender → notify
  admins only.
- **`email.bounced` / `email.complained`:** add to `suppression_list`, stop the sequence,
  record an activity, create a task "Fix contact details".

### Meetings — Cal.com webhook

- **Match the lead** by `metadata.leadId`, else attendee email, else create one via
  `ingestLead` (`source = cal_booking`, answers from booking responses).
- **`BOOKING_CREATED`:** upsert `meetings`, stage → `discovery_scheduled`, record
  `meeting_booked`, send `sales/sequence.stop` (reason `booked`), emit
  `sales/meeting.booked`.
- **`BOOKING_RESCHEDULED` / `BOOKING_CANCELLED`:** update the meeting, record the activity,
  and emit `sales/meeting.cancelled` (a reschedule then re-emits `sales/meeting.booked` so the
  prep function runs for the new time). Cancelled also creates a task "Rebook call".
- **After the call:** if Cal.com sends `MEETING_ENDED` for the event's video provider, set
  status `completed`, stage → `discovery_completed`, and create a task "Log discovery notes"
  linking to the discovery wizard pre-filled with `lead_id`. Otherwise the same task is
  created 30 minutes after `ends_at` by the meeting-prep function, and the owner marks the
  meeting completed or no-show from the lead page.
- **`sales-meeting-prep`** (on `sales/meeting.booked`, `cancelOn: sales/meeting.cancelled`
  matching `data.meetingId`): sleep until 2 hours before start → AI pre-call brief (lead,
  form answers, scorecard if linked, company website) → notification + email to the owner →
  sleep until 30 minutes after `ends_at` → create the "Log discovery notes" task if the
  meeting isn't already completed.

### Stage changes

`changeStage(leadId, to, actor, reason?)` in `src/lib/sales/activity.ts` is the only way
status changes: it updates `status` and `stage_changed_at`, records `stage_changed`, sends
`sales/sequence.stop` when moving beyond `contacted`, and emits the existing
`lead.status_changed` / `lead.converted` platform events. The existing leads PUT route and
the convert route call it.

## 4. Team screens

- **Leads list** (`/admin/leads`): owner column and filter (My leads / Unassigned / All),
  source + campaign, last activity, next task due. Rows open the detail page.
- **Lead detail** (`/admin/leads/[id]`, new):
  - **Header:** name, company, stage select, owner select, score/priority, source +
    attribution, contact status (suppressed / sequence state).
  - **Main column:** AI brief card; timeline with an "Add note" composer.
  - **Side column:** open tasks (draft text; **Open WhatsApp** opens `wa.me/<phone>` with the
    draft pre-filled; **Copy** for LinkedIn/Instagram; Done/Skip); meetings; "Stop sequence".
  - **Actions:** Convert to client, Start discovery session (pre-filled `lead_id`), Mark
    lost (reason required).
- **My Work:** a "Sales tasks" section with the current user's due and overdue tasks.
- **Settings → Sales:** automation switch, rotation members, booking link, and each
  webhook's URL with "last received" time and last error (from `webhook_logs`).
- **Public `/unsubscribe`:** HMAC-signed token (`SALES_LINK_SECRET`) → suppression entry +
  confirmation page (V2 design). A one-click POST handler serves `List-Unsubscribe-Post`.

## 5. Phase 0 fixes

1. `/api/leads` and `/api/talent` POST: add `checkSpam` (required by CLAUDE.md).
2. `/api/leads` GET: escape the search term before building the `.or()` filter.
3. `/api/admin/scorecard` and `/api/leads/analytics`: require `sales.read` / `sales.write`
   instead of login only.
4. `/api/admin/scrape-jobs/execute`: require `settings.write` (admins) instead of
   `content.write`.
5. `/api/leads/convert`: stop reading columns that don't exist (`estimated_value`, `budget`,
   `message`); use `deal_value` and `project_description`; emit `lead.converted`.
6. `/api/leads` POST: emit `lead.created` (via `ingestLead`).

## Permissions

- Add `sales.read` and `sales.write` to `src/lib/admin/permissions.ts`.
- `super_admin` / `admin`: both, all leads. `manager`: both, limited to leads they own plus
  unassigned leads. `editor` / `viewer`: none.
- Sales routes (leads, lead detail, tasks, meetings, analytics, scorecard convert, sales
  settings) use `requirePermission` with these keys. The admin layout maps `/admin/leads`
  to `sales.read`.
- Row scoping is enforced in the API (owner filter applied server-side), replacing today's
  display-name match.

## Configuration

All optional: each integration returns `not configured` until its variables exist.

| Variable | Used for |
|---|---|
| `META_APP_SECRET`, `META_LEADS_VERIFY_TOKEN` | Meta leadgen webhook |
| `GOOGLE_ADS_LEAD_KEY` | Google Ads lead form webhook |
| `LEAD_CONNECTOR_SECRET` | Zapier / Make connector |
| `CALCOM_WEBHOOK_SECRET` | Cal.com webhook |
| `RESEND_WEBHOOK_SECRET`, `SALES_REPLY_TO` | Replies, bounces, reply-to address |
| `SALES_LINK_SECRET` | Unsubscribe tokens |

**Owner setup checklist** (not code): apply the migration; Resend receiving domain (MX on a
subdomain) and webhook; Meta app with `leads_retrieval` + Page subscription and a Page token
with that scope stored via the existing social accounts flow; Google Ads lead form webhook;
Cal.com webhook; Zapier/Make zaps for other platforms; mark rotation members in Settings.

## Error handling

- Webhooks never create leads from unverified requests, and never process the same
  `external_id` twice.
- Consent and suppression are checked **at send time**, not when a step is scheduled.
- Inngest retries transient failures (Graph API, Resend). A permanent send failure records
  an activity and creates a task for the owner.
- AI failures never block intake: the brief or draft is skipped or falls back to a template.
- Every sales webhook request is logged to `webhook_logs` with its error, surfaced in
  Settings → Sales.

## Testing

- **Unit (Vitest), alongside existing `__tests__` folders:**
  - Adapter mapping from documented example payloads (Meta, Google, connector, Cal.com,
    Resend).
  - Signature verification for each source (valid, invalid, missing secret).
  - `ingestLead` pure helpers: normalisation, phone E.164, match order, merge-empty-fields.
  - Intent scoring, owner pick, `shouldContinue`, IST send-window calculation, unsubscribe
    token sign/verify, search-term escaping.
  - Route-level tests for the Phase 0 permission changes.
- **Gates:** `npx tsc --noEmit`, `npm run lint`, `npm run test:run`, `npm run build`.
- **Manual end-to-end** (after setup): Meta Lead Ads Testing Tool, Google Ads "send test
  data", a real Cal.com test booking and cancellation, replying to a sequence email, and a
  bounce to a known-bad address.

## Rollout

1. Apply the migration.
2. Deploy with `automationEnabled = false`.
3. Connect sources one at a time; confirm each in Settings → Sales and on a test lead's
   timeline.
4. Add rotation members, send one test lead through the full sequence to an internal inbox.
5. Turn automation on.
