/**
 * Sales messages go out only between 09:00 and 19:00 India time.
 * IST is UTC+05:30 all year (no daylight saving), so a fixed offset is exact.
 */

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

export const SEND_WINDOW_START_HOUR = 9;
export const SEND_WINDOW_END_HOUR = 19;

/** `now` if inside the window, otherwise the next 09:00 IST. */
export function nextSendTime(now: Date): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const hour = ist.getUTCHours();
  if (hour >= SEND_WINDOW_START_HOUR && hour < SEND_WINDOW_END_HOUR) return now;

  const todayOpening = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), SEND_WINDOW_START_HOUR);
  const opening = hour >= SEND_WINDOW_END_HOUR ? todayOpening + DAY_MS : todayOpening;
  return new Date(opening - IST_OFFSET_MS);
}

/**
 * True when `now` is inside sending hours.
 *
 * Email schedules around the window with `nextSendTime`, because a queued
 * send can simply wait. A WhatsApp template cannot be deferred the same way
 * without losing the thread of what it answers, so its sender asks this
 * instead and refuses outright.
 */
export function isWithinSendWindow(now: Date): boolean {
  return nextSendTime(now).getTime() === now.getTime();
}
