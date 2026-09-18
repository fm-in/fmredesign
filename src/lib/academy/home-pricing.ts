/**
 * Pricing for the FM Academy block on the home page.
 *
 * This exists because the home page used to hardcode its prices:
 *
 *     const ENTRY_PRICE_EB      = '₹24,999';
 *     const ENTRY_PRICE_REGULAR = '₹29,999';
 *
 * Those were real numbers — the early-bird prices stored on every program.
 * But the early-bird window closed on 2026-06-04, so `formatProgramPrice()`
 * correctly began returning the regular price on the Academy pages and at
 * checkout, while the home page went on advertising the expired promotion.
 * A visitor clicked "₹24,999" and landed on a ₹29,999 checkout; on the
 * bundle the gap was ₹20,000.
 *
 * Nothing about that was a wrong constant — it was a constant at all. So the
 * home page now derives its prices from the same rows and the same
 * `formatProgramPrice()` early-bird logic that the Academy pages use. When a
 * promotion opens or closes, both surfaces move together, and there is no
 * second copy of the number to forget about.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import {
  formatProgramPrice,
  transformProgramRow,
  type Program,
} from '@/lib/admin/academy-types';

export const BUNDLE_SLUG = 'creator-program-full';

export interface CoursePrice {
  slug: string;
  /** Price to show now — early-bird if the window is open, else regular. */
  current: string;
  /** Regular price, present only while an early-bird price is actually live. */
  original?: string;
}

export interface AcademyHomePricing {
  /** Keyed by slug so the section can look up a course without matching order. */
  courses: Record<string, CoursePrice>;
  bundle?: CoursePrice;
  /** e.g. "₹30,000" — the saving vs buying all six individually. */
  bundleSaving?: string;
  earlyBirdActive: boolean;
}

/** Current effective price in paise-free rupees, honouring the early-bird window. */
function effectivePrice(p: Program): number {
  const active =
    !!p.earlyBirdPriceInr &&
    !!p.earlyBirdUntil &&
    new Date(p.earlyBirdUntil).getTime() > Date.now();
  return active && p.earlyBirdPriceInr ? p.earlyBirdPriceInr : p.priceInr;
}

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Returns null when the data can't be fetched. Callers render the section
 * without prices rather than falling back to a hardcoded figure — showing no
 * price is recoverable, showing a stale one is what caused this bug.
 */
export async function getAcademyHomePricing(): Promise<AcademyHomePricing | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('programs_public')
      .select('*');
    if (error || !data?.length) {
      if (error) console.error('Academy home pricing fetch error:', error);
      return null;
    }

    const programs = data.map(transformProgramRow);
    const courses: Record<string, CoursePrice> = {};
    let bundle: CoursePrice | undefined;
    let earlyBirdActive = false;
    let individualTotal = 0;
    let bundleTotal = 0;

    for (const p of programs) {
      const f = formatProgramPrice(p);
      if (f.earlyBirdActive) earlyBirdActive = true;
      const entry: CoursePrice = { slug: p.slug, current: f.current, original: f.original };

      if (p.slug === BUNDLE_SLUG) {
        bundle = entry;
        bundleTotal = effectivePrice(p);
      } else {
        courses[p.slug] = entry;
        individualTotal += effectivePrice(p);
      }
    }

    // Only claim a saving when the bundle genuinely undercuts the six courses.
    // Rounded DOWN to the nearest 100 so the headline figure never overstates
    // what someone actually saves — the exact number (₹29,995 at current
    // prices) also reads like a typo on a pricing line.
    const saving = individualTotal - bundleTotal;
    const rounded = Math.floor(saving / 100) * 100;
    const bundleSaving =
      bundle && bundleTotal > 0 && rounded > 0 ? inr(rounded) : undefined;

    return { courses, bundle, bundleSaving, earlyBirdActive };
  } catch (e) {
    console.error('Academy home pricing threw:', e);
    return null;
  }
}
