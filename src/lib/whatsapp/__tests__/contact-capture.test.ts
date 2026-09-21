import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fake, eqValue, payloadOf, type FakeCall } from '@/test-utils/fake-supabase';

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});

const recordActivity = vi.fn().mockResolvedValue('act_1');
vi.mock('@/lib/sales/activity', () => ({ recordActivity: (...a: unknown[]) => recordActivity(...a) }));

import { captureEmail, findEmail } from '../contact-capture';

beforeEach(() => {
  fake.reset();
  vi.clearAllMocks();
  fake.respond(() => ({ data: null, error: null }));
});

/**
 * WhatsApp hands us a phone number and nothing else, and a lead with no email
 * cannot be followed up at all — `sequenceStartState` refuses one outright.
 * This is the only route by which a WhatsApp enquiry gets an address.
 */
describe('finding an address in a message', () => {
  it.each([
    ['rohit@acme.in', 'rohit@acme.in'],
    ['sure — rohit@acme.in', 'rohit@acme.in'],
    ['you can reach me at Rohit@Acme.in.', 'rohit@acme.in'],
    ['my email is r.mehra+fm@acme.co.uk, thanks', 'r.mehra+fm@acme.co.uk'],
  ])('reads %o as %o', (text, expected) => {
    // People rarely send a bare address; a pattern that demanded one would
    // miss most of them.
    expect(findEmail(text)).toBe(expected);
  });

  it.each([
    'how much for instagram ads?',
    'call me on 9876543210',
    'we sell coffee @ wholesale',
    '',
  ])('finds nothing in %o', (text) => {
    expect(findEmail(text)).toBeNull();
  });

  it('finds nothing in an empty message', () => {
    expect(findEmail(null)).toBeNull();
  });
});

describe('storing it', () => {
  it('fills the gap and puts it on the timeline', async () => {
    const stored = await captureEmail('lead_1', null, 'rohit@acme.in');

    expect(stored).toBe('rohit@acme.in');
    const update = fake.callsTo('leads', 'update').at(-1);
    expect(payloadOf(update!)).toEqual({ email: 'rohit@acme.in' });
    expect(eqValue(update!, 'id')).toBe('lead_1');
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: 'lead_1', channel: 'whatsapp' }),
    );
  });

  it('never overwrites an address we already hold', async () => {
    // Otherwise a later message could redirect a lead's mail elsewhere.
    const stored = await captureEmail('lead_1', 'known@acme.in', 'other@elsewhere.com');
    expect(stored).toBeNull();
    expect(fake.callsTo('leads', 'update')).toHaveLength(0);
  });

  it('guards the write in SQL too, so two messages cannot race', async () => {
    await captureEmail('lead_1', null, 'rohit@acme.in');
    const update = fake.callsTo('leads', 'update').at(-1) as FakeCall;
    expect(JSON.stringify(update)).toContain('email');
  });

  it('writes nothing when the message holds no address', async () => {
    expect(await captureEmail('lead_1', null, 'what do you charge?')).toBeNull();
    expect(fake.callsTo('leads', 'update')).toHaveLength(0);
  });

  it('never fails the conversation when the write errors', async () => {
    // A person is waiting on the other end; losing their message over a
    // telemetry field would be the worse failure.
    fake.respond((call: FakeCall) =>
      call.table === 'leads' && call.op === 'update'
        ? { data: null, error: { message: 'permission denied', code: '42501' } }
        : { data: null, error: null },
    );
    await expect(captureEmail('lead_1', null, 'rohit@acme.in')).resolves.toBeNull();
  });
});
