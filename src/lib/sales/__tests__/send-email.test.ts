import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fake, payloadOf } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';

const mocks = vi.hoisted(() => ({
  send: vi.fn<(payload: unknown, options?: unknown) => Promise<{ data: { id: string }; error: null }>>(async () => ({
    data: { id: 'resend_123' },
    error: null,
  })),
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/email/resend', () => ({ getResend: () => ({ emails: { send: mocks.send } }) }));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn(async () => undefined) } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));

import { sendSalesEmail } from '../send-email';

const settings = { automationEnabled: true, bookingLink: 'fm-in/15min' };

beforeEach(() => {
  fake.reset();
  mocks.send.mockClear();
  process.env.SALES_REPLY_TO = 'replies@reply.freakingminds.in';
  process.env.SALES_LINK_SECRET = 'test-secret-with-enough-length';
});

afterEach(() => {
  delete process.env.SALES_REPLY_TO;
  delete process.env.SALES_LINK_SECRET;
});

describe('sendSalesEmail', () => {
  it('refuses a lead without consent', async () => {
    const outcome = await sendSalesEmail({ lead: leadRow({ consent_basis: 'none' }), template: 'instant_reply', settings, ownerName: 'Asha' });
    expect(outcome).toEqual({ sent: false, reason: 'no_consent' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('refuses a suppressed address', async () => {
    fake.respond((call) => (call.table === 'suppression_list' ? { data: [{ id: 'sup_1' }], error: null } : { data: null, error: null }));
    const outcome = await sendSalesEmail({ lead: leadRow(), template: 'instant_reply', settings, ownerName: 'Asha' });
    expect(outcome).toEqual({ sent: false, reason: 'suppressed' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('reports not_configured without a reply-to address', async () => {
    delete process.env.SALES_REPLY_TO;
    const outcome = await sendSalesEmail({ lead: leadRow(), template: 'instant_reply', settings, ownerName: 'Asha' });
    expect(outcome).toEqual({ sent: false, reason: 'not_configured' });
  });

  it('sends with unsubscribe headers and records the email on the timeline', async () => {
    const outcome = await sendSalesEmail({ lead: leadRow(), template: 'instant_reply', settings, ownerName: 'Asha' });

    expect(outcome).toEqual({ sent: true, messageId: 'resend_123' });
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'priya@example.com',
        replyTo: 'replies@reply.freakingminds.in',
        headers: expect.objectContaining({ 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }),
      }),
      expect.anything()
    );
    const activity = fake.callsTo('lead_activities', 'insert').map(payloadOf).find((p) => p.type === 'email_sent');
    expect(activity).toMatchObject({ provider_message_id: 'resend_123', direction: 'out' });
  });

  it('sends with an idempotency key, so a retried step never sends the same email twice', async () => {
    await sendSalesEmail({ lead: leadRow(), template: 'instant_reply', settings, ownerName: 'Asha' });

    expect(mocks.send.mock.calls[0]?.[1]).toEqual({ idempotencyKey: 'sales:lead_1:instant_reply' });
  });
});
