# Manual start, per-source sequences and branded email — design

**Date:** 2026-09-16
**Amends:** `docs/superpowers/specs/2026-09-15-sales-phase-0-1-design.md`
**Status:** approved by the owner (copy approved 2026-09-16; full branded treatment chosen)

## Why

Phase 0–1 starts `inbound-v1` automatically for every lead with an email address
whenever `automationEnabled` is true. The owner's decision: **no lead is ever emailed
until a person starts the follow-ups**, and each kind of enquiry gets its own email set,
because an ad-form tap and a detailed project brief do not deserve the same treatment.

The emails must also look like FreakingMinds. Today they are unstyled paragraphs.

## What changes

### 1. No automatic enrolment

`salesLeadCreatedFn` no longer sends `sales/sequence.start`. It keeps assigning an owner,
writing the AI brief and creating the first-touch task. Nothing else about intake changes.

### 2. Four sequences, recommended by source

| Source | Recommended set | Key |
|---|---|---|
| `website_form` with `customFields.formName = 'Get started'` | Project brief | `brief-v1` |
| `website_form` (contact page), `referral`, `partner`, `event`, `social_media`, `other` | Enquiry | `enquiry-v1` |
| `meta_lead_ads`, `google_lead_form`, `google_ads`, `connector` | Ad lead | `ad-lead-v1` |
| `scorecard` | Scorecard | `scorecard-v1` |
| `cal_booking` | none | — |
| any lead tagged `test`, or with no email | none | — |

`recommendSequence(lead)` is a pure function returning a key or `null`.

**Steps** (`waitBefore` is relative to the previous step):

- **`brief-v1`** — email `brief_intro` (0s) · task `call` "Call or WhatsApp about the brief" (+2d, due 4h) · email `brief_questions` (+2d) · email `brief_close` (+4d)
- **`enquiry-v1`** — email `instant_reply` (0s) · email `follow_up_proof` (+2d) · task `call` "Call or WhatsApp follow-up" (+2d, due 4h) · email `close_the_loop` (+2d)
- **`ad-lead-v1`** — email `ad_intro` (0s) · task `call` "Call the ad lead" (+1d, due 4h) · email `ad_proof` (+2d) · email `ad_close` (+4d)
- **`scorecard-v1`** — email `scorecard_intro` (0s) · email `scorecard_fix` (+3d) · email `scorecard_close` (+3d)

Existing guarantees are unchanged: 09:00–19:00 IST send window, consent and suppression
checked at send time, `automationEnabled` respected, one sequence per lead ever, and the
existing stop reasons (reply, booking, stage moved, unsubscribe, bounce, manual).

### 3. Starting a sequence

`POST /api/admin/sales/leads/[id]/sequence` gains `{ action: 'start', sequenceKey }`.
It requires `sales.write` and `canAccessLead`, and refuses with a clear message when the
lead has no email, is suppressed, has no consent basis, has already had a sequence, or when
`automationEnabled` is off. On success it sends `sales/sequence.start` with the key.

`SalesSequenceStartData` gains `sequenceKey`. `salesSequenceInboundFn` becomes
`salesSequenceFn` (`sales-sequence`), reading the key from the event and looking the steps
up in a registry. `markSequenceActive` already stores `sequence_key`.

On the lead page, a **Start follow-ups** panel shows the recommended set preselected, a
dropdown to change it, and the reason it is disabled when it is. After starting, the header
shows which set is running, as it already does for sequence state.

### 4. Branded email (full treatment)

One shell in `src/lib/sales/email-shell.ts`, used by every sales email:

- Table-based, 600px, inline styles only, explicit background colours so dark mode cannot
  invert it into something unreadable
- Header band in `#a82548` with the white wordmark (`/email/logo.png`, ~300px wide,
  generated from `public/logo-white.png`) linked to the site, with alt text — the email must
  read correctly with images blocked
- Body on white: 16px/1.6, `#2d2d2d`, generous spacing
- One magenta button, built as a padded table cell so Outlook renders it
- Footer: owner name, FreakingMinds, `COMPANY_ADDRESS`, and the unsubscribe link
- A preheader line (hidden preview text) per template
- The existing plain-text alternative stays, and `List-Unsubscribe` headers are unchanged

### 5. Booking links

`admin_settings.sales` gains `bookingLinkLong` (default `fm-in/30min`). `brief-v1` uses it;
every other set uses the existing `bookingLink`.

## Out of scope

WhatsApp steps inside sequences (the pilot lands first), per-owner From addresses,
a template management screen, and any change to intake, scoring or routing.

## Verification

Unit tests for `recommendSequence`, the registry, the start endpoint's refusals, and the
shell's rendering (images-off text, unsubscribe present, no unescaped values). A real send
to an internal address per set before automation is switched on for anything.
