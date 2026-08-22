/**
 * How a batch start date is presented across FM Academy.
 *
 * The site previously rendered `starts_at` unconditionally. That row still
 * held 2026-06-05, so for ten weeks after the date passed the home page, the
 * Academy listing and all seven course pages advertised a batch that had
 * already started — with the Razorpay button live underneath it. The
 * countdown helper clamped negative values to zero, so nothing on the page
 * revealed that the date was in the past; the urgency just quietly stopped.
 *
 * Intake is a rolling monthly cohort, so the cadence is the honest framing and
 * a specific date is only worth showing while it is genuinely ahead of us.
 * Everything here degrades to the cadence, which means a stale row can no
 * longer produce a false claim.
 */

export const BATCH_CADENCE = 'New batch every month';
export const BATCH_CADENCE_SHORT = 'Monthly intake';

export interface BatchSchedule {
  /** True only when startsAt exists and is still in the future. */
  isUpcoming: boolean;
  /** "5 June 2026" — present only when isUpcoming. */
  long?: string;
  /** "5 Jun" — present only when isUpcoming. */
  short?: string;
  /** Whole days remaining; present only when isUpcoming. */
  daysUntil?: number;
  /** Always renderable: the date when it is ahead of us, the cadence otherwise. */
  label: string;
  /** Compact variant for cards and chips. */
  shortLabel: string;
}

export function batchSchedule(iso?: string | null): BatchSchedule {
  const t = iso ? new Date(iso).getTime() : NaN;
  const diff = Number.isNaN(t) ? -1 : t - Date.now();

  if (Number.isNaN(t) || diff <= 0) {
    return {
      isUpcoming: false,
      label: BATCH_CADENCE,
      shortLabel: BATCH_CADENCE_SHORT,
    };
  }

  const d = new Date(t);
  const long = d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const short = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return {
    isUpcoming: true,
    long,
    short,
    daysUntil: Math.ceil(diff / 86_400_000),
    label: `Next batch starts ${long}`,
    shortLabel: `Starts ${short}`,
  };
}

/**
 * Seat counts are only worth showing when they say something. "25 of 25 seats
 * remaining" is a scarcity mechanic advertising that nobody has enrolled, so
 * it is suppressed until at least one seat is taken.
 */
export function seatScarcity(seatsTotal?: number | null, seatsTaken?: number | null) {
  if (seatsTotal == null) return { show: false, remaining: null as number | null };
  const taken = seatsTaken || 0;
  const remaining = Math.max(0, seatsTotal - taken);
  return { show: taken > 0 && remaining > 0, remaining };
}
