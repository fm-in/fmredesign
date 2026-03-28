# CLAUDE.md - FreakingMinds Website

## Project Overview

FreakingMinds is a digital marketing agency platform built with Next.js 15 and Tailwind CSS v4:
- **Public website** — V2 dark magenta/purple theme, 3D brain decorations, glass-morphism
- **Admin dashboard** — Agency management (clients, projects, content, invoices, proposals, leads, team, discovery, talent, contracts, social publishing, audit)
- **Client portal** — Client-facing dashboard (project tracking, content approval, contracts, documents, reports, support)
- **CreativeMinds** — Talent marketplace (public application + authenticated talent portal)
- **Blog** — Hardcoded in `src/lib/blog-data.ts` (no CMS)

## Tech Stack

- **Framework**: Next.js 15.5.12 (App Router), React 19.1.0
- **Styling**: Tailwind CSS v4 (CSS-first config)
- **Animations**: GSAP 3.14.2 (ScrollTrigger, native browser scroll — Lenis disabled)
- **Icons**: Lucide React
- **Forms**: react-hook-form + Zod (`src/lib/validations/schemas.ts` — shared by API + forms)
- **Database**: Supabase (PostgreSQL) — `getSupabaseAdmin()` from `src/lib/supabase.ts`
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

## V2 Design System

### Color Variables
```css
--color-fm-magenta-600: #c9325d  /* Primary brand */
--color-fm-magenta-700: #a82548
--color-fm-purple-700: #4a1942
--color-fm-neutral-500: #525251  /* Body text on white */
--color-fm-neutral-600: #404040
--color-fm-neutral-700: #2d2d2d  /* Strong text */
--color-fm-neutral-900: #0f0f0f  /* Headings on white */
```

### Text Classes
**On Dark Backgrounds (V2PageWrapper):** `v2-text-primary` (white), `v2-text-secondary` (85%), `v2-text-tertiary` (70%), `v2-accent` (gradient highlight)

**On White Cards (v2-paper):** `text-fm-neutral-900` (headings), `text-fm-neutral-700` (subheadings), `text-fm-neutral-600` (body), `text-fm-magenta-600` (accent)

### UI Classes
- **Cards**: `v2-paper`, `v2-paper-sm`, `v2-paper-lg`
- **Buttons (dark bg)**: `v2-btn v2-btn-primary` (white), `v2-btn v2-btn-secondary` (glass)
- **Buttons (white card)**: `v2-btn v2-btn-magenta` (gradient), `v2-btn v2-btn-outline`
- **Badges**: `v2-badge v2-badge-glass|gradient|outline|solid`
- **Layout**: `v2-container`, `v2-container-narrow`, `v2-container-wide`, `v2-section`

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

### Page Section Header (Dark Background)
```tsx
<div className="max-w-3xl mx-auto" style={{ textAlign: 'center', marginBottom: '64px' }}>
  <div className="v2-badge v2-badge-glass mb-6">
    <Icon className="w-4 h-4 v2-text-primary" />
    <span className="v2-text-primary">Badge Text</span>
  </div>
  <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-8 leading-tight">
    Section <span className="v2-accent">Title</span>
  </h2>
  <p className="text-lg md:text-xl v2-text-secondary leading-relaxed">Description</p>
</div>
```

### CTA on White Card
```tsx
<div className="v2-paper rounded-3xl p-10 lg:p-14" style={{ textAlign: 'center' }}>
  <h2 className="font-display text-3xl font-bold text-fm-neutral-900 mb-6">
    CTA <span className="text-fm-magenta-600">Title</span>
  </h2>
  <p className="text-fm-neutral-600 mb-8 max-w-xl mx-auto">Description</p>
  <Link href="/get-started" className="v2-btn v2-btn-magenta">Primary CTA</Link>
</div>
```

### V2PageWrapper (required for all public pages)
```tsx
import { V2PageWrapper } from "@/components/layouts/V2PageWrapper";
export default function Page() {
  return <V2PageWrapper>{/* content */}</V2PageWrapper>;
}
```

### 3D Brain Decorations
Assets: `/3dasset/brain-learning.png`, `brain-celebrating.png`, `brain-strategy.png`, `brain-creative.png`, `brain-teaching.png`

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
GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_SPREADSHEET_ID  # Legacy
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
- Use `V2PageWrapper` for all public pages
- Use inline `style={{ textAlign: 'center' }}` (not `text-center` class)
- Use `requireAdminAuth`/`requireClientAuth`/`requireTalentAuth` in ALL respective API routes
- Use `resolveClientId()` in all client portal API routes
- Use `ApiResponse.success()`/`.error()` for standardized responses
- Use `toCamelCaseKeys()` for DB→API transforms
- Wrap nav in `NavigationGroup[]` for `DashboardLayout`
- Add new element CSS inside `@layer base` in globals.css

### Don't
- Pass flat arrays to `DashboardLayout`
- Use `text-center` class (use inline style)
- Add `!important` to fix CSS (find root cause)
- Add element CSS outside `@layer base`
- Store secrets in client code (`NEXT_PUBLIC_` only for public values)
- Mix V1 and V2 design patterns
- Import from `emitter.ts` in client components (use `events/types.ts`)

## Related Documentation

All docs in `docs/`: `FREAKING-MINDS-DESIGN-SYSTEM.md`, `DEVELOPMENT-GUIDELINES.md`, `AI_TECHNICAL_ARCHITECTURE.md`, `PROJECT_DOCUMENTATION.md`
