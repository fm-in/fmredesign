import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  batchSchedule,
  seatScarcity,
  BATCH_CADENCE,
  BATCH_CADENCE_SHORT,
} from '../schedule';

/**
 * The bug these guard against: `starts_at` held 2026-06-05 and the site kept
 * rendering it for ten weeks after it passed, with checkout live underneath.
 * The old countdown clamped negatives to zero, so a past date looked
 * indistinguishable from an imminent one.
 */
afterEach(() => vi.useRealTimers());

const at = (iso: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
};

describe('batchSchedule', () => {
  it('shows the date while it is still ahead of us', () => {
    at('2026-08-22T10:00:00Z');
    const s = batchSchedule('2026-09-05T00:00:00Z');
    expect(s.isUpcoming).toBe(true);
    expect(s.long).toContain('September');
    expect(s.label).toBe(`Next batch starts ${s.long}`);
    expect(s.daysUntil).toBeGreaterThan(0);
  });

  it('falls back to the cadence once the date has passed', () => {
    at('2026-08-22T10:00:00Z');
    const s = batchSchedule('2026-06-05T00:00:00Z'); // the real stale row
    expect(s.isUpcoming).toBe(false);
    expect(s.label).toBe(BATCH_CADENCE);
    expect(s.shortLabel).toBe(BATCH_CADENCE_SHORT);
    expect(s.long).toBeUndefined();
    expect(s.daysUntil).toBeUndefined();
  });

  it('never reports a past date as zero days away', () => {
    at('2026-08-22T10:00:00Z');
    // the old helper returned 0 here, which read as "starting today"
    expect(batchSchedule('2026-06-05T00:00:00Z').daysUntil).toBeUndefined();
  });

  it('treats the exact start moment as no longer upcoming', () => {
    at('2026-09-05T00:00:00Z');
    expect(batchSchedule('2026-09-05T00:00:00Z').isUpcoming).toBe(false);
  });

  it('degrades to the cadence for missing or unparseable input', () => {
    for (const v of [undefined, null, '', 'not-a-date']) {
      const s = batchSchedule(v as string | null | undefined);
      expect(s.isUpcoming).toBe(false);
      expect(s.label).toBe(BATCH_CADENCE);
    }
  });

  it('always returns something renderable', () => {
    at('2026-08-22T10:00:00Z');
    for (const v of [undefined, '2026-06-05', '2027-01-01']) {
      const s = batchSchedule(v);
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.shortLabel.length).toBeGreaterThan(0);
    }
  });
});

describe('seatScarcity', () => {
  it('stays hidden when no seat has been taken', () => {
    // "25 of 25 seats remaining" advertises that nobody enrolled
    expect(seatScarcity(25, 0)).toEqual({ show: false, remaining: 25 });
    expect(seatScarcity(25, null)).toEqual({ show: false, remaining: 25 });
  });

  it('shows once enrolment has actually started', () => {
    expect(seatScarcity(25, 7)).toEqual({ show: true, remaining: 18 });
  });

  it('hides at zero remaining so the sold-out branch owns that case', () => {
    expect(seatScarcity(25, 25)).toEqual({ show: false, remaining: 0 });
  });

  it('never reports negative remaining when overbooked', () => {
    expect(seatScarcity(25, 30).remaining).toBe(0);
  });

  it('reports nothing when capacity is unknown', () => {
    expect(seatScarcity(null, 5)).toEqual({ show: false, remaining: null });
  });
});
