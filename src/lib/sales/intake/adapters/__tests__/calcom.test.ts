import { describe, it, expect, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { calcomAdapter } from '../calcom';

afterEach(() => {
  delete process.env.CALCOM_WEBHOOK_SECRET;
});

describe('calcomAdapter', () => {
  it('verifies the x-cal-signature-256 HMAC', () => {
    process.env.CALCOM_WEBHOOK_SECRET = 'cal-secret';
    const rawBody = JSON.stringify({ triggerEvent: 'BOOKING_CREATED', payload: { uid: 'bk_1' } });
    const signature = createHmac('sha256', 'cal-secret').update(rawBody).digest('hex');
    const good = new Request('http://localhost', { method: 'POST', headers: { 'x-cal-signature-256': signature } });
    const bad = new Request('http://localhost', { method: 'POST', headers: { 'x-cal-signature-256': 'nope' } });
    expect(calcomAdapter.verify({ request: good, rawBody })).toBe(true);
    expect(calcomAdapter.verify({ request: bad, rawBody })).toBe(false);
  });

  it('describes a delivery by trigger, booking and time', () => {
    expect(
      calcomAdapter.describe({ triggerEvent: 'BOOKING_CREATED', createdAt: '2026-09-15T06:00:00.000Z', payload: { uid: 'bk_1' } })
    ).toEqual({ externalId: 'BOOKING_CREATED:bk_1:2026-09-15T06:00:00.000Z', eventType: 'BOOKING_CREATED' });
  });
});
