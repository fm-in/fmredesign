# Tracking: Google Tag Manager + GA4

The site sends named events to the `dataLayer`; Google Tag Manager turns them
into GA4 hits. GA4 is no longer hard-coded in the site — it lives in the
container, so tags can be added later (Meta Pixel, Google Ads) without a deploy.

| Piece | Where |
|---|---|
| Event names and payloads | `src/lib/analytics/events.ts` (`track()`) |
| Consent Mode + GTM loader | `src/lib/analytics/consent.ts`, used in `src/app/layout.tsx` |
| Cookie banner | `src/components/CookieConsent.tsx` |
| WhatsApp / email clicks | `src/components/analytics/ContactClickTracker.tsx` |
| Cal.com confirmed bookings | `cal-embed` script in `src/app/layout.tsx` |
| Importable container | `docs/analytics/gtm-container.json` |

## Events

| Event | Fired when | Parameters | GA4 key event? |
|---|---|---|---|
| `generate_lead` | Contact, get-started or scorecard form saved | `form_id` (`contact` / `get_started` / `scorecard`), `lead_type` | **Yes** |
| `purchase` | Razorpay reports a successful academy payment | `ecommerce` (INR, `transaction_id` = Razorpay order id, item) | **Yes** |
| `book_call` | Cal.com embed confirms a booking | — | **Yes** |
| `talent_apply` | CreativeMinds application saved | — | **Yes** |
| `begin_checkout` | Academy checkout opens the Razorpay window | `ecommerce` | No |
| `booking_open` | A booking button is pressed | `cal_link` | No |
| `contact_click` | Any WhatsApp or `mailto:` link is clicked | `method`, `link_location` (page path) | No |
| `scorecard_start` / `scorecard_complete` | Quiz started / last answer given | `score`, `band` on complete | No |
| `search` | Freakquency search, once typing pauses | `search_term` | No |
| `filter_feed` | A Freakquency filter changes | `filter_type`, `filter_value` | No |

No event carries a name, email, phone number or message. Keep it that way:
`track()` only accepts the payloads declared in `AnalyticsEvent`.

**Limits to know:** a booking made after `CalButton` falls back to opening
cal.com in a new tab (embed not yet loaded) is not seen as `book_call` — only
`booking_open`. A `purchase` is recorded in the browser when Razorpay reports
success; the webhook remains the source of truth for money.

## Consent

Consent Mode v2, region-based. EEA, UK and Switzerland start **denied**
(GA runs cookieless, modelled data only) until Accept; everywhere else starts
**granted** and Decline revokes it. The choice is stored as `fm-consent` in
localStorage and applied before GTM loads on every later page.

## One-time setup

### 1. Import the container

1. tagmanager.google.com → the freakingminds.in container → **Admin → Import Container**.
2. Choose `docs/analytics/gtm-container.json`, workspace **Default** (or a new one),
   option **Merge → Rename conflicting tags, triggers and variables**.
3. Check what it created: 2 tags (`Google tag - GA4`, `GA4 event - FM site events`),
   1 trigger (`CE - FM site events`), 11 variables.
4. **Remove any other GA4 tag for `G-WRBTEE11SH`** already in the container, or every page
   view is counted twice.

If the import is rejected, create the same items by hand: a Constant variable
`GA4 Measurement ID` = `G-WRBTEE11SH`; a Google tag firing on
*Initialization – All Pages*; Data Layer Variables for `form_id`, `lead_type`, `score`,
`band`, `cal_link`, `method`, `link_location`, `search_term`, `filter_type`,
`filter_value`; a Custom Event trigger matching the regex
`^(generate_lead|talent_apply|scorecard_start|scorecard_complete|begin_checkout|purchase|booking_open|book_call|contact_click|search|filter_feed)$`;
and a GA4 Event tag with event name `{{Event}}`, those ten parameters, and
*Send Ecommerce data* from the Data Layer.

### 2. Test before publishing

1. In GTM press **Preview**, enter the site URL (a Vercel preview with `NEXT_PUBLIC_GTM_ID`
   set, or production after step 4).
2. Submit the contact form with test details, click a WhatsApp link, start the scorecard.
3. Tag Assistant should show `GA4 event - FM site events` firing on each, and
   GA4 → **Admin → DebugView** should show the events with their parameters.
4. **Publish** the container.

### 3. GA4 property settings

- **Key events** (Admin → Events, or Admin → Key events → New): `generate_lead`, `purchase`,
  `book_call`, `talent_apply`. (`purchase` is a key event by default.)
- **Custom definitions** (Admin → Custom definitions → Create), all *event*-scoped
  dimensions: `form_id`, `lead_type`, `method`, `link_location`, `band`, `cal_link`,
  `filter_type`, `filter_value`. One custom *metric*: `score` (standard unit).
  Without these the parameters are collected but cannot be used in reports.
- **Enhanced measurement** (Admin → Data streams → web stream):
  keep *Page views* on with **"Page changes based on browser history events"**
  enabled — the site navigates without full reloads. Turn **Form interactions off**:
  GA's automatic form events fire on attempts, not saved leads, and duplicate
  `generate_lead` confusingly. Keep outbound clicks, scrolls and site search on.
- **Data retention** (Admin → Data collection → Data retention): 14 months.
- **Internal traffic**: define the office IP under the data stream's *Define internal
  traffic*, then activate the `Internal Traffic` filter.

### 4. Deploy

Set `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX` in Vercel, **Production** scope only, then deploy.
Without it the site loads no analytics at all, so the container must be published
(step 2) **before** this deploy or there is a gap in the data. Previews stay out of
the production property as long as the variable is not given the Preview scope.

## Adding an event

1. Add it to `AnalyticsEvent` and `ANALYTICS_EVENT_NAMES` in `src/lib/analytics/events.ts`.
2. Call `track({ event: … })` where it happens.
3. Add the name to the trigger regex in GTM **and** in `gtm-container.json`
   (`analytics.test.ts` fails until the file matches), plus a Data Layer Variable and
   GA4 event parameter for any new parameter.
