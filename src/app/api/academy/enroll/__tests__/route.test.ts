/**
 * POST /api/academy/enroll with the body ReserveSeatForm really sends, against
 * a programme row shaped and valued like scripts/seed-creator-program.ts. The
 * programme responder returns only the columns the route selects, so a
 * receipt field the route forgot to load shows up here, not in production.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fake, payloadOf, selectedColumns } from '@/test-utils/fake-supabase';
import { reserveSeatBody } from '@/test-utils/public-form-bodies';

type SendResult = { data: { id: string } | null; error: { message: string } | null };

const mocks = vi.hoisted(() => ({
  resendSend: vi.fn<(payload: Record<string, unknown>, options?: unknown) => Promise<SendResult>>(async () => ({
    data: { id: 'resend_rcpt_1' },
    error: null,
  })),
  createOrder: vi.fn(async (input: { amountInr: number }) => ({ id: 'order_Q1w2e3r4t5', amount: input.amountInr * 100, currency: 'INR' })),
  afterTasks: [] as Array<() => Promise<void>>,
  existing: { current: [] as Array<Record<string, unknown>> },
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/email/resend', () => ({ getResend: () => ({ emails: { send: mocks.resendSend } }) }));
vi.mock('@/lib/razorpay', () => ({ createOrder: mocks.createOrder }));
vi.mock('@/lib/notifications', () => ({ notifyAdmins: vi.fn(async () => undefined) }));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn(async () => undefined) } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (task: () => Promise<void>) => {
    mocks.afterTasks.push(task);
  },
}));

import { POST } from '../route';

/** The seeded Digital Marketing course (scripts/seed-creator-program.ts), as a full `programs` row. */
const SEEDED_PROGRAM: Record<string, unknown> = {
  id: 'prog-digital-marketing-2026-06',
  slug: 'digital-marketing',
  title: 'Digital Marketing',
  format: 'cohort',
  status: 'open',
  short_description: 'Learn how brands grow online — strategy, social, SEO, content planning, analytics and digital growth — taught from an agency floor in Bhopal.',
  price_inr: 29999,
  early_bird_price_inr: 24999,
  early_bird_until: new Date('2026-06-04T18:30:00+05:30').toISOString(),
  currency: 'INR',
  starts_at: new Date('2026-06-05T15:30:00+05:30').toISOString(),
  ends_at: new Date('2026-07-20T15:30:00+05:30').toISOString(),
  seats_total: 25,
  seats_taken: 0,
  instructor_name: 'The Freaking Minds Team',
  payment_link_url: null,
};

let program: Record<string, unknown> = SEEDED_PROGRAM;
let ipCounter = 0;

function enrol(body: Record<string, unknown>): NextRequest {
  ipCounter += 1;
  return new NextRequest('http://localhost/api/academy/enroll', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.1.0.${ipCounter}` },
    body: JSON.stringify(body),
  });
}

const aaravReserves = () =>
  reserveSeatBody({
    programId: 'prog-digital-marketing-2026-06',
    name: ' Aarav Gupta ',
    email: ' Aarav.Gupta@example.com ',
    phone: '98765 43210',
    message: 'I run a small bakery and want to do our own Instagram.',
  });

async function flushAfterResponse(): Promise<void> {
  const tasks = mocks.afterTasks.splice(0);
  for (const task of tasks) await task();
}

function sentEmails(): Array<Record<string, unknown>> {
  return mocks.resendSend.mock.calls.map((call) => call[0]);
}

/** The response with the generated enrolment id replaced, so two reservations can be compared. */
async function normalised(res: Response): Promise<{ status: number; body: unknown }> {
  const body = (await res.json()) as { data?: { id?: string } };
  if (body.data?.id) body.data.id = 'ENROLMENT_ID';
  return { status: res.status, body };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-17T06:00:00.000Z'));
  fake.reset();
  mocks.afterTasks.length = 0;
  mocks.resendSend.mockClear();
  mocks.createOrder.mockClear();
  mocks.existing.current = [];
  program = SEEDED_PROGRAM;
  process.env.SALES_REPLY_TO = 'replies@reply.freakingminds.in';
  fake.respond((call) => {
    if (call.table === 'programs') return { data: selectedColumns(call, program), error: null };
    if (call.table === 'enrollments' && call.op === 'select') return { data: mocks.existing.current, error: null };
    if (call.table === 'enrollments' && call.op === 'insert') {
      return { data: { ...payloadOf(call), created_at: '2026-09-17T06:00:00.000Z' }, error: null };
    }
    if (call.table === 'suppression_list') return { data: [], error: null };
    return { data: null, error: null };
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete process.env.SALES_REPLY_TO;
});

describe('POST /api/academy/enroll reservation receipt', () => {
  it('sends the buyer the reservation receipt after the response, with the programme page and an upcoming start date', async () => {
    program = { ...SEEDED_PROGRAM, starts_at: new Date('2026-10-12T21:00:00+05:30').toISOString() };

    const res = await POST(enrol(aaravReserves()));

    expect(res.status).toBe(200);
    expect(mocks.resendSend).not.toHaveBeenCalled();
    await flushAfterResponse();

    expect(sentEmails()).toHaveLength(1);
    const sent = sentEmails()[0];
    expect(sent).toMatchObject({
      to: 'aarav.gupta@example.com',
      replyTo: 'replies@reply.freakingminds.in',
      subject: 'Your seat on Digital Marketing is reserved',
    });
    expect(sent?.text).toBe(
      [
        'Hi Aarav,',
        'Your seat on Digital Marketing is reserved, starting 12 October 2026.',
        "We'll send your payment link shortly — your seat is confirmed once payment is complete.",
        'Questions? Just reply to this email.',
        '',
        'View the programme: https://www.freakingminds.in/academy/digital-marketing',
        '',
        'The FreakingMinds team',
        'FreakingMinds',
      ].join('\n')
    );
    expect(sent?.html).toMatch(/<a href="https:\/\/www\.freakingminds\.in\/academy\/digital-marketing"[^>]*>View the programme<\/a>/);
    expect(JSON.stringify(sent)).not.toMatch(/unsubscribe|undefined|prog-digital|enr-/i);
  });

  it('drops the start date when the programme has none', async () => {
    program = { ...SEEDED_PROGRAM, starts_at: null };

    await POST(enrol(aaravReserves()));
    await flushAfterResponse();

    expect(sentEmails()[0]?.text).toContain('Your seat on Digital Marketing is reserved.\n');
    expect(sentEmails()[0]?.text).not.toContain('starting');
  });

  it('drops the seeded 5 June start date, which has already passed', async () => {
    await POST(enrol(aaravReserves()));
    await flushAfterResponse();

    expect(sentEmails()[0]?.text).toContain('Your seat on Digital Marketing is reserved.\n');
    expect(sentEmails()[0]?.text).not.toMatch(/June|starting/);
  });

  it('answers exactly as before when the receipt fails to send, and logs no address', async () => {
    const reference = await normalised(await POST(enrol(aaravReserves())));
    await flushAfterResponse();

    mocks.resendSend.mockRejectedValueOnce(new Error('connect ETIMEDOUT for aarav.gupta@example.com'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failed = await normalised(await POST(enrol(aaravReserves())));
    await expect(flushAfterResponse()).resolves.toBeUndefined();

    expect(failed).toEqual(reference);
    expect(reference).toMatchObject({ status: 200, body: { success: true, data: { status: 'reserved' }, razorpay: { orderId: 'order_Q1w2e3r4t5' } } });
    expect(error.mock.calls.flat().map(String).join('\n')).not.toContain('aarav.gupta@example.com');
  });

  it('sends no second receipt when a retry reuses an existing reservation', async () => {
    mocks.existing.current = [
      {
        id: 'enr-1789000000000-abc123',
        program_id: 'prog-digital-marketing-2026-06',
        buyer_name: 'Aarav Gupta',
        buyer_email: 'aarav.gupta@example.com',
        status: 'reserved',
        razorpay_order_id: 'order_Q1w2e3r4t5',
        amount_inr: 29999,
        currency: 'INR',
      },
    ];

    const res = await POST(enrol(aaravReserves()));
    expect(res.status).toBe(200);
    await flushAfterResponse();

    expect(mocks.resendSend).not.toHaveBeenCalled();
    expect(fake.callsTo('enrollments', 'insert')).toHaveLength(0);
  });

  it('sends nothing when the reservation is refused', async () => {
    program = { ...SEEDED_PROGRAM, status: 'closed' };

    const res = await POST(enrol(aaravReserves()));
    expect(res.status).toBe(410);
    await flushAfterResponse();

    expect(mocks.resendSend).not.toHaveBeenCalled();
  });
});
