/**
 * POST /api/academy/enroll logs, with the body ReserveSeatForm really sends
 * against a programme row shaped and valued like scripts/seed-creator-program.ts.
 * The route sends the buyer nothing itself: Reserve opens Razorpay Checkout,
 * and the paid confirmation comes from the Razorpay webhook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fake, payloadOf, selectedColumns, eqValue, ilikeValue, likeMatches } from '@/test-utils/fake-supabase';
import { HONEYPOT_FIELD } from '@/lib/spam-guard-field';
import { reserveSeatBody } from '@/test-utils/public-form-bodies';

type Order = { id: string; amount: number; currency: string };

const mocks = vi.hoisted(() => ({
  createOrder: vi.fn<(input: { amountInr: number }) => Promise<Order>>(),
  inngestSend: vi.fn<(event: unknown) => Promise<unknown>>(),
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/razorpay', () => ({ createOrder: mocks.createOrder }));
vi.mock('@/lib/notifications', () => ({ notifyAdmins: vi.fn(async () => undefined) }));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: mocks.inngestSend } }));

import { POST } from '../route';

/** The seeded Digital Marketing course (scripts/seed-creator-program.ts), as a full `programs` row. */
const SEEDED_PROGRAM: Record<string, unknown> = {
  id: 'prog-digital-marketing-2026-06',
  slug: 'digital-marketing',
  title: 'Digital Marketing',
  format: 'cohort',
  status: 'open',
  price_inr: 29999,
  early_bird_price_inr: 24999,
  early_bird_until: new Date('2026-06-04T18:30:00+05:30').toISOString(),
  currency: 'INR',
  starts_at: new Date('2026-06-05T15:30:00+05:30').toISOString(),
  seats_total: 25,
  seats_taken: 0,
};

const PHONE_DIGITS = '9876543210';
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

/** Every console method silenced and recorded; `text()` is everything logged, flattened. */
function consoleOutput(): { text: () => string } {
  const spies = (['error', 'warn', 'log', 'info'] as const).map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));
  return {
    text: () =>
      spies
        .flatMap((spy) => spy.mock.calls.flat())
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join('\n'),
  };
}

beforeEach(() => {
  fake.reset();
  mocks.createOrder.mockReset();
  mocks.createOrder.mockImplementation(async ({ amountInr }) => ({ id: 'order_Q1w2e3r4t5', amount: amountInr * 100, currency: 'INR' }));
  mocks.inngestSend.mockReset();
  mocks.inngestSend.mockResolvedValue(undefined);
  fake.respond((call) => {
    if (call.table === 'programs') return { data: selectedColumns(call, SEEDED_PROGRAM), error: null };
    if (call.table === 'enrollments' && call.op === 'insert') return { data: { ...payloadOf(call), created_at: '2026-09-17T06:00:00.000Z' }, error: null };
    return { data: [], error: null };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A prior enrollment row for this buyer + program, as the retry lookup would find it. */
const EXISTING_ROW_BASE: Record<string, unknown> = {
  id: 'enr-existing-1',
  program_id: 'prog-digital-marketing-2026-06',
  buyer_name: 'Aarav Gupta',
  buyer_email: 'aarav.gupta@example.com',
  buyer_phone: '+919876543210',
  amount_inr: 24999,
  currency: 'INR',
  status: 'reserved',
  razorpay_order_id: null,
  created_at: '2026-09-16T10:00:00.000Z',
  updated_at: '2026-09-16T10:00:00.000Z',
};

/** Routes the `enrollments` retry lookup to `row` (matched the way `.ilike()` would), and
 *  records any update the route makes back onto it. */
function respondWithExisting(row: Record<string, unknown>) {
  fake.respond((call) => {
    if (call.table === 'programs') return { data: selectedColumns(call, SEEDED_PROGRAM), error: null };
    if (call.table === 'enrollments' && call.op === 'select') {
      const emailFilter = ilikeValue(call, 'buyer_email') as string | undefined;
      const matches = emailFilter ? likeMatches(emailFilter, row.buyer_email as string) : false;
      return { data: matches ? [row] : [], error: null };
    }
    if (call.table === 'enrollments' && call.op === 'update') {
      Object.assign(row, payloadOf(call));
      return { data: row, error: null };
    }
    if (call.table === 'enrollments' && call.op === 'insert') {
      return { data: { ...payloadOf(call), created_at: '2026-09-17T06:00:00.000Z' }, error: null };
    }
    return { data: [], error: null };
  });
}

describe('POST /api/academy/enroll retry — reuses the existing row', () => {
  it('reuses the order on a failed row and inserts nothing new', async () => {
    const row = { ...EXISTING_ROW_BASE, status: 'failed', razorpay_order_id: 'order_existing123' };
    respondWithExisting(row);

    const res = await POST(enrol(aaravReserves()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.razorpay.orderId).toBe('order_existing123');
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(fake.callsTo('enrollments', 'insert')).toHaveLength(0);
  });

  it('creates a Razorpay order for an order-less reserved row instead of inserting a new one', async () => {
    const row: Record<string, unknown> = { ...EXISTING_ROW_BASE, status: 'reserved', razorpay_order_id: null };
    respondWithExisting(row);

    const res = await POST(enrol(aaravReserves()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mocks.createOrder).toHaveBeenCalledTimes(1);
    expect(json.razorpay.orderId).toBe('order_Q1w2e3r4t5');
    expect(fake.callsTo('enrollments', 'insert')).toHaveLength(0);
    const updateCall = fake.callsTo('enrollments', 'update')[0];
    expect(eqValue(updateCall, 'id')).toBe(row.id);
    expect(payloadOf(updateCall)).toMatchObject({ razorpay_order_id: 'order_Q1w2e3r4t5' });
  });

  it('finds the existing row even when the stored email differs only in case', async () => {
    const row = { ...EXISTING_ROW_BASE, buyer_email: 'Aarav.Gupta@Example.com', status: 'paid', razorpay_order_id: 'order_paid1' };
    respondWithExisting(row);

    const res = await POST(enrol(aaravReserves()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('You are already enrolled.');
  });
});

describe('POST /api/academy/enroll — checkout-reminder event dispatch', () => {
  function dispatchedEvents(): Array<{ id?: string; name?: string; data?: { enrollmentId?: string } }> {
    return mocks.inngestSend.mock.calls
      .map((c) => c[0] as { id?: string; name?: string; data?: { enrollmentId?: string } })
      .filter((e) => e?.name === 'academy/checkout.started');
  }

  it('sends academy/checkout.started with the deterministic id, only for a newly inserted row', async () => {
    const res = await POST(enrol(aaravReserves()));
    const json = await res.json();

    expect(res.status).toBe(200);
    const events = dispatchedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: `academy-checkout-reminder-${json.data.id}`,
      name: 'academy/checkout.started',
      data: { enrollmentId: json.data.id },
    });
  });

  it('does not dispatch the event on reuse — a paid row', async () => {
    const row = { ...EXISTING_ROW_BASE, status: 'paid', razorpay_order_id: 'order_paid1' };
    respondWithExisting(row);

    await POST(enrol(aaravReserves()));

    expect(dispatchedEvents()).toHaveLength(0);
  });

  it('does not dispatch the event on reuse — a reserved row with an existing order', async () => {
    const row = { ...EXISTING_ROW_BASE, status: 'reserved', razorpay_order_id: 'order_existing123' };
    respondWithExisting(row);

    await POST(enrol(aaravReserves()));

    expect(dispatchedEvents()).toHaveLength(0);
  });

  it('does not dispatch the event on reuse — an order-less row getting a fresh order', async () => {
    const row = { ...EXISTING_ROW_BASE, status: 'reserved', razorpay_order_id: null };
    respondWithExisting(row);

    await POST(enrol(aaravReserves()));

    expect(dispatchedEvents()).toHaveLength(0);
  });

  it('a failing checkout-reminder event send is logged and leaves the response unchanged', async () => {
    mocks.inngestSend.mockImplementation(async (event) => {
      if ((event as { name?: string })?.name === 'academy/checkout.started') {
        throw new Error('event bus unavailable for aarav.gupta@example.com');
      }
      return undefined;
    });
    const output = consoleOutput();

    const res = await POST(enrol(aaravReserves()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('reserved');
    await vi.waitFor(() => expect(output.text()).toContain('checkout-reminder event send failed'));
    expect(output.text()).not.toContain('aarav.gupta@example.com');
  });
});

describe('POST /api/academy/enroll logs', () => {
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
      if (call.table === 'programs') return { data: selectedColumns(call, SEEDED_PROGRAM), error: null };
      if (call.table === 'enrollments' && call.op === 'insert') return { data: null, error: insertError };
      return { data: [], error: null };
    });

    const failedInsert = await POST(enrol(aaravReserves()));
    expect(failedInsert.status).toBe(500);

    fake.respond((call) => {
      if (call.table === 'programs') return { data: selectedColumns(call, SEEDED_PROGRAM), error: null };
      if (call.table === 'enrollments' && call.op === 'insert') return { data: payloadOf(call), error: null };
      return { data: [], error: null };
    });
    mocks.createOrder.mockRejectedValueOnce(
      Object.assign(new Error('Bad request'), {
        statusCode: 400,
        error: { code: 'BAD_REQUEST_ERROR', description: 'notes.buyer_email aarav.gupta@example.com is invalid', reason: 'input_validation_failed' },
      })
    );
    // Two inngest.send calls happen for a successful insert: the
    // checkout-reminder event dispatch (fire-and-forget, since after() has
    // no request scope in this test harness) first, then the admin
    // "notification/send" — reject only the second.
    mocks.inngestSend.mockResolvedValueOnce(undefined);
    mocks.inngestSend.mockRejectedValueOnce(new Error('Inngest rejected event for aarav.gupta@example.com'));

    const failedOrder = await POST(enrol(aaravReserves()));
    expect(failedOrder.status).toBe(200);
    await vi.waitFor(() => expect(output.text()).toContain('Inngest notification failed'));

    const text = output.text();
    expect(text).toContain('23502');
    expect(text).toContain('Razorpay order create failed');
    expect(text).not.toContain('aarav.gupta@example.com');
    expect(text).not.toContain(PHONE_DIGITS);
  });
});
