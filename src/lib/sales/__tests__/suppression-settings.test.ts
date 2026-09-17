import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eqValue, fake, payloadOf } from '@/test-utils/fake-supabase';

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});

import { addSuppression, blocksReceipts, isSuppressed } from '../suppression';
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

describe('blocksReceipts', () => {
  function suppressedAs(...reasons: unknown[]) {
    fake.respond((call) =>
      call.table === 'suppression_list' && eqValue(call, 'email') === 'p@x.com'
        ? { data: reasons.map((reason) => ({ reason })), error: null }
        : { data: [], error: null }
    );
  }

  it.each(['bounced', 'complaint', 'manual', 'deletion_request'])('blocks an address suppressed as %s', async (reason) => {
    suppressedAs(reason);
    await expect(blocksReceipts(' P@X.com ')).resolves.toBe(true);
  });

  it('allows an address suppressed solely as unsubscribed', async () => {
    suppressedAs('unsubscribed');
    await expect(blocksReceipts('p@x.com')).resolves.toBe(false);
  });

  it('blocks when unsubscribed is not the only reason on file', async () => {
    suppressedAs('unsubscribed', 'manual');
    await expect(blocksReceipts('p@x.com')).resolves.toBe(true);
  });

  it('blocks a reason it does not recognise, rather than guess it is harmless', async () => {
    suppressedAs(null);
    await expect(blocksReceipts('p@x.com')).resolves.toBe(true);
  });

  it('allows an address not on the list', async () => {
    fake.respond(() => ({ data: [], error: null }));
    await expect(blocksReceipts('p@x.com')).resolves.toBe(false);
  });

  it.each([
    ['PGRST205', "Could not find the table 'public.suppression_list' in the schema cache"],
    ['42P01', 'relation "public.suppression_list" does not exist'],
  ])('allows the address when the table does not exist yet (%s, before the sales migration)', async (code, message) => {
    fake.respond(() => ({ data: null, error: { code, message } }));
    await expect(blocksReceipts('p@x.com')).resolves.toBe(false);
  });

  it('blocks when the lookup fails for any other reason: the list cannot be ruled out', async () => {
    fake.respond(() => ({ data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }));
    await expect(blocksReceipts('p@x.com')).resolves.toBe(true);
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
    // An unsubscribe never overwrites the reason already on file.
    expect(fake.callsTo('suppression_list', 'update')).toHaveLength(0);
  });

  it.each(['bounced', 'complaint', 'manual', 'deletion_request'] as const)(
    'raises an existing unsubscribe to %s, so the stronger reason is not lost to the one-row-per-address index',
    async (reason) => {
      fake.respond((call) =>
        call.op === 'insert' ? { data: null, error: { code: '23505', message: 'duplicate' } } : { data: null, error: null }
      );

      await addSuppression({ email: 'P@X.com', reason, leadId: 'lead_1' });

      const updates = fake.callsTo('suppression_list', 'update');
      expect(updates).toHaveLength(1);
      expect(payloadOf(updates[0]!)).toEqual({ reason });
      expect(eqValue(updates[0]!, 'email')).toBe('p@x.com');
      expect(eqValue(updates[0]!, 'reason')).toBe('unsubscribed');
    }
  );
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
