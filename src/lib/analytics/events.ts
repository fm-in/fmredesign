/**
 * Analytics events — the one way the site talks to Google Tag Manager.
 *
 * Every event the site sends is declared in `AnalyticsEvent`, so the GTM
 * container (docs/analytics/gtm-container.json) and the code cannot drift
 * without a type error here. Names follow GA4's recommended events where one
 * exists (`generate_lead`, `begin_checkout`, `purchase`, `search`) so GA4's
 * built-in reports pick them up without custom definitions.
 *
 * ## Never send personal data
 *
 * No names, emails, phone numbers or free text a visitor typed about
 * themselves. Google's terms forbid PII in GA, and the dataLayer is readable
 * by every tag in the container. The types below only allow identifiers we
 * chose (form ids, programme ids, order ids), never a field the visitor filled.
 * `search_term` is the one exception GA4 expects, and it is capped.
 *
 * Client-safe: no server imports.
 */

export type LeadFormId = 'contact' | 'get_started' | 'scorecard';
export type ContactMethod = 'whatsapp' | 'email';

interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_category: 'academy';
  price: number;
  quantity: 1;
}

interface Ecommerce {
  currency: 'INR';
  value: number;
  transaction_id?: string;
  items: EcommerceItem[];
}

export type AnalyticsEvent =
  | { event: 'generate_lead'; form_id: LeadFormId; lead_type?: string }
  | { event: 'talent_apply' }
  | { event: 'scorecard_start' }
  | { event: 'scorecard_complete'; score: number; band: string }
  | { event: 'begin_checkout'; ecommerce: Ecommerce }
  | { event: 'purchase'; ecommerce: Ecommerce & { transaction_id: string } }
  | { event: 'booking_open'; cal_link: string }
  // Pushed by the Cal.com embed callback in src/app/layout.tsx (an inline
  // script, so it cannot call track()). Listed so the name has one home.
  | { event: 'book_call' }
  | { event: 'contact_click'; method: ContactMethod; link_location: string }
  | { event: 'search'; search_term: string }
  | { event: 'filter_feed'; filter_type: string; filter_value: string };

/**
 * Every event name, at runtime. The GTM container's trigger must list exactly
 * these — `analytics.test.ts` fails if docs/analytics/gtm-container.json and
 * this list disagree, and the type below fails if this list misses a name.
 */
export const ANALYTICS_EVENT_NAMES = [
  'generate_lead',
  'talent_apply',
  'scorecard_start',
  'scorecard_complete',
  'begin_checkout',
  'purchase',
  'booking_open',
  'book_call',
  'contact_click',
  'search',
  'filter_feed',
] as const satisfies ReadonlyArray<AnalyticsEvent['event']>;

type MissingFromList = Exclude<AnalyticsEvent['event'], (typeof ANALYTICS_EVENT_NAMES)[number]>;
// Compile error naming the missing event if a union member is not listed above.
const _allListed: [MissingFromList] extends [never] ? true : MissingFromList = true;
void _allListed;

type DataLayerEntry = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerEntry[];
  }
}

const MAX_SEARCH_TERM = 100;

/**
 * Push one event onto the dataLayer. Safe to call before GTM has loaded (GTM
 * replays the queue on arrival) and on the server (it does nothing).
 *
 * `ecommerce: null` goes first on every push, as Google recommends: GTM's data
 * model merges pushes, so without the reset a `contact_click` sent after a
 * purchase would carry that purchase's items into GA.
 */
export function track(payload: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const layer = (window.dataLayer = window.dataLayer || []);
    const entry: DataLayerEntry = { ...payload };
    if (payload.event === 'search') {
      entry.search_term = payload.search_term.trim().slice(0, MAX_SEARCH_TERM);
    }
    layer.push({ ecommerce: null });
    layer.push(entry);
  } catch {
    // Analytics must never break a form submission.
  }
}

type AcademyProgram = { id: string; title: string; amountInr: number };

/** One academy seat as a GA4 ecommerce payload. Prices are whole rupees. */
export function academyEcommerce(program: AcademyProgram, transactionId: string): Ecommerce & { transaction_id: string };
export function academyEcommerce(program: AcademyProgram): Ecommerce;
export function academyEcommerce(program: AcademyProgram, transactionId?: string): Ecommerce {
  return {
    currency: 'INR',
    value: program.amountInr,
    ...(transactionId ? { transaction_id: transactionId } : {}),
    items: [
      {
        item_id: program.id,
        item_name: program.title,
        item_category: 'academy',
        price: program.amountInr,
        quantity: 1,
      },
    ],
  };
}

/** Classifies an outbound link as a contact method, or null if it is not one. */
export function contactMethodFor(href: string): ContactMethod | null {
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|(www\.)?whatsapp\.com)\//i.test(href)) return 'whatsapp';
  if (/^mailto:/i.test(href)) return 'email';
  return null;
}
