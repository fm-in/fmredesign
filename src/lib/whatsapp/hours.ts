/**
 * When someone can actually expect an answer.
 *
 * The automatic reply used to say "someone from the team will reply shortly"
 * whatever the hour. At 03:00 on a Sunday that is not reassurance, it is a
 * promise that will be broken by morning — and a broken promise reads worse
 * than no promise at all.
 *
 * Distinct from `sales/send-window.ts`, which decides whether we may *start* a
 * conversation and is a blunt 09:00–19:00 every day. This is about what we
 * tell someone who has already written to us, so it follows the hours the
 * contact page publishes: Mon–Fri 09:00–19:00, Sat 10:00–17:00, closed Sunday.
 *
 * IST is UTC+05:30 all year with no daylight saving, so a fixed offset is
 * exact rather than an approximation.
 */

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/** Opening and closing hour per weekday, 0 = Sunday. `null` is closed. */
const SCHEDULE: readonly (readonly [number, number] | null)[] = [
  null, // Sunday
  [9, 19],
  [9, 19],
  [9, 19],
  [9, 19],
  [9, 19],
  [10, 17], // Saturday
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export interface BusinessHours {
  open: boolean;
  /** How to describe when they will hear back, mid-sentence. */
  phrase: string;
}

/** `now` shifted into IST, so `getUTC*` reads as local Indian time. */
function ist(now: Date): Date {
  return new Date(now.getTime() + IST_OFFSET_MS);
}

function opensAt(day: number): number | null {
  return SCHEDULE[day]?.[0] ?? null;
}

/**
 * Whether we are open, and how to phrase the wait if not.
 *
 * The phrasing is deliberately vague at the edges — "first thing tomorrow"
 * rather than "at 09:00" — because a specific time is a commitment that a
 * public holiday or a busy morning will break.
 */
export function businessHours(now: Date): BusinessHours {
  const local = ist(now);
  const day = local.getUTCDay();
  const hour = local.getUTCHours();
  const today = SCHEDULE[day];

  if (today && hour >= today[0] && hour < today[1]) {
    return { open: true, phrase: 'shortly' };
  }

  // Before opening on a day we work: later the same morning.
  if (today && hour < today[0]) {
    return { open: false, phrase: 'first thing this morning' };
  }

  // Otherwise the next day that has hours at all.
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const candidate = (day + ahead) % 7;
    if (opensAt(candidate) === null) continue;
    if (ahead === 1) return { open: false, phrase: 'first thing tomorrow' };
    return { open: false, phrase: `on ${DAY_NAMES[candidate]}` };
  }

  // Unreachable while any day has hours, but never leave the caller without
  // something renderable — an empty phrase would read as a broken sentence.
  return { open: false, phrase: 'as soon as we can' };
}

/** The next moment we are open, for anything that needs a timestamp rather than words. */
export function nextOpening(now: Date): Date {
  const local = ist(now);
  const day = local.getUTCDay();
  const hour = local.getUTCHours();
  const today = SCHEDULE[day];

  if (today && hour >= today[0] && hour < today[1]) return now;

  const startOfLocalDay = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());

  if (today && hour < today[0]) {
    return new Date(startOfLocalDay + today[0] * 3_600_000 - IST_OFFSET_MS);
  }

  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const candidate = (day + ahead) % 7;
    const opens = opensAt(candidate);
    if (opens === null) continue;
    return new Date(startOfLocalDay + ahead * DAY_MS + opens * 3_600_000 - IST_OFFSET_MS);
  }

  return now;
}
