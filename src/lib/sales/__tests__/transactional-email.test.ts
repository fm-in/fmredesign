import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fake } from '@/test-utils/fake-supabase';

type SendResult = { data: { id: string } | null; error: { message: string; name?: string } | null };

const mocks = vi.hoisted(() => ({
  configured: { current: true },
  send: vi.fn<(payload: Record<string, unknown>, options?: unknown) => Promise<SendResult>>(async () => ({
    data: { id: 'resend_rcpt_1' },
    error: null,
  })),
  after: vi.fn<(task: () => Promise<void>) => void>(),
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/email/resend', () => ({
  getResend: () => (mocks.configured.current ? { emails: { send: mocks.send } } : null),
}));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn(async () => undefined) } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: mocks.after,
}));

import { afterResponse, sendTransactionalEmail } from '../transactional-email';

const email = {
  subject: "We've got your enquiry",
  html: '<p>Hi Priya, secret body</p>',
  text: 'Hi Priya, secret body',
};

const ADDRESS = 'priya.shah@example.com';

beforeEach(() => {
  fake.reset();
  fake.respond(() => ({ data: [], error: null }));
  mocks.configured.current = true;
  mocks.send.mockClear();
  mocks.after.mockReset();
  delete process.env.SALES_REPLY_TO;
  delete process.env.SALES_FROM_EMAIL;
  delete process.env.NOTIFICATION_EMAIL;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.SALES_REPLY_TO;
  delete process.env.SALES_FROM_EMAIL;
  delete process.env.NOTIFICATION_EMAIL;
});

function sentPayload(): Record<string, unknown> {
  const payload = mocks.send.mock.calls[0]?.[0];
  if (!payload) throw new Error('nothing was sent');
  return payload;
}

/** Every argument passed to console.error/warn/log, flattened to one string. */
function logged(...spies: Array<{ mock: { calls: unknown[][] } }>): string {
  return spies.flatMap((spy) => spy.mock.calls.flat()).map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join('\n');
}

describe('sendTransactionalEmail', () => {
  it('sends the html with its plain-text alternative from the default sales sender, replying to SALES_REPLY_TO', async () => {
    process.env.SALES_REPLY_TO = 'replies@reply.freakingminds.in';
    process.env.NOTIFICATION_EMAIL = 'team@freakingminds.in';

    const outcome = await sendTransactionalEmail({ to: ADDRESS, template: 'enquiry_receipt', email });

    expect(outcome).toEqual({ sent: true, messageId: 'resend_rcpt_1' });
    expect(sentPayload()).toMatchObject({
      from: 'FreakingMinds <hello@freakingminds.in>',
      to: ADDRESS,
      replyTo: 'replies@reply.freakingminds.in',
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  });

  it('uses SALES_FROM_EMAIL when it is set', async () => {
    process.env.SALES_FROM_EMAIL = 'FreakingMinds Team <team@freakingminds.in>';
    await sendTransactionalEmail({ to: ADDRESS, template: 'enquiry_receipt', email });
    expect(sentPayload().from).toBe('FreakingMinds Team <team@freakingminds.in>');
  });

  it('replies to NOTIFICATION_EMAIL until SALES_REPLY_TO is configured', async () => {
    process.env.NOTIFICATION_EMAIL = 'team@freakingminds.in';
    await sendTransactionalEmail({ to: ADDRESS, template: 'academy_reserved', email });
    expect(sentPayload().replyTo).toBe('team@freakingminds.in');
  });

  it('carries no List-Unsubscribe header: a receipt is not a mailing', async () => {
    process.env.SALES_REPLY_TO = 'replies@reply.freakingminds.in';
    await sendTransactionalEmail({ to: ADDRESS, template: 'enquiry_receipt', email });
    expect(JSON.stringify(sentPayload())).not.toMatch(/list-unsubscribe/i);
  });

  it('sends nothing without an address', async () => {
    await expect(sendTransactionalEmail({ to: '  ', template: 'enquiry_receipt', email })).resolves.toEqual({ sent: false, reason: 'no_email' });
    await expect(sendTransactionalEmail({ to: null, template: 'enquiry_receipt', email })).resolves.toEqual({ sent: false, reason: 'no_email' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('sends nothing when Resend is not configured', async () => {
    mocks.configured.current = false;
    await expect(sendTransactionalEmail({ to: ADDRESS, template: 'enquiry_receipt', email })).resolves.toEqual({
      sent: false,
      reason: 'not_configured',
    });
  });

  it.each(['bounced', 'complaint', 'manual', 'deletion_request'])('silently skips an address suppressed as %s', async (reason) => {
    fake.respond((call) => (call.table === 'suppression_list' ? { data: [{ reason }], error: null } : { data: [], error: null }));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const outcome = await sendTransactionalEmail({ to: ADDRESS, template: 'enquiry_receipt', email });

    expect(outcome).toEqual({ sent: false, reason: 'suppressed' });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('sends nothing when the do-not-contact list cannot be checked', async () => {
    fake.respond(() => ({ data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(sendTransactionalEmail({ to: ADDRESS, template: 'enquiry_receipt', email })).resolves.toEqual({
      sent: false,
      reason: 'suppressed',
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('still sends to an address that only unsubscribed from sales email', async () => {
    fake.respond((call) => (call.table === 'suppression_list' ? { data: [{ reason: 'unsubscribed' }], error: null } : { data: [], error: null }));
    await expect(sendTransactionalEmail({ to: ADDRESS, template: 'enquiry_receipt', email })).resolves.toMatchObject({ sent: true });
  });

  it('never throws when Resend reports an error, and logs neither the address nor the body', async () => {
    mocks.send.mockResolvedValueOnce({ data: null, error: { name: 'validation_error', message: `Invalid \`to\` field: ${ADDRESS}` } });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const outcome = await sendTransactionalEmail({ to: ADDRESS, template: 'enquiry_receipt', email });

    expect(outcome).toEqual({ sent: false, reason: 'failed' });
    expect(error).toHaveBeenCalled();
    const output = logged(error, warn, log);
    expect(output).toContain('Invalid `to` field');
    expect(output).not.toContain(ADDRESS);
    expect(output).not.toContain('secret body');
  });

  it('never throws when the Resend client itself throws', async () => {
    mocks.send.mockRejectedValueOnce(new Error(`fetch failed for ${ADDRESS}`));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(sendTransactionalEmail({ to: ADDRESS, template: 'academy_reserved', email })).resolves.toEqual({
      sent: false,
      reason: 'failed',
    });
    expect(logged(error)).not.toContain(ADDRESS);
  });
});

describe('afterResponse', () => {
  it("hands the task to Next's after(), so it runs once the response has gone", async () => {
    const task = vi.fn(async () => undefined);
    afterResponse('enquiry receipt', task);

    expect(task).not.toHaveBeenCalled();
    expect(mocks.after).toHaveBeenCalledTimes(1);
    await mocks.after.mock.calls[0]?.[0]();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('swallows and logs a failing task, without the address', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    afterResponse('enquiry receipt', async () => {
      throw new Error(`boom for ${ADDRESS}`);
    });

    await expect(mocks.after.mock.calls[0]?.[0]()).resolves.toBeUndefined();
    expect(logged(error)).toContain('boom for');
    expect(logged(error)).not.toContain(ADDRESS);
  });

  it('runs the task detached when after() is unavailable, never throwing to the caller', async () => {
    mocks.after.mockImplementation(() => {
      throw new Error('`after` was called outside a request scope');
    });
    const task = vi.fn(async () => undefined);

    expect(() => afterResponse('enquiry receipt', task)).not.toThrow();
    await vi.waitFor(() => expect(task).toHaveBeenCalledTimes(1));
  });
});
