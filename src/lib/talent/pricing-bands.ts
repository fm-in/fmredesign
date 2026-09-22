/**
 * How we ask what someone charges.
 *
 * The application used to demand a min AND a max for at least one of hourly,
 * project and retainer — six numbers plus a currency, at step four of four.
 * Three things went wrong with that. It asked for a precision that does not
 * exist, because a project rate genuinely depends on the project. "Max" is
 * close to unanswerable: the most you would ever charge? And it read as a
 * commitment to a company the applicant had never worked with, which is a
 * good reason to close the tab.
 *
 * A browsing client is filtering, not buying. They need to know whether
 * someone is roughly in budget. That is a band, and a band is one tap.
 *
 * The scales differ by model, which the old form did not account for at all:
 * an hourly range and a retainer range are not the same numbers.
 */

export type PricingModel = 'hourly' | 'project' | 'retainer';

export interface PricingBand {
  id: string;
  label: string;
  /** In the applicant's own currency. `max: null` means "and above". */
  min: number;
  max: number | null;
}

export const PRICING_MODELS: readonly { id: PricingModel; label: string; hint: string }[] = [
  { id: 'hourly', label: 'By the hour', hint: 'You bill time' },
  { id: 'project', label: 'Per project', hint: 'You quote the job' },
  { id: 'retainer', label: 'Monthly retainer', hint: 'You hold time each month' },
];

/**
 * Indian rupees. Chosen to match how work is actually quoted here rather than
 * by dividing a range evenly — the gaps between a ₹10k logo, a ₹50k identity
 * and a ₹3L brand system are where the real decisions sit.
 */
const INR_BANDS: Record<PricingModel, PricingBand[]> = {
  hourly: [
    { id: 'h1', label: 'Under ₹500', min: 0, max: 500 },
    { id: 'h2', label: '₹500 – 1,000', min: 500, max: 1000 },
    { id: 'h3', label: '₹1,000 – 2,000', min: 1000, max: 2000 },
    { id: 'h4', label: '₹2,000 – 4,000', min: 2000, max: 4000 },
    { id: 'h5', label: '₹4,000+', min: 4000, max: null },
  ],
  project: [
    { id: 'p1', label: 'Under ₹10,000', min: 0, max: 10000 },
    { id: 'p2', label: '₹10,000 – 25,000', min: 10000, max: 25000 },
    { id: 'p3', label: '₹25,000 – 50,000', min: 25000, max: 50000 },
    { id: 'p4', label: '₹50,000 – 1,00,000', min: 50000, max: 100000 },
    { id: 'p5', label: '₹1,00,000 – 3,00,000', min: 100000, max: 300000 },
    { id: 'p6', label: '₹3,00,000+', min: 300000, max: null },
  ],
  retainer: [
    { id: 'r1', label: 'Under ₹25,000 / month', min: 0, max: 25000 },
    { id: 'r2', label: '₹25,000 – 50,000 / month', min: 25000, max: 50000 },
    { id: 'r3', label: '₹50,000 – 1,00,000 / month', min: 50000, max: 100000 },
    { id: 'r4', label: '₹1,00,000 – 2,00,000 / month', min: 100000, max: 200000 },
    { id: 'r5', label: '₹2,00,000+ / month', min: 200000, max: null },
  ],
};

/** Everywhere that is not India. Roughly a hundredth of the rupee scale, rounded to how people quote. */
const USD_BANDS: Record<PricingModel, PricingBand[]> = {
  hourly: [
    { id: 'h1', label: 'Under $15', min: 0, max: 15 },
    { id: 'h2', label: '$15 – 30', min: 15, max: 30 },
    { id: 'h3', label: '$30 – 60', min: 30, max: 60 },
    { id: 'h4', label: '$60 – 120', min: 60, max: 120 },
    { id: 'h5', label: '$120+', min: 120, max: null },
  ],
  project: [
    { id: 'p1', label: 'Under $250', min: 0, max: 250 },
    { id: 'p2', label: '$250 – 750', min: 250, max: 750 },
    { id: 'p3', label: '$750 – 1,500', min: 750, max: 1500 },
    { id: 'p4', label: '$1,500 – 3,000', min: 1500, max: 3000 },
    { id: 'p5', label: '$3,000 – 10,000', min: 3000, max: 10000 },
    { id: 'p6', label: '$10,000+', min: 10000, max: null },
  ],
  retainer: [
    { id: 'r1', label: 'Under $750 / month', min: 0, max: 750 },
    { id: 'r2', label: '$750 – 1,500 / month', min: 750, max: 1500 },
    { id: 'r3', label: '$1,500 – 3,000 / month', min: 1500, max: 3000 },
    { id: 'r4', label: '$3,000 – 6,000 / month', min: 3000, max: 6000 },
    { id: 'r5', label: '$6,000+ / month', min: 6000, max: null },
  ],
};

export function bandsFor(model: PricingModel, currency: string): PricingBand[] {
  return (currency === 'INR' ? INR_BANDS : USD_BANDS)[model];
}

export function findBand(model: PricingModel, currency: string, bandId: string): PricingBand | null {
  return bandsFor(model, currency).find((b) => b.id === bandId) ?? null;
}

/**
 * The shape `talent_applications.pricing` has always held, filled from the one
 * band the applicant chose.
 *
 * Only the chosen model carries numbers; the other two stay at zero, which is
 * what "not stated" has always looked like in this column. Keeping the shape
 * means the admin grid and the public profile need no changes — they already
 * read every rate defensively.
 *
 * `max: null` means "and above", stored as 0: a maximum of zero cannot be a
 * real ceiling, and every reader already treats 0 as absent.
 */
export function toPricingInfo(model: PricingModel, band: PricingBand) {
  const blank = { min: 0, max: 0 };
  const chosen = { min: band.min, max: band.max ?? 0 };
  return {
    hourlyRate: model === 'hourly' ? chosen : { ...blank },
    projectRate: model === 'project' ? chosen : { ...blank },
    retainerRate: model === 'retainer' ? chosen : { ...blank },
    openToNegotiation: true,
  };
}
