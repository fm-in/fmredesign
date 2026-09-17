/**
 * POST /api/academy/enroll with the body ReserveSeatForm really sends, against
 * a programme row shaped and valued like scripts/seed-creator-program.ts. The
 * programme responder returns only the columns the route selects, so a
 * receipt field the route forgot to load shows up here, not in production.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { eqValue, fake, payloadOf, selectedColumns, type FakeCall } from '@/test-utils/fake-supabase';
import { HONEYPOT_FIELD } from '@/lib/spam-guard-field';
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
  inngestSend: vi.fn<(event: unknown) => Promise<unknown>>(async () => undefined),
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/email/resend', () => ({ getResend: () => ({ emails: { send: mocks.resendSend } }) }));
vi.mock('@/lib/razorpay', () => ({ createOrder: mocks.createOrder }));
vi.mock('@/lib/notifications', () => ({ notifyAdmins: vi.fn(async () => undefined) }));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: mocks.inngestSend } }));
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
/** Enrolment rows written during a test, as the database would hold them (created_at is the insert time). */
let enrollments: Array<Record<string, unknown>> = [];

/** The first `.gte(column, value)` / `.neq(column, value)` on a call. */
function filterValue(call: FakeCall, method: 'gte' | 'neq', column: string): unknown {
  return call.filters.find((f) => f.method === method && f.args[0] === column)?.args[1];
}
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
  mocks.inngestSend.mockReset();
  mocks.inngestSend.mockResolvedValue(undefined);
  program = SEEDED_PROGRAM;
  enrollments = [];
  process.env.SALES_REPLY_TO = 'replies@reply.freakingminds.in';
  fake.respond((call) => {
    if (call.table === 'programs') {
      const requested = eqValue(call, 'id');
      const row = requested === program.id ? program : { ...program, id: requested, slug: `course-${String(requested)}` };
      return { data: selectedColumns(call, row), error: null };
    }
    if (call.table === 'enrollments' && call.op === 'select') {
      const since = filterValue(call, 'gte', 'created_at');
      if (typeof since !== 'string') return { data: mocks.existing.current, error: null };
      // The receipt cap: this buyer's other reservations since `since`.
      const recent = enrollments.filter(
        (row) =>
          row.buyer_email === eqValue(call, 'buyer_email') &&
          row.id !== filterValue(call, 'neq', 'id') &&
          String(row.created_at) >= since
      );
      return { data: recent.map((row) => ({ id: row.id })), error: null };
    }
    if (call.table === 'enrollments' && call.op === 'insert') {
      const row = { ...payloadOf(call), created_at: new Date().toISOString() };
      enrollments.push(row);
      return { data: row, error: null };
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

describe('POST /api/academy/enroll reservation receipt: one per buyer per 24 hours', () => {
  const T0 = new Date('2026-09-17T06:00:00.000Z');
  const HOUR = 60 * 60 * 1000;

  async function reserveAt(at: Date, programId: string): Promise<Response> {
    vi.setSystemTime(at);
    const res = await POST(enrol({ ...aaravReserves(), programId }));
    await flushAfterResponse();
    return res;
  }

  it('sends nothing for a second reservation by the same buyer within 24 hours', async () => {
    const first = await reserveAt(T0, 'prog-digital-marketing-2026-06');
    expect(first.status).toBe(200);
    expect(mocks.resendSend).toHaveBeenCalledTimes(1);

    const second = await reserveAt(new Date(T0.getTime() + 23 * HOUR), 'prog-video-editing-2026-06');
    expect(second.status).toBe(200);
    expect((await second.json()).data).toMatchObject({ status: 'reserved', programId: 'prog-video-editing-2026-06' });
    expect(enrollments).toHaveLength(2);
    expect(mocks.resendSend).toHaveBeenCalledTimes(1);
  });

  it('sends again once 24 hours have passed since the last reservation', async () => {
    await reserveAt(T0, 'prog-digital-marketing-2026-06');
    await reserveAt(new Date(T0.getTime() + 24 * HOUR + 60 * 1000), 'prog-video-editing-2026-06');

    expect(mocks.resendSend).toHaveBeenCalledTimes(2);
  });

  it("does not count someone else's reservation", async () => {
    await reserveAt(T0, 'prog-digital-marketing-2026-06');
    vi.setSystemTime(new Date(T0.getTime() + HOUR));
    await POST(enrol(reserveSeatBody({ programId: 'prog-digital-marketing-2026-06', name: 'Meera Iyer', email: 'meera@example.com' })));
    await flushAfterResponse();

    expect(sentEmails().map((email) => email.to)).toEqual(['aarav.gupta@example.com', 'meera@example.com']);
  });

  it('sends nothing when the check itself fails', async () => {
    fake.respond((call) => {
      if (call.table === 'programs') return { data: selectedColumns(call, program), error: null };
      if (call.table === 'enrollments' && call.op === 'select' && filterValue(call, 'gte', 'created_at')) {
        return { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } };
      }
      if (call.table === 'enrollments' && call.op === 'select') return { data: [], error: null };
      if (call.table === 'enrollments' && call.op === 'insert') return { data: { ...payloadOf(call), created_at: T0.toISOString() }, error: null };
      return { data: [], error: null };
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await reserveAt(T0, 'prog-digital-marketing-2026-06');

    expect(res.status).toBe(200);
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });
});

describe('POST /api/academy/enroll logs', () => {
  const PHONE_DIGITS = '9876543210';

  /** Everything written to the console during the test, flattened. */
  function consoleOutput(): { text: () => string } {
    const spies = (['error', 'warn', 'log', 'info'] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined)
    );
    return { text: () => spies.flatMap((spy) => spy.mock.calls.flat()).map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join('\n') };
  }

  it.each([
    ['a filled honeypot', () => ({ ...aaravReserves(), [HONEYPOT_FIELD]: 'http://spam.example' })],
    ['a dot-obfuscated Gmail address', () => ({ ...aaravReserves(), buyerEmail: 'a.a.r.a.v@gmail.com' })],
  ])('rejects %s without logging the address', async (_label, body) => {
    const output = consoleOutput();

    const res = await POST(enrol(body()));

    expect(res.status).toBe(400);
    const text = output.text();
    expect(text).toMatch(/rejected submission/);
    expect(text).not.toMatch(/aarav|gmail|@/i);
  });

  it('logs suspicions without the address', async () => {
    const output = consoleOutput();

    const res = await POST(enrol({ ...aaravReserves(), buyerName: 'Brx Tkl' }));
    await flushAfterResponse();

    expect(res.status).toBe(200);
    const text = output.text();
    expect(text).toContain('name_has_no_vowels');
    expect(text).not.toMatch(/aarav\.gupta|@example/i);
  });

  it('logs a failed insert, a failed Razorpay order and a failed notification without the address or phone', async () => {
    const insertError = {
      code: '23502',
      message: 'null value in column "amount_inr" of relation "enrollments" violates not-null constraint',
      details: `Failing row contains (enr-1, prog-digital-marketing-2026-06, Aarav Gupta, aarav.gupta@example.com, ${PHONE_DIGITS}).`,
    };
    const output = consoleOutput();
    fake.respond((call) => {
      if (call.table === 'programs') return { data: selectedColumns(call, program), error: null };
      if (call.table === 'enrollments' && call.op === 'insert') return { data: null, error: insertError };
      return { data: [], error: null };
    });

    const failedInsert = await POST(enrol(aaravReserves()));
    expect(failedInsert.status).toBe(500);

    fake.respond((call) => {
      if (call.table === 'programs') return { data: selectedColumns(call, program), error: null };
      if (call.table === 'enrollments' && call.op === 'insert') return { data: payloadOf(call), error: null };
      return { data: [], error: null };
    });
    mocks.createOrder.mockRejectedValueOnce(
      Object.assign(new Error('Bad request'), {
        statusCode: 400,
        error: { code: 'BAD_REQUEST_ERROR', description: 'notes.buyer_email aarav.gupta@example.com is invalid', reason: 'input_validation_failed' },
      })
    );
    mocks.inngestSend.mockRejectedValueOnce(new Error('Inngest rejected event for aarav.gupta@example.com'));

    const failedOrder = await POST(enrol(aaravReserves()));
    expect(failedOrder.status).toBe(200);
    await Promise.resolve();

    const text = output.text();
    expect(text).toContain('23502');
    expect(text).toContain('Razorpay order create failed');
    expect(text).toContain('Inngest notification failed');
    expect(text).not.toContain('aarav.gupta@example.com');
    expect(text).not.toContain(PHONE_DIGITS);
  });
});
