# CLAUDE.md - FreakingMinds Website

## Project Overview

FreakingMinds is a digital marketing agency platform built with Next.js 15 and Tailwind CSS v4:
- **Public website** — V2 dark magenta/purple theme, 3D brain decorations, glass-morphism
- **Admin dashboard** — Agency management (clients, projects, content, invoices, proposals, leads, team, discovery, talent, contracts, social publishing, audit)
- **Client portal** — Client-facing dashboard (project tracking, content approval, contracts, documents, reports, support)
- **CreativeMinds** — Talent marketplace (public application + authenticated talent portal)
- **Blog** — Supabase-backed CMS. Admin editor (TipTap) at `/admin/blog`, public pages read
  `blog_posts_public` via `src/lib/blog-data-public.ts`. The old hardcoded `blog-data.ts` is gone.
- **FM Academy** — Public course listing + detail (`/academy`), paid enrollment via Razorpay.
  Tables: `programs`, `enrollments`, `payment_events`; public view `programs_public`. Direct payment
  only — no manual payment links anywhere. A seat counts only once payment succeeds; an unpaid
  checkout stays `reserved` (shown as "Payment pending") and never auto-cancels, and gets one
  reminder email an hour after checkout started (Inngest `academy-checkout-reminder`).

## Tech Stack

- **Framework**: Next.js 15.5.12 (App Router), React 19.1.0
- **Styling**: Tailwind CSS v4 (CSS-first config)
- **Animations**: GSAP 3.14.2 (ScrollTrigger, native browser scroll — Lenis disabled)
- **Icons**: Lucide React
- **Forms**: react-hook-form + Zod (`src/lib/validations/schemas.ts` — shared by API + forms)
- **Database**: Supabase (PostgreSQL) — `getSupabaseAdmin()` from `src/lib/supabase.ts`
  - 44 relations live. `migrations/2026-08-10-schema-snapshot.sql` documents all of them
    (columns/types/PK/FK only — no defaults, indexes, RLS or triggers). Most schema was
    applied by hand in the Supabase SQL editor; prefer adding a migration file for new changes.
- **Data Fetching**: @tanstack/react-query 5.x, @tanstack/react-table 8.x
- **PDF**: jsPDF + jspdf-autotable (invoices/proposals)
- **Email**: Resend 6.x (optional, graceful degradation)
- **Social**: Meta Graph API v21.0 (optional)
- **Background Jobs**: Inngest 3.x (durable queue with retries)
- **Auth**: bcryptjs + HMAC-SHA256 session signing

## Critical: Tailwind v4 Cascade Layer Fix

**IMPORTANT**: Tailwind v4 `@layer utilities` has **lower priority** than unlayered CSS. Any bare element selector in globals.css will silently override Tailwind utilities.

**Rule**: All element-level resets in `globals.css` MUST be inside `@layer base`:
```css
/* WRONG — unlayered beats Tailwind */
p { margin: 0; }

/* CORRECT — in @layer base, Tailwind wins */
@layer base { p { margin: 0; } }
```

**`text-center` exception**: Still needs inline `style={{ textAlign: 'center' }}` due to separate unlayered conflicts.

## Critical: `loading.tsx` Silently Breaks `notFound()`

**IMPORTANT**: A `loading.tsx` anywhere in a route's ancestry wraps the segment in a
Suspense boundary. That boundary flushes a **200 shell** before a downstream
`notFound()` is reached — so unknown slugs return **HTTP 200** with the not-found UI
instead of a real 404, and search engines index unlimited soft-404s.

Measured on this repo: with either `blog/loading.tsx` or `blog/[slug]/loading.tsx`
present, `/blog/<bad-slug>` returned 200. With both absent it returns 404.
A *nested* `loading.tsx` does not escape an ancestor's boundary — both must go.

**Rule**: any segment whose page calls `notFound()` must have **no `loading.tsx` in
its ancestry**. To keep a skeleton on a sibling listing page, put the listing in a
route group so the dynamic segment does not inherit it:

```
src/app/blog/
  (index)/            <- listing keeps its skeleton, URL stays /blog
    loading.tsx
    page.tsx
  [slug]/             <- no loading.tsx anywhere above it -> real 404s
    page.tsx
```

Before adding a `loading.tsx`, check for `notFound()` under it:
```bash
for f in $(find src/app -name loading.tsx); do grep -rl "notFound()" $(dirname "$f"); done
```

**Related**: a parent `layout.tsx` that sets `alternates.canonical` leaks that
canonical to every child. `blog/layout.tsx` declares `/blog`, so `[slug]` must
override it — otherwise every post tells Google it is a duplicate of the listing.

## Design Systems — two, on purpose

The **public site** and the **portals** use different systems. They were
separated deliberately: 80% of `fm-*` usage is admin/client/talent code, so the
public site could not be restyled in place without repainting the dashboards.

### Public site — `site-*` tokens

Every public route renders `SiteShell` + `SiteHeader` + `SiteFooter` and is
scoped by `[data-site]`.

- **Tokens**: `src/styles/site-tokens.css`. Light (warm bone `#F7F4EF`) is the
  default; dark (`#0B0A0C`) is opt-in via the header toggle, which sets
  `data-theme="dark"` on `<html>`. `prefers-color-scheme` is deliberately
  ignored.
- **Type**: Instrument Serif (display) + DM Sans (text), via `font-site-display`
  / `font-site-sans`. Sizes are `text-site-display|h1|h2|h3|lead|body|label`.
- **Colour**: `site-ground`, `site-raised`, `site-text`, `site-muted`,
  `site-accent`, `site-line`, `site-line-soft`.
- **Rhythm**: `py-site-section`, `px-site-gutter`, `rounded-site-sm|md|lg`.
- **Primitives**: `src/components/site/` — `Section`, `Container`, `Display`,
  `Text`, `Label`, `Rule`, `Prose`, `StillFrame`, `FilmWall`, `LogoWall`,
  `ThemeToggle`, and the form set in `Field.tsx`.
- **Motion**: `src/lib/motion/` only. GSAP is imported dynamically and never at
  module scope; `prefersReducedMotion()` is a live check, not a cached boolean.

**Tailwind v4 rules that bite here:**
- `@theme` resolves once at build time, so a themeable token must be an
  indirection: `@theme { --color-site-ground: var(--site-ground) }` with the
  real value on `:root` / `:root[data-theme="dark"]`.
- Only `--color-*`, `--font-*`, `--text-*`, `--leading-*`, `--tracking-*`,
  `--radius-*`, `--spacing-*` generate utilities. The legacy `--font-size-*`,
  `--line-height-*`, `--border-radius-*` tokens generate **nothing**.
- Never override Tailwind's own `--font-sans`: it repoints `font-sans` across
  every portal page.

### Portals — `v2-*` / `fm-*` classes

Still in use by `/admin`, `/client`, `/creativeminds/portal`, `/talent/[slug]`
and the login screens. Surviving classes: `.v2-btn`, `.v2-btn-magenta`,
`.v2-btn-lg`, `.v2-btn-full`, `.v2-paper`, `.v2-paper-sm`, `.v2-container`,
`.v2-accent` and `.v2-gradient-*`, plus the whole `--color-fm-*` palette.

63 other `v2-*` classes and their rules were deleted once no public route used
them. Before deleting any more, grep both CSS **and** TSX — some animations are
invoked from inline `style={{ animation: '…' }}`.

### Services

One catalogue: `src/lib/services-catalogue.ts`. Link via `serviceHref(id)`.
There were five divergent copies; do not start a sixth.

## Authentication

### Admin Auth
- **Cookie**: `fm-admin-session` (HMAC-SHA256, httpOnly, 24h)
- **Methods**: Password (`ADMIN_PASSWORD` env) or Mobile (`authorized_users` table)
- **Guard**: `requireAdminAuth(request)` from `src/lib/admin-auth-middleware.ts` — use in ALL admin API routes
- **Rate limit**: 5 attempts/min per IP

### Client Portal Auth
- **Cookie**: `fm_client_session` (HMAC-signed, httpOnly, 7-day)
- **Method**: Email + `portal_password` in `clients` table (bcrypt)
- **Guard**: `requireClientAuth(request, clientId)` from `src/lib/client-session.ts` — use in ALL client API routes
- **Session**: `client_sessions` table

### Talent Portal Auth
- **Cookie**: `fm_talent_session` (HMAC-signed, httpOnly, 7-day)
- **Guard**: `requireTalentAuth(request, slug)` from `src/lib/talent-session.ts` — use in ALL talent API routes
- **Session**: `talent_sessions` table

### Middleware (`src/middleware.ts`)
- **Runtime**: Edge Runtime (Web Crypto API, NOT Node.js `crypto`)
- **Protects**: `/admin/*`, `/client/*`, `/creativeminds/portal/*`
- **Cross-session prevention**: Validates session ownership against URL params
- **Does NOT apply to**: Public pages, API routes (APIs use own guards)

## Public Form Protection

Every unauthenticated POST route must rate-limit **and** run the spam guard.

```ts
import { rateLimit, getClientIp } from '@/lib/rate-limiter';
import { checkSpam, HONEYPOT_FIELD } from '@/lib/spam-guard';   // server only

if (!rateLimit(getClientIp(request), 3)) return ApiResponse.error('Too many requests', 429);

const spam = checkSpam({ honeypot: body[HONEYPOT_FIELD], email, name });
if (spam.isSpam) return ApiResponse.validationError('A valid email is required');
```

- **Client components** import `HONEYPOT_FIELD` from `@/lib/spam-guard-field`, NOT
  `@/lib/spam-guard` — the heuristics must stay out of the browser bundle (same split as
  `events/types.ts` vs `events/emitter.ts`).
- The form renders a visually-hidden input named `HONEYPOT_FIELD` (see `ReserveSeatForm.tsx`).
- Rejections return a generic validation message so a bot learns nothing.
- Current limits: `/api/leads` 5/min, `/api/talent` 3/min, `/api/academy/enroll` 3/min.

**Always record capture metadata.** Attribution cannot be reconstructed after the
row is written, and this site already has confirmed bot traffic:

```ts
import { captureMeta, isMissingColumnError } from '@/lib/capture-meta';

let { data, error } = await supabase
  .from('leads')
  .insert({ ...record, ...captureMeta(request) })
  .select().single();

// The migration is applied by hand in the Supabase SQL editor, so a deploy can
// run ahead of it. Never lose a submission over telemetry.
if (error && isMissingColumnError(error)) {
  ({ data, error } = await supabase.from('leads').insert(record).select().single());
}
```

Store `user_agent` raw (length-capped only) — malformed user-agents are the signal.
Columns come from `migrations/2026-08-10-capture-metadata.sql`.

Any new public form must also call `notifyAdmins()` so submissions surface in the dashboard —
email alone has silently failed before.

## Key Patterns

### resolveClientId
URL param `[clientId]` can be slug OR database ID. Always resolve:
```ts
import { resolveClientId } from '@/lib/client-portal/resolve-client';
const resolved = await resolveClientId(clientId); // tries slug first, then id
if (!resolved) return 404;
```

### DashboardLayout Navigation (CRITICAL)
`DashboardLayout` expects **`NavigationGroup[]`**, NOT flat arrays:
```tsx
// CORRECT
const navigation = [{ title: 'Main', items: [{ label: 'Dashboard', href: '/admin', icon: <Icon /> }] }];
// WRONG — sidebar will be empty
const navigation = [{ label: 'Dashboard', href: '/admin', icon: <Icon /> }];
```

### Dashboard Variants
- `DashboardCard/Button variant="admin"` — magenta gradient
- `DashboardCard/Button variant="client"` — white card / glow

### API Response Pattern
```ts
import { ApiResponse } from '@/lib/api-response';
return ApiResponse.success(data);  // or .error(), .notFound(), etc.
```

### DB→API Transform
```ts
import { toCamelCaseKeys } from '@/lib/supabase-utils';
const result = toCamelCaseKeys(row, defaults);
```

### Client Portal Hook
```tsx
const { profile, clientId, slug, refreshProfile } = useClientPortal();
// clientId = database ID (NOT URL slug)
```

## Permission System (RBAC)

Defined in `src/lib/admin/permissions.ts`:

| Role | Hierarchy | Access |
|------|-----------|--------|
| `super_admin` | 100 | Full system access |
| `admin` | 90 | All permissions |
| `manager` | 70 | Clients, projects, content — NO finance/team/users/settings |
| `editor` | 50 | Content + clients + projects — NO finance/team/users/settings |
| `viewer` | 10 | Read-only |

**Admin-only sections**: Finance (invoices, proposals, contracts), Team, System (users, audit, settings)

```ts
PermissionService.hasPermission(userPermissions, 'finance.write');
```

## Inngest (Background Jobs)

Adapters use **dynamic `import()`** to avoid bundling `node:async_hooks` client-side:
- `logAuditEvent()` → `audit/log` (fallback: direct DB insert)
- `createNotification()` → `notification/send`
- `sendEmail()` → `email/send` (fallback: direct Resend)
- `emitEvent()` → `platform/event` (fallback: local EventEmitter)

Event type constants: import from `src/lib/events/types.ts` (client-safe), NOT `emitter.ts`.

Async APIs (`social/publish`, `content/generate`) return `{ status: 'queued' }` immediately.

## Sales Automation

Spec: `docs/superpowers/specs/2026-09-15-sales-phase-0-1-design.md`, amended by
`docs/superpowers/specs/2026-09-16-manual-start-and-sequences-design.md`. Setup:
`docs/SALES-SETUP.md`.

- Apply `migrations/2026-09-15-sales-foundation.sql` before deploying
- **Leads enter only through `ingestLead()`** (`src/lib/sales/intake/ingest.ts`). It normalises,
  merges returning people, scores, records the submission and emits `sales/lead.created`.
  Never `insert` into `leads` anywhere else. The one exception is the pre-migration fallback
  insert in `POST /api/leads` (`saveBeforeMigration`), used only when the database lacks the
  sales columns.
- **Stage changes go only through `changeStage()`** (`src/lib/sales/activity.ts`) so history,
  sequence stopping and `lead.status_changed` cannot be skipped.
- **No automatic enrolment.** `salesLeadCreatedFn` only assigns an owner, writes the AI brief
  and creates the first-touch task — it never starts a sequence. A person starts one via
  `POST /api/admin/sales/leads/[id]/sequence` with `{ action: 'start', sequenceKey }`, which
  is what sends `sales/sequence.start`.
- **`src/lib/sales/sequence.ts`** is the single source of truth for the four sets: `SEQUENCES`
  (keyed `brief-v1`, `enquiry-v1`, `ad-lead-v1`, `scorecard-v1`) and `getSequence(key)`.
  `recommendSequence(lead)` maps a lead's source (and, for `website_form`, its form name) to
  the recommended key, or `null`. `sequenceStartState(lead, check)` is the one place the seven
  reasons Start can be refused live, checked in order: no email address, an ad-platform test
  lead (tagged `test`), a lead that booked a call directly (`cal_booking`), the do-not-contact
  list, no consent, a sequence already run, automation off. The start route and the lead
  detail payload both call it, so the panel can never offer a button the route then rejects.
- **Sales email goes only through `sendSalesEmail()`**: it checks consent, the do-not-contact
  list and configuration at send time. Resend is never used for cold email. Every sales email
  renders through `renderShell()` in `src/lib/sales/email-shell.ts` (branded header/footer,
  plain-text alternative kept).
- **Webhooks** live at `/api/webhooks/sales/[source]` with one adapter per source in
  `src/lib/sales/intake/adapters/`. Verify first, log with the delivery id, then handle.
  Throw `WebhookRejection` for payloads that will never succeed (400, no retry).
- No sales email is sent to a lead unless `admin_settings.sales.automationEnabled` is true.
- **Confirmation receipts** (contact and get-started forms) go only through
  `sendTransactionalEmail()` (`src/lib/sales/transactional-email.ts`, copy in `receipts.ts`),
  scheduled with `afterResponse()` so they never delay or fail the form. They are not
  sequences, bypass `automationEnabled`, and carry no unsubscribe link.
- Admin sales routes use `sales.read` / `sales.write`; managers see their own and unassigned
  leads (`canAccessLead`).
- Tables: `lead_activities`, `sales_tasks`, `meetings`, `suppression_list` (+ sales columns on
  `leads`) from `migrations/2026-09-15-sales-foundation.sql`.
- Tests use `src/test-utils/fake-supabase.ts` and `src/test-utils/lead-row.ts`.

## Analytics (GTM + GA4)

Guide: `docs/analytics/TRACKING.md`. GA4 is configured **inside Google Tag
Manager**, never hard-coded; the site only pushes events.

- Send events only through `track()` from `src/lib/analytics/events.ts`. The
  `AnalyticsEvent` union is the list of what exists — no raw `gtag()` or
  `dataLayer.push` in components.
- **Never put personal data in an event** (names, emails, phones, messages).
- A new event name must also be added to `ANALYTICS_EVENT_NAMES` and to the
  trigger in `docs/analytics/gtm-container.json`; a test fails until they match.
- WhatsApp and `mailto:` links are tracked automatically by
  `ContactClickTracker` — no per-link code.
- Consent Mode v2 (region-based) is set in the same inline script that loads
  GTM (`gtmBootstrap`), so it always runs first. Do not split it.

## Invoice & Proposal System

### Invoices
- **GST-compliant**: CGST/SGST (same-state) or IGST (different-state), no GST for international
- **Numbering**: `FM{counter}/{year}` via `invoice_sequences` table
- **Multi-currency**: INR, USD, GBP, AED, EUR
- **Company info**: From `COMPANY_PAN`, `COMPANY_MSME`, `COMPANY_ADDRESS` env vars (NOT hardcoded)
- **Key files**: `InvoiceFormNew.tsx`, `pdf-simple.ts`, `invoice-numbering.ts`

### Proposals
- **Numbering**: `PM{counter}/{year}` via `proposal_sequences` table
- **Status flow**: draft → sent → viewed → approved/declined → converted
- **Key files**: `ProposalFormNew.tsx`, `proposal-pdf-generator.ts`, `proposal-types.ts`

## Common UI Patterns

### Public page shell

```tsx
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Container, Display, Section, Text } from '@/components/site/primitives';

export default function Page() {
  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <Section>
          <Container>
            <Display level="h1">Heading</Display>
            <Text muted className="mt-6">Body</Text>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </SiteShell>
  );
}
```

`SiteShell` does NOT wrap children in `<main>` — the header and footer are
children too, so each page renders its own `<main id="main-content">` between
them.

### 3D brain renders

`/3dasset/brain-*.webp`, rendered through **`<BrainMark pose="…" />`**
(`src/components/site/BrainMark.tsx`). Never drop one in as a bare `<img>`:
the component carries the treatment, the sizing and `alt="" aria-hidden`, and
these renders are always decorative — each repeats something the page has
already said in words.

They run in **full colour**, cut out as stickers: `--site-brain-filter` gives
four 3px white drop-shadows on the cardinal axes (a die-cut vinyl edge) plus
one hard offset shadow, and `.brain-mark` adds a tilt that flips on hover.
They were desaturated before; that solved the clash with the bone ground by
throwing the artwork away. Declaring them as objects works better and keeps
the colour. Per-instance angle via `--brain-tilt`.

**Only the mascots tilt** — every frame, rule and still on the site stays
square, which is what makes the tilt read as deliberate. Use one, large, per
page, and only where the hero is not already carrying real content: `/about`,
`/work`, `/academy` and `/services` fill that slot with portraits, client
screenshots and facts, which beat a mascot.

Two of the shipped files are opaque `RGB` with no alpha (`happy-brain`,
`medibrain`) and are a different character — no glasses, different
proportions. The die-cut edge needs alpha, so neither belongs in `BrainMark`.
The six `*-bg.webp` neon collages belong to the deleted `ServicesSectionV2`
and have text baked into their pixels; nothing renders them.

## Development Commands

```bash
npm run dev          # Dev server
npm run dev:turbo    # Dev with Turbopack
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (watch)
npm run test:run     # Vitest (CI)
```

## Environment Variables

```
# Required
NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD
NEXT_PUBLIC_SITE_URL
COMPANY_PAN, COMPANY_MSME, COMPANY_ADDRESS

# Optional
RESEND_API_KEY, NOTIFICATION_EMAIL          # Email (Resend)
META_TOKEN_SECRET                            # Social publishing (min 32 chars)
INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY       # Background jobs (prod only)
NEXT_PUBLIC_GTM_ID                           # Google Tag Manager container (Production scope only)
GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_SPREADSHEET_ID  # Legacy
# Sales automation (optional): see docs/SALES-SETUP.md — SALES_LINK_SECRET, SALES_REPLY_TO, SALES_FROM_EMAIL, RESEND_WEBHOOK_SECRET, META_APP_SECRET, META_LEADS_VERIFY_TOKEN, GOOGLE_ADS_LEAD_KEY, CALCOM_WEBHOOK_SECRET, LEAD_CONNECTOR_SECRET
```

## Workflow Rules

### Before Starting
- Scan codebase first — don't re-implement completed work
- For visual/design changes: describe approach in 3-5 bullets, get approval BEFORE coding

### During Implementation
- Never ignore TypeScript errors — no `@ts-ignore`, no `any` casts
- After multi-file changes: grep for remaining old patterns before declaring done

### Before Declaring Done
- `npm run build` must pass (or `npx tsc --noEmit` minimum)
- `git status` — ensure all files staged, all imports reference existing files

## Do's and Don'ts

### Do
- Use `SiteShell` + `SiteHeader` + `SiteFooter` for all public pages
- Use inline `style={{ textAlign: 'center' }}` (not `text-center` class) — portal code only
- Use `requireAdminAuth`/`requireClientAuth`/`requireTalentAuth` in ALL respective API routes
- Use `resolveClientId()` in all client portal API routes
- Use `ApiResponse.success()`/`.error()` for standardized responses
- Use `toCamelCaseKeys()` for DB→API transforms
- Wrap nav in `NavigationGroup[]` for `DashboardLayout`
- Add new element CSS inside `@layer base` in globals.css
- Add new public routes to `src/app/sitemap.ts` (it reads blog + academy from the DB)
- Call `notifyAdmins()` from any new public form route

### Don't
- Pass flat arrays to `DashboardLayout`
- Use `text-center` class (use inline style)
- Add `!important` to fix CSS (find root cause)
- Add element CSS outside `@layer base`
- Add a `loading.tsx` above any page that calls `notFound()` (returns 200, not 404)
- Write a public-form row without `captureMeta(request)`
- Store secrets in client code (`NEXT_PUBLIC_` only for public values)
- Use `v2-*` or `fm-*` classes on a public page (they are portal-only now)
- Import from `emitter.ts` in client components (use `events/types.ts`)

## Related Documentation

All docs in `docs/`: `FREAKING-MINDS-DESIGN-SYSTEM.md`, `DEVELOPMENT-GUIDELINES.md`, `AI_TECHNICAL_ARCHITECTURE.md`, `PROJECT_DOCUMENTATION.md`
