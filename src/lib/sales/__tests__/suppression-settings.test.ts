import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eqValue, fake, payloadOf } from '@/test-utils/fake-supabase';

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});

import { addSuppression, isSuppressed, isUndeliverable } from '../suppression';
import { getSalesSettings, parseSalesSettings } from '../settings';

beforeEach(() => fake.reset());

describe('isSuppressed', () => {
  it('matches a lowercased email', async () => {
    fake.respond((call) =>
      call.table === 'suppression_list' && eqValue(call, 'email') === 'p@x.com'
        ? { data: [{ id: 'sup_1' }], error: null }
        : { data: [], error: null }
    );
    await expect(isSuppressed({ email: 'P@X.com' })).resolves.toBe(true);
  });

  it('matches a phone number', async () => {
    fake.respond((call) =>
      eqValue(call, 'phone_e164') === '+919833257659' ? { data: [{ id: 'sup_2' }], error: null } : { data: [], error: null }
    );
    await expect(isSuppressed({ email: 'p@x.com', phoneE164: '+919833257659' })).resolves.toBe(true);
  });

  it('is false without contact details and does not query', async () => {
    await expect(isSuppressed({})).resolves.toBe(false);
    expect(fake.calls).toHaveLength(0);
  });
});

describe('isUndeliverable', () => {
  function suppressedAs(reason: string) {
    fake.respond((call) =>
      call.table === 'suppression_list' && eqValue(call, 'email') === 'p@x.com'
        ? { data: [{ reason }], error: null }
        : { data: [], error: null }
    );
  }

  it.each(['bounced', 'complaint'])('is true for an address suppressed as %s', async (reason) => {
    suppressedAs(reason);
    await expect(isUndeliverable(' P@X.com ')).resolves.toBe(true);
  });

  it.each(['unsubscribed', 'deletion_request', 'manual'])('is false for an address suppressed as %s', async (reason) => {
    suppressedAs(reason);
    await expect(isUndeliverable('p@x.com')).resolves.toBe(false);
  });

  it('is false for an address not on the list', async () => {
    fake.respond(() => ({ data: [], error: null }));
    await expect(isUndeliverable('p@x.com')).resolves.toBe(false);
  });

  it('is false when the lookup fails, e.g. before the sales migration', async () => {
    fake.respond(() => ({ data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.suppression_list'" } }));
    await expect(isUndeliverable('p@x.com')).resolves.toBe(false);
  });
});

describe('addSuppression', () => {
  it('writes one row per contact method and tolerates duplicates', async () => {
    fake.respond((call) =>
      call.op === 'insert' && payloadOf(call).email ? { data: null, error: { code: '23505', message: 'duplicate' } } : { data: null, error: null }
    );
    await expect(
      addSuppression({ email: 'P@X.com', phoneE164: '+919833257659', reason: 'unsubscribed', leadId: 'lead_1' })
    ).resolves.toBeUndefined();
    const rows = fake.callsTo('suppression_list', 'insert').map(payloadOf);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ email: 'p@x.com', phone_e164: null, reason: 'unsubscribed' });
    expect(rows[1]).toMatchObject({ email: null, phone_e164: '+919833257659' });
  });
});

describe('sales settings', () => {
  it('defaults safely', () => {
    expect(parseSalesSettings(null)).toEqual({
      automationEnabled: false,
      bookingLink: 'fm-in/15min',
      bookingLinkLong: 'fm-in/30min',
    });
  });

  it('enables automation only on an explicit true', () => {
    expect(parseSalesSettings({ automationEnabled: 'yes' }).automationEnabled).toBe(false);
    expect(parseSalesSettings({ automationEnabled: true, bookingLink: ' fm-in/30min ' })).toEqual({
      automationEnabled: true,
      bookingLink: 'fm-in/30min',
      bookingLinkLong: 'fm-in/30min',
    });
  });

  it('reads the settings row', async () => {
    fake.respond((call) =>
      call.table === 'admin_settings' ? { data: { sales: { automationEnabled: true } }, error: null } : { data: null, error: null }
    );
    await expect(getSalesSettings()).resolves.toEqual({
      automationEnabled: true,
      bookingLink: 'fm-in/15min',
      bookingLinkLong: 'fm-in/30min',
    });
  });

  it('uses a stored bookingLinkLong value', () => {
    expect(parseSalesSettings({ bookingLinkLong: 'fm-in/45min' }).bookingLinkLong).toBe('fm-in/45min');
  });

  it('falls back to the default bookingLinkLong when stored as empty or whitespace', () => {
    expect(parseSalesSettings({ bookingLinkLong: '' }).bookingLinkLong).toBe('fm-in/30min');
    expect(parseSalesSettings({ bookingLinkLong: '   ' }).bookingLinkLong).toBe('fm-in/30min');
  });
});
