import { describe, it, expect } from 'vitest';
import { nextSendTime } from '../send-window';

const at = (iso: string) => new Date(iso);

describe('nextSendTime (IST 09:00–19:00)', () => {
  it('sends immediately inside the window', () => {
    expect(nextSendTime(at('2026-09-15T04:00:00.000Z')).toISOString()).toBe('2026-09-15T04:00:00.000Z'); // 09:30 IST
    expect(nextSendTime(at('2026-09-15T13:29:00.000Z')).toISOString()).toBe('2026-09-15T13:29:00.000Z'); // 18:59 IST
  });

  it('waits for 09:00 the same day when early', () => {
    expect(nextSendTime(at('2026-09-15T01:00:00.000Z')).toISOString()).toBe('2026-09-15T03:30:00.000Z'); // 06:30 IST
    expect(nextSendTime(at('2026-09-14T20:00:00.000Z')).toISOString()).toBe('2026-09-15T03:30:00.000Z'); // 01:30 IST
  });

  it('waits for 09:00 the next day from 19:00', () => {
    expect(nextSendTime(at('2026-09-15T13:30:00.000Z')).toISOString()).toBe('2026-09-16T03:30:00.000Z'); // 19:00 IST
  });
});
