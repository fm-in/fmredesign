# Sales Automation — Setup

> **Apply the migration before deploying this code.** Run §1 first. Until the migration is
> applied, the website form saves enquiries the old way and no other lead source works.

> **Follow-ups are started by a person.** A new lead is assigned an owner, gets an AI-written
> brief and a first-touch task automatically — but the system never emails anyone on its own.
> Nobody hears from FreakingMinds until a person opens the lead and clicks **Start
> follow-ups**. This is the biggest change from earlier versions of this system, and it's why
> automation can be left switched on safely: nothing goes out until someone decides it should.

Everything ships switched off. Work through these in order; each step can be checked in
**Admin → Settings → Sales**.

## How follow-ups work

When a lead comes in, FreakingMinds assigns it to someone, writes an AI brief and creates a
"first touch" task — automatically, whether or not automation is on. That's all that happens
on its own. The owner then opens the lead at **Admin → Leads → (the lead's name)** and, when
ready, clicks **Start follow-ups**. Only that click sends the first email.

### The four follow-up sets

Every lead recommends one of four sets, based on where it came from. The recommendation is
preselected on the lead page, but the owner can pick a different one before starting.

| Set | Recommended for | Timing |
|---|---|---|
| **Project brief** | Get-started form submissions | Day 0: an email confirming the brief is read and inviting a 30-minute scoping call. Day 2: a task to call or WhatsApp them. Day 4: an email asking the two questions that shape the proposal. Day 8: a close-the-loop email if there's been no reply. |
| **Enquiry** | Contact form, referrals, partners and events | Day 0: an instant reply. Day 2: a proof email with examples of past work. Day 4: a task to call or WhatsApp them. Day 6: a close-the-loop email. |
| **Ad lead** | Meta, Google and anything sent through Zapier/Make | Day 0: an intro email. Day 1: a task to call them. Day 3: a proof email. Day 7: a close-the-loop email. |
| **Scorecard** | Marketing scorecard submissions | Day 0: their score and the weakest area. Day 3: the one fix worth trying first. Day 6: a close-the-loop email. |

A Cal.com booking, an ad-platform test lead (tagged `test`) and a lead with no email address
get no recommendation, and Start follow-ups is refused for all three (see below). Any other
lead without a recommendation shows **Choose a set**, and nothing can start until the owner
picks one.

### Why "Start follow-ups" might not be available

The button is replaced with a plain-English reason whenever a lead can't be started. There are
seven, checked in this order:

1. **No email address** — the lead didn't leave one, so there's nothing to send to.
2. **A test lead from an ad platform** — leads from Google Ads' **Send test data** arrive
   tagged `test`, and follow-ups are always switched off for them. (Leads from Meta's Lead Ads
   Testing Tool are not tagged, so Start is offered for them like any other lead.)
3. **Booked a call directly** — the lead came in through a Cal.com booking, so there's no
   follow-up sequence to run; the call itself is the next step.
4. **On the do-not-contact list** — this address has unsubscribed or bounced before.
5. **No consent to email** — the lead didn't come in through a form or channel that counts as
   asking to be contacted.
6. **Already started once** — only one follow-up sequence ever runs per lead, so this stays
   blocked even after that sequence finishes or is stopped.
7. **Automation is off** — turn it on in **Settings → Sales** first.

### Two booking links

**Settings → Sales** holds two booking links:

- **Short call booking link (15 min)** — the existing 15-minute link, used by Enquiry, Ad lead
  and Scorecard, default `fm-in/15min`.
- **Scoping call booking link (30 min)** — used only by Project brief, default `fm-in/30min`.

> **Warning:** the Cal.com event type behind the scoping link must actually exist before the
> Project brief set is used. If it doesn't, every email in that sequence links to a dead page —
> and those go to your highest-intent leads, the people who filled in the full get-started
> form.

### Branded email

Every sales email now carries the FreakingMinds header band, brand colours, a single button
and a footer with the sender's name, "FreakingMinds", the registered company address, and an
unsubscribe link. It still sends alongside a plain-text version, and reads correctly even when
the recipient's email client blocks images.

## 1. Database

Run `migrations/2026-09-15-sales-foundation.sql` in the Supabase SQL editor, then run the
verify queries at the bottom of the file.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | What it is | Where to get it |
|---|---|---|
| `SALES_LINK_SECRET` | Encrypts unsubscribe links | `openssl rand -hex 32` |
| `SALES_REPLY_TO` | Address replies go to | `replies@reply.freakingminds.in` (step 3) |
| `SALES_FROM_EMAIL` | Optional sender, default `FreakingMinds <hello@freakingminds.in>` | Must be on a Resend-verified domain |
| `RESEND_WEBHOOK_SECRET` | Verifies Resend webhooks | Step 3 |
| `META_APP_SECRET` | Verifies Meta webhooks | Meta app → App settings → Basic |
| `META_LEADS_VERIFY_TOKEN` | Meta subscription handshake | Any random string you choose |
| `GOOGLE_ADS_LEAD_KEY` | Google Ads lead form key | Any random string; paste it into Google Ads too |
| `CALCOM_WEBHOOK_SECRET` | Verifies Cal.com webhooks | Cal.com webhook form |
| `LEAD_CONNECTOR_SECRET` | Zapier / Make bearer token | `openssl rand -hex 32` |

`RESEND_API_KEY`, `META_TOKEN_SECRET` and the AI key (`AI_API_KEY` or `ANTHROPIC_API_KEY`)
are already used elsewhere in the app. Redeploy after adding variables.

### Example .env.local entries

```bash
# Sales automation (all optional — see docs/SALES-SETUP.md)
SALES_LINK_SECRET=generate_with_openssl_rand_hex_32
SALES_REPLY_TO=replies@reply.freakingminds.in
SALES_FROM_EMAIL="FreakingMinds <hello@freakingminds.in>"
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxx
META_APP_SECRET=your_meta_app_secret
META_LEADS_VERIFY_TOKEN=choose_a_random_string
GOOGLE_ADS_LEAD_KEY=choose_a_random_string
CALCOM_WEBHOOK_SECRET=your_calcom_webhook_secret
LEAD_CONNECTOR_SECRET=generate_with_openssl_rand_hex_32
```

## 3. Email replies and bounces (Resend)

1. Resend → Domains: add the receiving subdomain `reply.freakingminds.in` and create the MX
   record Resend shows.
2. Resend → Webhooks → Add endpoint `https://www.freakingminds.in/api/webhooks/sales/resend`
   with events `email.received`, `email.bounced`, `email.complained`. Copy the signing secret
   into `RESEND_WEBHOOK_SECRET`.
3. Set `SALES_REPLY_TO=replies@reply.freakingminds.in`.

Resend must never be used for cold email — its policy forbids it. This system only emails
people who contacted FreakingMinds.

## 4. Cal.com

Cal.com → Settings → Developer → Webhooks → New:
- URL `https://www.freakingminds.in/api/webhooks/sales/calcom`
- Triggers: Booking created, Booking rescheduled, Booking cancelled, Meeting ended
- Secret: generate one and put it in `CALCOM_WEBHOOK_SECRET`

**Check:** book a test call from `/contact` using a test email address, confirm the call
appears on that lead's page, then cancel it in Cal.com and confirm the call shows as
cancelled with a "Rebook the discovery call" task.

## 5. Meta Lead Ads

1. In the Meta app, add the **Webhooks** product → **Page** → subscribe to `leadgen` with
   callback `https://www.freakingminds.in/api/webhooks/sales/meta` and your
   `META_LEADS_VERIFY_TOKEN`.
2. **Settings → Social** stores the Page access token you paste; it does not refresh it. Generate a
   **long-lived** Page token with `leads_retrieval` (plus `pages_manage_metadata`,
   `pages_show_list` and `pages_read_engagement`), either a Meta Business system-user token or
   a Graph API Explorer token exchanged for a long-lived one, and paste it for the
   FreakingMinds Page. A short-lived token expires within hours, and every lead after that
   would fail to fetch.
3. Subscribe the app to the Page (`POST /{page-id}/subscribed_apps?subscribed_fields=leadgen`).
4. Test with the [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing).
   A lead appears in Admin → Leads within a minute.
5. Before running ads, verify one real lead end to end: submit the live form yourself (for
   example from the ad preview) and confirm the lead appears with an owner, a brief and a
   "First touch within the hour" task.

If a lead cannot be fetched (for example, the token has expired), it shows as the Meta
source's last error in **Settings → Sales** and arrives as an admin notification.

## 6. Google Ads (Search, Performance Max, YouTube)

On each lead form asset → **Lead delivery** → **Webhook integration**:
- Webhook URL `https://www.freakingminds.in/api/webhooks/sales/google`
- Key: the value of `GOOGLE_ADS_LEAD_KEY`
- Click **Send test data**. Test leads arrive tagged `test`.

## 7. Everything else — Zapier or Make

Use for LinkedIn Lead Gen Forms (until LinkedIn approves Lead Sync API access), Quora,
Snapchat, JustDial and IndiaMART.

- Action: **Webhooks → POST** to `https://www.freakingminds.in/api/webhooks/sales/connector`
- Header: `Authorization: Bearer <LEAD_CONNECTOR_SECRET>`
- JSON body (map fields from the trigger):

```json
{
  "platform": "linkedin",
  "externalId": "{{lead id}}",
  "name": "{{full name}}",
  "email": "{{email}}",
  "phone": "{{phone}}",
  "company": "{{company}}",
  "message": "{{any free-text answer}}",
  "campaign": "{{campaign name}}",
  "formName": "{{form name}}",
  "consentText": "{{the consent text shown on the form}}"
}
```

`platform` is required; include `email` or `phone`. Whatever the zap maps into `campaign`
appears in the Ad lead email's subject ("About your enquiry from …"), so map a name a customer
would recognise, or leave `campaign` out.

## 8. Team

1. Each salesperson needs a mobile login under **Users** with role `manager` (or `admin`).
   Either role grants sales access automatically.
2. An admin opens **Settings → Sales → Sales rotation** and ticks who receives new leads.
   Only people with sales access can be in the rotation.

## 9. First run

1. Keep automation **off**. Submit the contact form with your own email.
2. Open the lead: it has an owner, an AI brief and a "First touch within the hour" task —
   and no email has been sent. Nothing is emailed until you click Start follow-ups, whether
   or not automation is on.
3. Before turning automation on, confirm the Inngest dashboard lists all four sales functions:
   `sales-lead-created`, `sales-sequence`, `sales-meta-leadgen` and `sales-meeting-prep`.
   If one is missing, resync the app in Inngest first.
4. Turn automation **on**. Submit again with a different email address you control.
5. Emails go out only between 09:00 and 19:00 IST. A test started in the evening arrives the
   next morning — that's expected, not a fault.
6. Open that lead and click **Start follow-ups**. It preselects the recommended set — for a
   contact-form submission that's Enquiry — so just click Start. Still no email goes out
   until this click.
7. You receive the instant reply. Reply to it: the reply appears on the timeline, follow-ups
   stop, and the reply is forwarded to the owner.
8. Book through the link in the email: the lead moves to "Discovery scheduled" and a
   pre-call brief arrives two hours before the call.
9. Start **each of the four sets** once on an internal test lead and read the first email each
   one sends. Use a different email address and phone number for every lead (for example
   `you+brief@…`, `you+ad@…`): a submission matching an existing lead's email or phone joins
   that lead instead of creating a new one, and a lead only ever runs one set.
   - **Project brief** — submit the get-started form at `/get-started`.
   - **Enquiry** — submit the contact form (the lead from step 4 counts).
   - **Ad lead** — send a test post from the Zapier or Make zap in §7 (its **Test** step), with
     `platform`, `name` and `email` filled in. Don't use Google's **Send test data** for this:
     those leads are tagged `test` and can't be started.
   - **Scorecard** — complete `/scorecard`, then open **Admin → Scorecard** and click **To lead**
     on your submission.

   In every email, check: the header band and logo show, the button opens the booking page,
   the footer carries the company address, the unsubscribe link works, and no internal ids or
   codes appear anywhere in the text — no long numbers, no words joined by underscores (such as
   `web_app` or `at_risk`), and no form or campaign names you didn't choose to show.

## 10. Check the admin screens

Once the migration is applied:

1. `/admin/leads`: the owner filter (All owners / My leads / Unassigned) changes the list,
   and a lead's name opens `/admin/leads/<id>`.
2. The lead page shows the header, timeline and note composer; adding a note puts it at the
   top of the timeline.
3. `/admin/my-work` shows "Sales tasks" for a sales user and nothing for an editor.
4. **Settings → Sales** shows the automation switch, both booking links — **Short call booking
   link (15 min)** and **Scoping call booking link (30 min)** — the rotation list and the five
   lead-source URLs with their last delivery. Check the scoping link points at a Cal.com event
   that exists.

## Later: WhatsApp

Automatic WhatsApp needs Meta business verification and WhatsApp Business app
"coexistence" onboarding through a Meta Tech Provider or a WhatsApp partner. Until then,
tasks open WhatsApp with the drafted message filled in and you send it from the app.
