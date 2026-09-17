import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eqValue, fake, ilikeValue, likeMatches, payloadOf, type FakeCall } from '@/test-utils/fake-supabase';

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});

import { addSuppression, blocksReceipts, isSuppressed } from '../suppression';
import { getSalesSettings, parseSalesSettings } from '../settings';

beforeEach(() => fake.reset());

type StoredRow = { id: string; email: string | null; phone_e164: string | null; reason: string };

/**
 * A suppression_list table holding `rows` as stored — including hand-entered,
 * mixed-case addresses — that answers selects and updates the way PostgREST
 * would: `ilike` as case-insensitive LIKE, `eq` as exact, and the unique index
 * on lower(email) / phone_e164 enforced on insert.
 */
function suppressionTable(rows: StoredRow[]): StoredRow[] {
  const matches = (call: FakeCall, row: StoredRow) =>
    call.filters.every((f) => {
      const column = String(f.args[0]) as keyof StoredRow;
      if (f.method === 'eq') return row[column] === f.args[1];
      if (f.method === 'ilike') return typeof row[column] === 'string' && likeMatches(String(f.args[1]), String(row[column]));
      return true;
    });
  fake.respond((call) => {
    if (call.table !== 'suppression_list') return { data: null, error: null };
    if (call.op === 'select') return { data: rows.filter((row) => matches(call, row)), error: null };
    if (call.op === 'update') {
      rows.filter((row) => matches(call, row)).forEach((row) => Object.assign(row, payloadOf(call)));
      return { data: null, error: null };
    }
    if (call.op === 'insert') {
      const incoming = payloadOf(call) as unknown as StoredRow;
      const taken = rows.some(
        (row) =>
          (incoming.email !== null && row.email?.toLowerCase() === incoming.email.toLowerCase()) ||
          (incoming.phone_e164 !== null && row.phone_e164 === incoming.phone_e164)
      );
      if (taken) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
      rows.push(incoming);
    }
    return { data: null, error: null };
  });
  return rows;
}

const stored = (email: string | null, reason: string, phone: string | null = null): StoredRow => ({
  id: `sup_${Math.random().toString(36).slice(2, 7)}`,
  email,
  phone_e164: phone,
  reason,
});

describe('isSuppressed', () => {
  it('matches a stored row whatever case either side uses', async () => {
    suppressionTable([stored('Priya.Shah@Gmail.com', 'unsubscribed')]);
    await expect(isSuppressed({ email: 'priya.shah@gmail.com' })).resolves.toBe(true);
    await expect(isSuppressed({ email: ' PRIYA.SHAH@gmail.com ' })).resolves.toBe(true);
  });

  it('treats "_" and "%" in an address literally', async () => {
    suppressionTable([stored('priyaxshah@example.com', 'unsubscribed'), stored('100real@example.com', 'unsubscribed')]);
    await expect(isSuppressed({ email: 'priya_shah@example.com' })).resolves.toBe(false);
    await expect(isSuppressed({ email: '100%real@example.com' })).resolves.toBe(false);
    await expect(isSuppressed({ email: 'priyaxshah@example.com' })).resolves.toBe(true);
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
  const BLOCKING = ['bounced', 'complaint', 'manual', 'deletion_request'] as const;

  it.each(BLOCKING)('a hand-entered mixed-case %s row blocks the lowercase address', async (reason) => {
    suppressionTable([stored('Priya.Shah@Gmail.com', reason)]);
    await expect(blocksReceipts({ email: 'priya.shah@gmail.com' })).resolves.toBe(true);
    await expect(blocksReceipts({ email: ' Priya.shah@GMAIL.com ' })).resolves.toBe(true);
  });

  it('matches with an escaped, case-insensitive pattern', async () => {
    suppressionTable([]);
    await blocksReceipts({ email: 'Priya_Shah%1@Example.com' });
    const lookup = fake.callsTo('suppression_list', 'select')[0];
    expect(lookup && ilikeValue(lookup, 'email')).toBe('priya\\_shah\\%1@example.com');
  });

  it.each([
    ['_', 'priya_shah@example.com', 'priyaxshah@example.com'],
    ['%', 'priya%@example.com', 'priya.shah@example.com'],
  ])('an address containing "%s" matches only itself', async (_char, address, lookalike) => {
    suppressionTable([stored(lookalike, 'deletion_request')]);
    await expect(blocksReceipts({ email: address })).resolves.toBe(false);

    suppressionTable([stored(lookalike, 'deletion_request'), stored(address.toUpperCase(), 'deletion_request')]);
    await expect(blocksReceipts({ email: address })).resolves.toBe(true);
  });

  it('allows an address suppressed solely as unsubscribed', async () => {
    suppressionTable([stored('P@X.com', 'unsubscribed')]);
    await expect(blocksReceipts({ email: 'p@x.com' })).resolves.toBe(false);
  });

  it('blocks when unsubscribed is not the only reason on file', async () => {
    suppressionTable([stored('p@x.com', 'unsubscribed'), stored('P@X.COM', 'manual')]);
    await expect(blocksReceipts({ email: 'p@x.com' })).resolves.toBe(true);
  });

  it('blocks a reason it does not recognise, rather than guess it is harmless', async () => {
    suppressionTable([stored('p@x.com', 'something_new')]);
    await expect(blocksReceipts({ email: 'p@x.com' })).resolves.toBe(true);
  });

  it('allows an address not on the list', async () => {
    suppressionTable([stored('someone.else@x.com', 'bounced')]);
    await expect(blocksReceipts({ email: 'p@x.com' })).resolves.toBe(false);
  });

  it.each(BLOCKING)('a phone-only %s row blocks the receipt even when the address is clean', async (reason) => {
    suppressionTable([stored(null, reason, '+919833257659')]);
    await expect(blocksReceipts({ email: 'p@x.com', phoneE164: '+919833257659' })).resolves.toBe(true);
    await expect(blocksReceipts({ email: 'p@x.com', phoneE164: '+919900112233' })).resolves.toBe(false);
  });

  it('allows a phone suppressed solely as unsubscribed', async () => {
    suppressionTable([stored(null, 'unsubscribed', '+919833257659')]);
    await expect(blocksReceipts({ email: 'p@x.com', phoneE164: '+919833257659' })).resolves.toBe(false);
  });

  it.each([
    ['PGRST205', "Could not find the table 'public.suppression_list' in the schema cache"],
    ['42P01', 'relation "public.suppression_list" does not exist'],
  ])('allows the address when the table does not exist yet (%s, before the sales migration)', async (code, message) => {
    fake.respond(() => ({ data: null, error: { code, message } }));
    await expect(blocksReceipts({ email: 'p@x.com', phoneE164: '+919833257659' })).resolves.toBe(false);
  });

  it('blocks when the lookup fails for any other reason, logging its code and no address', async () => {
    fake.respond(() => ({ data: null, error: { code: '57014', message: 'canceling statement due to statement timeout for p@x.com' } }));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(blocksReceipts({ email: 'p@x.com' })).resolves.toBe(true);

    const logged = JSON.stringify(error.mock.calls);
    error.mockRestore();
    expect(logged).toContain('57014');
    expect(logged).not.toContain('p@x.com');
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
    'raises a hand-entered, mixed-case unsubscribe to %s, so the stronger reason is not lost to the one-row-per-address index',
    async (reason) => {
      const rows = suppressionTable([stored('Priya.Shah@Gmail.com', 'unsubscribed'), stored('priyaxshah@gmail.com', 'unsubscribed')]);

      await addSuppression({ email: 'priya.shah@gmail.com', reason, leadId: 'lead_1' });

      expect(rows.map((row) => [row.email, row.reason])).toEqual([
        ['Priya.Shah@Gmail.com', reason],
        ['priyaxshah@gmail.com', 'unsubscribed'],
      ]);
    }
  );

  it('upgrades an address containing "_" without touching its look-alike', async () => {
    const rows = suppressionTable([stored('priya_shah@example.com', 'unsubscribed'), stored('priyaxshah@example.com', 'unsubscribed')]);

    await addSuppression({ email: 'Priya_Shah@example.com', reason: 'bounced' });

    expect(rows.map((row) => row.reason)).toEqual(['bounced', 'unsubscribed']);
  });

  it('never downgrades a stronger reason to unsubscribed', async () => {
    const rows = suppressionTable([stored('P@X.com', 'deletion_request')]);
    await addSuppression({ email: 'p@x.com', reason: 'unsubscribed' });
    expect(rows[0]?.reason).toBe('deletion_request');
  });

  it('raises a phone unsubscribe to a stronger reason', async () => {
    const rows = suppressionTable([stored(null, 'unsubscribed', '+919833257659')]);
    await addSuppression({ phoneE164: '+919833257659', reason: 'manual' });
    expect(rows[0]?.reason).toBe('manual');
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
