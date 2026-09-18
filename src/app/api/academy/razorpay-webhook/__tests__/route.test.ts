/**
 * POST /api/academy/razorpay-webhook, against real Razorpay payload shapes
 * (payment.captured, order.paid, payment.failed, refund.processed —
 * `payload.payment.entity.{id, order_id}` / `payload.refund.entity`).
 *
 * A tiny in-memory `enrollments` row store backs the fake Supabase client so
 * these tests can exercise the actual status-transition guards (`in('status',
 * ['reserved','failed'])`, the `eq('status','reserved')` in markFailed) the
 * same way Postgres would, across a sequence of webhook calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fake, eqValue, payloadOf } from '@/test-utils/fake-supabase';

interface EnrollmentRow {
  id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id?: string | null;
  status: string;
  buyer_name: string;
  buyer_email: string;
  amount_inr: number;
  paid_at?: string | null;
  invite_sent_at?: string | null;
  updated_at?: string;
  programs: {
    id: string;
    title: string;
    slug: string;
    format: string;
    starts_at?: string;
    delivery_zoom_url?: string;
    delivery_whatsapp_url?: string;
    delivery_notion_url?: string;
  };
}

const mocks = vi.hoisted(() => ({
  verifyWebhookSignature: vi.fn<(raw: string, signature: string | null) => boolean>(),
  inngestSend: vi.fn<(event: unknown) => Promise<unknown>>(),
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/razorpay', () => ({ verifyWebhookSignature: mocks.verifyWebhookSignature }));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: mocks.inngestSend } }));

import { POST } from '../route';

// ── Row store — the fake `enrollments` table for this suite ────────────────

let rows: EnrollmentRow[];
let seenEventIds: Set<string>;

function seedRow(overrides: Partial<EnrollmentRow> = {}): EnrollmentRow {
  const row: EnrollmentRow = {
    id: 'enr-1',
    razorpay_order_id: 'order_Q1w2e3r4t5',
    razorpay_payment_id: null,
    status: 'reserved',
    buyer_name: 'Aarav Gupta',
    buyer_email: 'aarav.gupta@example.com',
    amount_inr: 29999,
    programs: {
      id: 'prog-digital-marketing-2026-06',
      title: 'Digital Marketing',
      slug: 'digital-marketing',
      format: 'cohort',
      starts_at: new Date('2026-06-05T15:30:00+05:30').toISOString(),
      delivery_whatsapp_url: 'https://chat.whatsapp.com/abc',
    },
    ...overrides,
  };
  rows = [row];
  return row;
}

function installResponder(): void {
  fake.respond((call) => {
    if (call.table === 'payment_events') {
      if (call.op === 'insert') {
        const id = payloadOf(call).id as string;
        if (seenEventIds.has(id)) {
          return {
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint "payment_events_pkey"' },
          };
        }
        seenEventIds.add(id);
        return { data: payloadOf(call), error: null };
      }
      if (call.op === 'delete') {
        const id = eqValue(call, 'id') as string | undefined;
        if (id) seenEventIds.delete(id);
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }

    if (call.table === 'enrollments') {
      if (call.op === 'select') {
        const orderId = eqValue(call, 'razorpay_order_id');
        const row = rows.find((r) => r.razorpay_order_id === orderId);
        return { data: row ? { ...row } : null, error: null };
      }

      if (call.op === 'update') {
        const idFilter = eqValue(call, 'id') as string | undefined;
        const orderFilter = eqValue(call, 'razorpay_order_id') as string | undefined;
        const paymentFilter = eqValue(call, 'razorpay_payment_id') as string | undefined;
        const row = rows.find(
          (r) =>
            (idFilter !== undefined && r.id === idFilter) ||
            (orderFilter !== undefined && r.razorpay_order_id === orderFilter) ||
            (paymentFilter !== undefined && r.razorpay_payment_id === paymentFilter)
        );
        if (!row) return { data: [], error: null };

        const inFilter = call.filters.find((f) => f.method === 'in' && f.args[0] === 'status');
        if (inFilter) {
          const allowed = inFilter.args[1] as string[];
          if (!allowed.includes(row.status)) return { data: [], error: null };
        }
        const eqStatusFilter = call.filters.find((f) => f.method === 'eq' && f.args[0] === 'status');
        if (eqStatusFilter && row.status !== eqStatusFilter.args[1]) {
          return { data: [], error: null };
        }

        Object.assign(row, payloadOf(call));
        return { data: inFilter ? [{ id: row.id }] : null, error: null };
      }
    }

    return { data: [], error: null };
  });
}

// ── Real Razorpay payload shapes ────────────────────────────────────────────

function capturedEvent(opts: { id: string; orderId: string; paymentId: string }): Record<string, unknown> {
  return {
    entity: 'event',
    account_id: 'acc_BFQ7uQEaa7j2z3',
    event: 'payment.captured',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: opts.paymentId,
          entity: 'payment',
          amount: 2999900,
          currency: 'INR',
          status: 'captured',
          order_id: opts.orderId,
          invoice_id: null,
          international: false,
          method: 'upi',
          amount_refunded: 0,
          refund_status: null,
          captured: true,
          description: 'Digital Marketing',
          card_id: null,
          bank: null,
          wallet: null,
          vpa: 'aarav@okhdfcbank',
          email: 'aarav.gupta@example.com',
          contact: '+919876543210',
          notes: { program_id: 'prog-digital-marketing-2026-06' },
          fee: 708,
          tax: 108,
          error_code: null,
          error_description: null,
          created_at: 1757600000,
        },
      },
    },
    created_at: 1757600000,
    id: opts.id,
  };
}

function orderPaidEvent(opts: { id: string; orderId: string; paymentId: string }): Record<string, unknown> {
  return {
    entity: 'event',
    account_id: 'acc_BFQ7uQEaa7j2z3',
    event: 'order.paid',
    contains: ['payment', 'order'],
    payload: {
      payment: {
        entity: {
          id: opts.paymentId,
          entity: 'payment',
          amount: 2999900,
          currency: 'INR',
          status: 'captured',
          order_id: opts.orderId,
          method: 'upi',
          email: 'aarav.gupta@example.com',
          contact: '+919876543210',
        },
      },
      order: {
        entity: {
          id: opts.orderId,
          entity: 'order',
          amount: 2999900,
          amount_paid: 2999900,
          currency: 'INR',
          status: 'paid',
        },
      },
    },
    created_at: 1757600001,
    id: opts.id,
  };
}

function paymentFailedEvent(opts: { id: string; orderId: string; paymentId: string }): Record<string, unknown> {
  return {
    entity: 'event',
    account_id: 'acc_BFQ7uQEaa7j2z3',
    event: 'payment.failed',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: opts.paymentId,
          entity: 'payment',
          amount: 2999900,
          currency: 'INR',
          status: 'failed',
          order_id: opts.orderId,
          method: 'card',
          email: 'aarav.gupta@example.com',
          contact: '+919876543210',
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'The card was declined by the issuing bank',
          error_source: 'bank',
          error_step: 'payment_authorization',
          error_reason: 'payment_failed',
        },
      },
    },
    created_at: 1757599000,
    id: opts.id,
  };
}

function refundProcessedEvent(opts: { id: string; refundId: string; paymentId: string }): Record<string, unknown> {
  return {
    entity: 'event',
    account_id: 'acc_BFQ7uQEaa7j2z3',
    event: 'refund.processed',
    contains: ['refund'],
    payload: {
      refund: {
        entity: {
          id: opts.refundId,
          entity: 'refund',
          amount: 2999900,
          currency: 'INR',
          payment_id: opts.paymentId,
          notes: {},
          receipt: null,
          status: 'processed',
          speed_processed: 'normal',
          speed_requested: 'normal',
          created_at: 1757700000,
        },
      },
    },
    created_at: 1757700000,
    id: opts.id,
  };
}

function webhookRequest(payload: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/academy/razorpay-webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-razorpay-signature': 'sig_test' },
    body: JSON.stringify(payload),
  });
}

function emailSends(): unknown[] {
  return mocks.inngestSend.mock.calls.filter((c) => (c[0] as { name?: string }).name === 'email/send');
}
function adminNotifications(): unknown[] {
  return mocks.inngestSend.mock.calls.filter((c) => (c[0] as { name?: string }).name === 'notification/send');
}

beforeEach(() => {
  fake.reset();
  seenEventIds = new Set();
  installResponder();
  mocks.verifyWebhookSignature.mockReset();
  mocks.verifyWebhookSignature.mockReturnValue(true);
  mocks.inngestSend.mockReset();
  mocks.inngestSend.mockResolvedValue(undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/academy/razorpay-webhook', () => {
  it('reserved → captured: flips to paid and sends exactly one confirmation', async () => {
    const row = seedRow({ status: 'reserved' });

    const res = await POST(webhookRequest(capturedEvent({ id: 'evt_1', orderId: row.razorpay_order_id!, paymentId: 'pay_1' })));

    expect(res.status).toBe(200);
    expect(row.status).toBe('paid');
    expect(row.razorpay_payment_id).toBe('pay_1');
    expect(row.paid_at).toBeTruthy();
    expect(emailSends()).toHaveLength(1);
    expect(adminNotifications()).toHaveLength(1);
  });

  it('reserved → failed → captured on the same order: recovers to paid with one confirmation', async () => {
    const row = seedRow({ status: 'reserved' });

    // First card declines.
    const failedRes = await POST(webhookRequest(paymentFailedEvent({ id: 'evt_1', orderId: row.razorpay_order_id!, paymentId: 'pay_1' })));
    expect(failedRes.status).toBe(200);
    expect(row.status).toBe('failed');

    // Buyer retries with another card on the same Razorpay order.
    const capturedRes = await POST(webhookRequest(capturedEvent({ id: 'evt_2', orderId: row.razorpay_order_id!, paymentId: 'pay_2' })));

    expect(capturedRes.status).toBe(200);
    expect(row.status).toBe('paid');
    expect(row.razorpay_payment_id).toBe('pay_2');
    expect(emailSends()).toHaveLength(1);
    expect(adminNotifications()).toHaveLength(1);
  });

  it('payment.captured then order.paid for the same payment: one confirmation, not two', async () => {
    const row = seedRow({ status: 'reserved' });

    const capturedRes = await POST(webhookRequest(capturedEvent({ id: 'evt_1', orderId: row.razorpay_order_id!, paymentId: 'pay_1' })));
    const orderPaidRes = await POST(webhookRequest(orderPaidEvent({ id: 'evt_2', orderId: row.razorpay_order_id!, paymentId: 'pay_1' })));

    expect(capturedRes.status).toBe(200);
    expect(orderPaidRes.status).toBe(200);
    expect(row.status).toBe('paid');
    expect(emailSends()).toHaveLength(1);
    expect(adminNotifications()).toHaveLength(1);
  });

  it('a duplicate event id short-circuits as 200 duplicate, nothing sent', async () => {
    const row = seedRow({ status: 'reserved' });
    const event = capturedEvent({ id: 'evt_1', orderId: row.razorpay_order_id!, paymentId: 'pay_1' });

    const first = await POST(webhookRequest(event));
    const second = await POST(webhookRequest(event));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ ok: true, duplicate: true });
    expect(emailSends()).toHaveLength(1);
    expect(adminNotifications()).toHaveLength(1);
  });

  it('a database error on the paid-flip update responds 500 and removes this event\'s payment_events row', async () => {
    const row = seedRow({ status: 'reserved' });
    fake.respond((call) => {
      if (call.table === 'enrollments' && call.op === 'update' && 'status' in payloadOf(call)) {
        return { data: null, error: { code: '55000', message: 'no space left on device' } };
      }
      if (call.table === 'payment_events' && call.op === 'insert') {
        const id = payloadOf(call).id as string;
        seenEventIds.add(id);
        return { data: payloadOf(call), error: null };
      }
      if (call.table === 'enrollments' && call.op === 'select') {
        const orderId = eqValue(call, 'razorpay_order_id');
        const found = rows.find((r) => r.razorpay_order_id === orderId);
        return { data: found ? { ...found } : null, error: null };
      }
      if (call.table === 'payment_events' && call.op === 'delete') {
        const id = eqValue(call, 'id') as string;
        seenEventIds.delete(id);
        return { data: null, error: null };
      }
      return { data: [], error: null };
    });

    const res = await POST(webhookRequest(capturedEvent({ id: 'evt_1', orderId: row.razorpay_order_id!, paymentId: 'pay_1' })));

    expect(res.status).toBe(500);
    expect(row.status).toBe('reserved'); // never flipped
    expect(emailSends()).toHaveLength(0);
    expect(seenEventIds.has('evt_1')).toBe(false); // payment_events row removed
  });

  it('re-delivery of the same event after a 500 cleanup flips the row and sends exactly one confirmation — the failed attempt sent no admin notification', async () => {
    const row = seedRow({ status: 'reserved' });
    let updateAttempts = 0;
    fake.respond((call) => {
      if (call.table === 'enrollments' && call.op === 'update' && 'status' in payloadOf(call)) {
        updateAttempts += 1;
        if (updateAttempts === 1) {
          // First delivery: the update itself errors (e.g. a lost response) —
          // the row never flips.
          return { data: null, error: { code: '55000', message: 'no space left on device' } };
        }
        // Razorpay's retry of the same event, after the 500 cleanup below
        // removed the payment_events row: the update now succeeds normally.
        const idFilter = eqValue(call, 'id') as string | undefined;
        const found = rows.find((r) => r.id === idFilter);
        if (!found) return { data: [], error: null };
        const inFilter = call.filters.find((f) => f.method === 'in' && f.args[0] === 'status');
        const allowed = (inFilter?.args[1] as string[] | undefined) ?? [];
        if (!allowed.includes(found.status)) return { data: [], error: null };
        Object.assign(found, payloadOf(call));
        return { data: [{ id: found.id }], error: null };
      }
      if (call.table === 'payment_events' && call.op === 'insert') {
        const id = payloadOf(call).id as string;
        if (seenEventIds.has(id)) {
          return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "payment_events_pkey"' } };
        }
        seenEventIds.add(id);
        return { data: payloadOf(call), error: null };
      }
      if (call.table === 'payment_events' && call.op === 'delete') {
        const id = eqValue(call, 'id') as string;
        seenEventIds.delete(id);
        return { data: null, error: null };
      }
      if (call.table === 'enrollments' && call.op === 'select') {
        const orderId = eqValue(call, 'razorpay_order_id');
        const found = rows.find((r) => r.razorpay_order_id === orderId);
        return { data: found ? { ...found } : null, error: null };
      }
      if (call.table === 'enrollments' && call.op === 'update') {
        // The invite_sent_at stamp — a plain update, no status guard.
        const idFilter = eqValue(call, 'id') as string | undefined;
        const found = rows.find((r) => r.id === idFilter);
        if (found) Object.assign(found, payloadOf(call));
        return { data: null, error: null };
      }
      return { data: [], error: null };
    });

    const event = capturedEvent({ id: 'evt_1', orderId: row.razorpay_order_id!, paymentId: 'pay_1' });

    const first = await POST(webhookRequest(event));
    expect(first.status).toBe(500);
    expect(row.status).toBe('reserved');
    expect(emailSends()).toHaveLength(0);
    expect(adminNotifications()).toHaveLength(0); // the failed attempt sent no admin notification

    // Razorpay retries the exact same delivery (same event id).
    const second = await POST(webhookRequest(event));
    expect(second.status).toBe(200);
    expect(row.status).toBe('paid');
    expect(emailSends()).toHaveLength(1);
    expect(adminNotifications()).toHaveLength(1);
  });

  it('a database error on the enrollment lookup responds 500 and removes this event\'s payment_events row', async () => {
    const row = seedRow({ status: 'reserved' });
    fake.respond((call) => {
      if (call.table === 'enrollments' && call.op === 'select') {
        return { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } };
      }
      if (call.table === 'payment_events' && call.op === 'insert') {
        const id = payloadOf(call).id as string;
        seenEventIds.add(id);
        return { data: payloadOf(call), error: null };
      }
      if (call.table === 'payment_events' && call.op === 'delete') {
        const id = eqValue(call, 'id') as string;
        seenEventIds.delete(id);
        return { data: null, error: null };
      }
      return { data: [], error: null };
    });

    const res = await POST(webhookRequest(capturedEvent({ id: 'evt_1', orderId: row.razorpay_order_id!, paymentId: 'pay_1' })));

    expect(res.status).toBe(500);
    expect(emailSends()).toHaveLength(0);
    expect(seenEventIds.has('evt_1')).toBe(false);
  });

  it('an unknown order id is left alone and still responds 200', async () => {
    seedRow({ status: 'reserved', razorpay_order_id: 'order_known' });

    const res = await POST(webhookRequest(capturedEvent({ id: 'evt_1', orderId: 'order_unknown', paymentId: 'pay_1' })));

    expect(res.status).toBe(200);
    expect(rows[0].status).toBe('reserved');
    expect(emailSends()).toHaveLength(0);
  });

  it('markFailed only ever demotes a reserved row, never a paid one', async () => {
    const row = seedRow({ status: 'paid', razorpay_payment_id: 'pay_1' });

    const res = await POST(webhookRequest(paymentFailedEvent({ id: 'evt_1', orderId: row.razorpay_order_id!, paymentId: 'pay_2' })));

    expect(res.status).toBe(200);
    expect(row.status).toBe('paid');
  });

  it('refund.processed marks the paid row refunded, and nothing else', async () => {
    const row = seedRow({ status: 'paid', razorpay_payment_id: 'pay_1' });

    const res = await POST(webhookRequest(refundProcessedEvent({ id: 'evt_1', refundId: 'rfnd_1', paymentId: 'pay_1' })));

    expect(res.status).toBe(200);
    expect(row.status).toBe('refunded');
    expect(emailSends()).toHaveLength(0);
    expect(adminNotifications()).toHaveLength(0);
  });

  it('rejects a bad signature with 401 and does no work', async () => {
    mocks.verifyWebhookSignature.mockReturnValue(false);
    const row = seedRow({ status: 'reserved' });

    const res = await POST(webhookRequest(capturedEvent({ id: 'evt_1', orderId: row.razorpay_order_id!, paymentId: 'pay_1' })));

    expect(res.status).toBe(401);
    expect(row.status).toBe('reserved');
    expect(mocks.inngestSend).not.toHaveBeenCalled();
  });
});
