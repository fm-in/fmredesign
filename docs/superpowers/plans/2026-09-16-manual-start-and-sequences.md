# Manual start, per-source sequences and branded email — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** No lead is emailed until a person starts follow-ups, each source gets its own
sequence, and every sales email carries full FreakingMinds branding.

**Spec:** `docs/superpowers/specs/2026-09-16-manual-start-and-sequences-design.md`

**Architecture:** The sequence runner becomes key-driven: a registry maps a key to steps,
`sales/sequence.start` carries the key, and a new admin action starts it. Email templates
grow from three to twelve, all rendered through one branded shell.

## Global Constraints

- TypeScript strict: no `any`, no `@ts-ignore`. `npx tsc --noEmit` before every commit.
- Zod 4 syntax: `z.record(z.string(), valueSchema)`.
- Tests in `__tests__` beside the code, run with `npx vitest run <path>`, `@/` imports.
- Database access only through `getSupabaseAdmin()`.
- Admin sales routes call `requirePermission(request, 'sales.read' | 'sales.write')`.
- Nothing is sent unless `admin_settings.sales.automationEnabled` is true.
- Sales email only to `consent_basis` of `inbound_request` or `consent`, never to a
  suppressed address, only 09:00–19:00 IST.
- Client components may import only `@/lib/sales/{types,links,consent,api-types}` and
  `@/lib/attribution`.
- Email HTML: tables and inline styles only, explicit background colours, readable with
  images blocked, plain-text alternative kept.
- No changes to intake, scoring, routing or the WhatsApp adapter.
- Commit messages end with `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

### Task 1: Branded email shell

**Files:** create `src/lib/sales/email-shell.ts` + test; modify `src/lib/sales/emails.ts`.

**Interfaces — Produces:**
`renderShell(input: { preheader: string; paragraphs: string[]; cta: { label: string; url: string }; ownerName: string; unsubscribeUrl: string }): string`

Steps: write the failing test first (header band `#a82548`, logo `https://www.freakingminds.in/email/logo.png` with alt text, 600px table, button as a padded table cell, footer carrying `process.env.COMPANY_ADDRESS`, unsubscribe link present, every interpolated value escaped, hidden preheader span). Then implement, then point `renderSalesEmail` at it, keeping the existing plain-text output byte-identical. Commit.

### Task 2: Sequence registry and recommendation

**Files:** modify `src/lib/sales/sequence.ts` + test.

**Produces:** `SalesEmailTemplate` widened to the twelve template names in the spec;
`SEQUENCES: Record<string, readonly SequenceStep[]>` keyed `brief-v1`, `enquiry-v1`,
`ad-lead-v1`, `scorecard-v1`; `getSequence(key)`; `recommendSequence(lead: LeadRow): string | null`
implementing the spec's table, returning `null` for `cal_booking`, a `test` tag, or no email.
`INBOUND_V1` and `INBOUND_V1_KEY` are removed; `enquiry-v1` carries its steps.

Tests cover every row of the spec's table, including the get-started versus contact-page
split on `custom_fields.formName`.

### Task 3: Email copy for the nine new templates

**Files:** modify `src/lib/sales/emails.ts` + test.

Copy is fixed and approved — transcribe it verbatim from the spec's linked draft:
`brief_intro`, `brief_questions`, `brief_close`, `ad_intro`, `ad_proof`, `ad_close`,
`scorecard_intro`, `scorecard_fix`, `scorecard_close`. `SalesEmailContext` gains the fields
the new copy needs: `projectType`, `campaign`, `platform`, `score`, `band`, `weakestArea`,
and `bookingUrlLong`. Every value is optional with a neutral fallback, and absent values must
never render as `undefined` or leave a dangling sentence. Tests assert one rendering per
template plus the fallbacks.

### Task 4: Key-driven runner

**Files:** modify `src/lib/inngest/events.ts`, `src/lib/sales/sequence-runner.ts`,
`src/lib/inngest/functions/sales.ts`, `src/lib/inngest/index.ts` + tests.

`SalesSequenceStartData` gains `sequenceKey: string`. `salesSequenceInboundFn` becomes
`salesSequenceFn` with id `sales-sequence`, reading the key from the event, resolving steps
via `getSequence`, and stopping with reason `manual` when the key is unknown. `salesLeadCreatedFn`
no longer sends `sales/sequence.start` — owner assignment, AI brief and first-touch task stay.
`sendSalesEmail` gains the context the new templates need, including `bookingUrlLong` from
settings. Tests: a lead created no longer enrols; each key runs its own steps; an unknown key
stops cleanly.

### Task 5: Settings gains the long booking link

**Files:** modify `src/lib/sales/settings.ts`, `src/lib/sales/schemas.ts`,
`src/components/admin/sales/SalesSettingsPanel.tsx` + tests.

`SalesSettings` gains `bookingLinkLong` (default `fm-in/30min`), validated by the same
Cal.com path regex as `bookingLink`, editable in Settings → Sales beside it.

### Task 6: Start endpoint

**Files:** modify `src/app/api/admin/sales/leads/[id]/sequence/route.ts`,
`src/lib/sales/schemas.ts` + test.

`sequenceActionSchema` accepts `{ action: 'stop' }` or `{ action: 'start', sequenceKey }`.
Start requires `sales.write` and `canAccessLead`, and refuses with a specific message for:
no email, suppressed, no consent basis, a sequence already run, unknown key, or automation
off. On success it sends `sales/sequence.start` with the key and records an activity.
Tests cover each refusal and the success path.

### Task 7: Start follow-ups on the lead page

**Files:** modify `src/lib/sales/api-types.ts`, `src/app/api/admin/sales/leads/[id]/route.ts`,
`src/hooks/admin/useLeadDetail.ts`, `src/components/admin/sales/LeadDetailHeader.tsx`,
`src/app/admin/leads/[id]/page.tsx` + test.

The detail payload gains `sequences: { recommended: string | null; canStart: boolean; blockedReason: string | null }`.
The page shows a Start follow-ups panel with the recommended set preselected, a labelled
select listing all four with human names, and the blocked reason shown instead of the button
when it cannot start. `startSequence(key)` joins the hook's actions and returns a boolean like
its siblings. Test the disabled states and that starting posts the chosen key.

### Task 8: Docs and verification

**Files:** modify `docs/SALES-SETUP.md`, `CLAUDE.md`.

Document that follow-ups are started by a person, the four sets and what each is for, the
second booking link, and the branded email. Update the §9 first-run walkthrough to include
clicking Start follow-ups. Then run the full suite, `tsc`, lint, build, and a real send of
one email per set to an internal address with images blocked, confirming the header, button,
footer address and unsubscribe all render.
