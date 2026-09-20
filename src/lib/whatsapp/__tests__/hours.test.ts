import { describe, it, expect } from 'vitest';
import { businessHours, nextOpening } from '../hours';

/**
 * Every case is written as the IST wall-clock time it represents, with the UTC
 * instant beside it — IST is UTC+05:30, so 14:00 IST is 08:30Z the same day.
 * Getting that backwards is the easiest mistake to make here.
 */
const ist = (iso: string) => new Date(iso);

describe('businessHours', () => {
  it.each([
    ['Wednesday 14:00 IST', '2026-09-23T08:30:00Z'],
    ['Monday 09:00 IST, the moment we open', '2026-09-21T03:30:00Z'],
    ['Friday 18:59 IST, the last minute', '2026-09-25T13:29:00Z'],
    ['Saturday 12:00 IST', '2026-09-26T06:30:00Z'],
  ])('is open on %s', (_label, iso) => {
    expect(businessHours(ist(iso))).toEqual({ open: true, phrase: 'shortly' });
  });

  it.each([
    ['Wednesday 19:00 IST, the moment we close', '2026-09-23T13:30:00Z'],
    ['Wednesday 23:30 IST', '2026-09-23T18:00:00Z'],
    ['Saturday 17:00 IST, after closing', '2026-09-26T11:30:00Z'],
    ['Sunday noon IST', '2026-09-27T06:30:00Z'],
    ['Monday 08:00 IST, before opening', '2026-09-21T02:30:00Z'],
  ])('is closed on %s', (_label, iso) => {
    expect(businessHours(ist(iso)).open).toBe(false);
  });

  it('says "first thing this morning" before opening on a working day', () => {
    // Monday 07:00 IST — we open at 09:00 the same day.
    expect(businessHours(ist('2026-09-21T01:30:00Z')).phrase).toBe('first thing this morning');
  });

  it('says "first thing tomorrow" after closing on a weekday', () => {
    // Wednesday 21:00 IST — Thursday has hours.
    expect(businessHours(ist('2026-09-23T15:30:00Z')).phrase).toBe('first thing tomorrow');
  });

  it('names the day when the next opening is further off', () => {
    // Saturday 22:00 IST. Sunday is closed, so the answer is Monday — not
    // "tomorrow", which would be wrong and would read as a missed promise.
    expect(businessHours(ist('2026-09-26T16:30:00Z')).phrase).toBe('on Monday');
  });

  it('never promises "tomorrow" on a Saturday night', () => {
    const phrase = businessHours(ist('2026-09-26T16:30:00Z')).phrase;
    expect(phrase).not.toContain('tomorrow');
  });

  it('says "first thing tomorrow" on a Sunday, because Monday is tomorrow', () => {
    expect(businessHours(ist('2026-09-27T06:30:00Z')).phrase).toBe('first thing tomorrow');
  });

  it('always gives something renderable', () => {
    for (let hour = 0; hour < 24 * 7; hour += 1) {
      const at = new Date(Date.UTC(2026, 8, 20) + hour * 3_600_000);
      expect(businessHours(at).phrase.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('nextOpening', () => {
  it('returns now while we are open', () => {
    const now = ist('2026-09-23T08:30:00Z');
    expect(nextOpening(now).getTime()).toBe(now.getTime());
  });

  it('returns 09:00 IST the same day when asked before opening', () => {
    // Monday 07:00 IST -> Monday 09:00 IST, which is 03:30Z.
    expect(nextOpening(ist('2026-09-21T01:30:00Z')).toISOString()).toBe('2026-09-21T03:30:00.000Z');
  });

  it('skips Sunday entirely', () => {
    // Saturday 22:00 IST -> Monday 09:00 IST.
    expect(nextOpening(ist('2026-09-26T16:30:00Z')).toISOString()).toBe('2026-09-28T03:30:00.000Z');
  });

  it('uses Saturday’s later opening, not the weekday one', () => {
    // Friday 22:00 IST -> Saturday 10:00 IST, which is 04:30Z.
    expect(nextOpening(ist('2026-09-25T16:30:00Z')).toISOString()).toBe('2026-09-26T04:30:00.000Z');
  });

  it('is always in the future when we are shut', () => {
    for (let hour = 0; hour < 24 * 7; hour += 1) {
      const at = new Date(Date.UTC(2026, 8, 20) + hour * 3_600_000);
      if (businessHours(at).open) continue;
      expect(nextOpening(at).getTime()).toBeGreaterThan(at.getTime());
    }
  });
});
