# Sales Automation — Setup

Everything ships switched off. Work through these in order; each step can be checked in
**Admin → Settings → Sales**.

## 1. Database

Run `migrations/2026-09-15-sales-foundation.sql` in the Supabase SQL editor, then run the
verify queries at the bottom of the file.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | What it is | Where to get it |
|---|---|---|
| `SALES_LINK_SECRET` | Signs unsubscribe links | `openssl rand -hex 32` |
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
2. Reconnect the FreakingMinds Facebook Page in **Settings → Social** granting
   `leads_retrieval`, `pages_manage_metadata`, `pages_show_list` and `pages_read_engagement`.
3. Subscribe the app to the Page (`POST /{page-id}/subscribed_apps?subscribed_fields=leadgen`).
4. Test with the [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing).
   A lead appears in Admin → Leads within a minute.

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

`platform` is required; include `email` or `phone`.

## 8. Team

1. Each salesperson needs a mobile login under **Users** with role `manager` (or `admin`).
2. Users created before the migration were granted `sales.read,sales.write` by it. For anyone
   added later, add both permissions to their user record.
3. An admin opens **Settings → Sales → Sales rotation** and ticks who receives new leads.

## 9. First run

1. Keep automation **off**. Submit the contact form with your own email.
2. Open the lead: it has an owner, an AI brief and a "First touch within the hour" task.
3. Turn automation **on**. Submit again with a different email address you control.
4. You receive the instant reply. Reply to it: the reply appears on the timeline, follow-ups
   stop, and the reply is forwarded to the owner.
5. Book through the link in the email: the lead moves to "Discovery scheduled" and a
   pre-call brief arrives two hours before the call.

## 10. Check the admin screens

Once the migration is applied:

1. `/admin/leads`: the owner filter (All owners / My leads / Unassigned) changes the list,
   and a lead's name opens `/admin/leads/<id>`.
2. The lead page shows the header, timeline and note composer; adding a note puts it at the
   top of the timeline.
3. `/admin/my-work` shows "Sales tasks" for a sales user and nothing for an editor.
4. **Settings → Sales** shows the automation switch, the rotation list and the five
   lead-source URLs with their last delivery.

## Later: WhatsApp

Automatic WhatsApp needs Meta business verification and WhatsApp Business app
"coexistence" onboarding through a Meta Tech Provider or a WhatsApp partner. Until then,
tasks open WhatsApp with the drafted message filled in and you send it from the app.
