import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eqValue, fake, payloadOf } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';

const mocks = vi.hoisted(() => ({
  send: vi.fn(async (_event: unknown) => undefined),
  get: vi.fn(async (_id: string) => ({ data: { text: 'Yes, Tuesday works for a call.', html: null }, error: null })),
  forward: vi.fn(async (_options: unknown) => ({ data: { id: 'fwd_1' }, error: null })),
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: mocks.send } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));
vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { receiving: { get: mocks.get, forward: mocks.forward } } }),
}));

import { extractAddress, handleResendEvent } from '../replies';

function respond(options: { leadFound: boolean; activeSequence?: boolean }) {
  fake.respond((call) => {
    if (call.table === 'leads' && call.op === 'select' && eqValue(call, 'email')) {
      return { data: options.leadFound ? [leadRow({ sequence_status: 'active' })] : [], error: null };
    }
    if (call.table === 'leads' && call.op === 'update' && eqValue(call, 'sequence_status') === 'active') {
      return { data: options.activeSequence === false ? [] : [{ id: 'lead_1' }], error: null };
    }
    if (call.table === 'authorized_users') return { data: { id: 'user-1', name: 'Asha', email: 'asha@fm.in' }, error: null };
    return { data: null, error: null };
  });
}

function sentEvents(name: string) {
  return mocks.send.mock.calls
    .map(([event]) => event)
    .filter((event): event is { name: string; data: Record<string, unknown> } =>
      typeof event === 'object' && event !== null && 'name' in event && event.name === name
    );
}

beforeEach(() => {
  fake.reset();
  mocks.send.mockClear();
  mocks.get.mockClear();
  mocks.forward.mockClear();
  process.env.NOTIFICATION_EMAIL = 'team@fm.in';
});

afterEach(() => {
  delete process.env.NOTIFICATION_EMAIL;
});

describe('extractAddress', () => {
  it('reads the address out of a display name', () => {
    expect(extractAddress('Priya Shah <Priya@Example.com>')).toBe('priya@example.com');
    expect(extractAddress('priya@example.com')).toBe('priya@example.com');
    expect(extractAddress('not an address')).toBeUndefined();
  });
});

describe('email.received', () => {
  const received = (subject: string) => ({
    type: 'email.received',
    created_at: '2026-09-15T06:00:00.000Z',
    data: { email_id: 'em_1', from: 'Priya Shah <priya@example.com>', to: ['replies@reply.freakingminds.in'], subject, message_id: '<m1@mail>' },
  });

  it('records the reply, stops the sequence, forwards to the owner and notifies them', async () => {
    respond({ leadFound: true });
    await handleResendEvent(received('Re: Got your message, Priya'));

    const activity = fake.callsTo('lead_activities', 'insert').map(payloadOf).find((p) => p.type === 'email_received');
    expect(activity).toMatchObject({ direction: 'in', body: 'Yes, Tuesday works for a call.' });
    expect(sentEvents('sales/sequence.stop')[0]?.data).toEqual({ leadId: 'lead_1', reason: 'replied' });
    expect(mocks.forward).toHaveBeenCalledWith(expect.objectContaining({ emailId: 'em_1', to: 'asha@fm.in' }));
    expect(sentEvents('notification/send')[0]?.data).toMatchObject({ recipientId: 'user-1', title: 'Priya Shah replied' });
  });

  it('treats an "unsubscribe" reply as an unsubscribe and does not forward it', async () => {
    respond({ leadFound: true });
    await handleResendEvent(received('unsubscribe'));

    expect(fake.callsTo('suppression_list', 'insert').map(payloadOf)[0]).toMatchObject({ email: 'priya@example.com', reason: 'unsubscribed' });
    expect(sentEvents('sales/sequence.stop')[0]?.data).toEqual({ leadId: 'lead_1', reason: 'unsubscribed' });
    expect(mocks.forward).not.toHaveBeenCalled();
  });

  it('forwards mail from an unknown sender to the team', async () => {
    respond({ leadFound: false });
    await handleResendEvent(received('Hello'));
    expect(mocks.forward).toHaveBeenCalledWith(expect.objectContaining({ to: 'team@fm.in' }));
    expect(fake.callsTo('lead_activities', 'insert')).toHaveLength(0);
  });
});

describe('email.bounced', () => {
  it('suppresses the address, stops the sequence and asks the owner to fix the contact', async () => {
    respond({ leadFound: true });
    await handleResendEvent({
      type: 'email.bounced',
      created_at: '2026-09-15T06:00:00.000Z',
      data: { email_id: 'em_2', to: ['priya@example.com'], subject: 'Got your message, Priya' },
    });

    expect(fake.callsTo('suppression_list', 'insert').map(payloadOf)[0]).toMatchObject({ reason: 'bounced' });
    expect(sentEvents('sales/sequence.stop')[0]?.data).toEqual({ leadId: 'lead_1', reason: 'bounced' });
    expect(fake.callsTo('sales_tasks', 'insert').map(payloadOf)[0]).toMatchObject({ title: 'Email bounced: confirm contact details' });
  });
});
