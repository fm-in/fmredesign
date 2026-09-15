/**
 * First-touch attribution: where a visitor first came from, kept in the
 * browser so a later enquiry can carry it. Client-safe and storage-agnostic
 * so it can be unit-tested.
 */

import type { Attribution } from '@/lib/sales/types';

export const FIRST_TOUCH_KEY = 'fm_first_touch';

const MAX_VALUE = 300;

const URL_PARAMS: ReadonlyArray<readonly [keyof Attribution, string]> = [
  ['utmSource', 'utm_source'],
  ['utmMedium', 'utm_medium'],
  ['utmCampaign', 'utm_campaign'],
  ['utmContent', 'utm_content'],
  ['utmTerm', 'utm_term'],
  ['gclid', 'gclid'],
  ['fbclid', 'fbclid'],
];

const ATTRIBUTION_KEYS: ReadonlyArray<keyof Attribution> = [
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmContent',
  'utmTerm',
  'landingPage',
  'referrer',
  'gclid',
  'fbclid',
];

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseAttribution(href: string, referrer: string): Attribution {
  const url = new URL(href);
  const result: Attribution = {};

  for (const [key, param] of URL_PARAMS) {
    const value = url.searchParams.get(param);
    if (value) result[key] = value.slice(0, MAX_VALUE);
  }
  result.landingPage = url.pathname.slice(0, MAX_VALUE);

  if (referrer) {
    try {
      const ref = new URL(referrer);
      if (ref.host !== url.host) result.referrer = `${ref.origin}${ref.pathname}`.slice(0, MAX_VALUE);
    } catch {
      // A malformed referrer is simply not recorded.
    }
  }
  return result;
}

export function captureFirstTouch(store: KeyValueStore, href: string, referrer: string): void {
  if (store.getItem(FIRST_TOUCH_KEY)) return;
  store.setItem(FIRST_TOUCH_KEY, JSON.stringify({ ...parseAttribution(href, referrer), capturedAt: new Date().toISOString() }));
}

export function readFirstTouch(store: KeyValueStore): Attribution | undefined {
  const raw = store.getItem(FIRST_TOUCH_KEY);
  if (!raw) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined;

  const values = new Map(Object.entries(parsed));
  const result: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = values.get(key);
    if (typeof value === 'string' && value) result[key] = value;
  }
  return result;
}

/** For form submit handlers: undefined when storage is blocked or empty. */
export function readFirstTouchSafely(): Attribution | undefined {
  try {
    return typeof window === 'undefined' ? undefined : readFirstTouch(window.localStorage);
  } catch {
    return undefined;
  }
}
