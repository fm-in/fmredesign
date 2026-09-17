/**
 * academyCheckoutReminderFn: sleeps an hour, then decides whether to send
 * exactly one reminder. `isSuppressedOrThrow` is exercised for real (not
 * mocked) against a fake `suppression_list`, so this also confirms it blocks
 * every do-not-contact reason — including 'unsubscribed', unlike the looser
 * `blocksReceipts` receipts use — and fails closed (throws, so Inngest
 * retries) on a lookup error rather than reading it as "not suppressed".
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fake, eqValue, ilikeValue, likeMatches } from '@/test-utils/fake-supabase';

interface FakeStep {
  run: <T>(...args: [string, () => Promise<T> | T]) => Promise<T>;
  sleep: (...args: [string, string]) => Promise<void>;
}
type CapturedHandler = (ctx: { event: { data: Record<string, unknown> }; step: FakeStep }) => Promise<unknown>;
interface CapturedFunction {
  config: { id: string; retries?: number };
  handler: CapturedHandler;
}

type SendResult = { data: { id: string } | null; error: { message: string; name?: string } | null };

const mocks = vi.hoisted(() => ({
  send: vi.fn<(payload: Record<string, unknown>, options?: unknown) => Promise<SendResult>>(async () => ({
    data: { id: 'resend_1' },
    error: null,
  })),
  resendConfigured: { current: true },
}));

// `createFunction` returns `{ config, handler }` directly — `academyCheckoutReminderFn`
// (imported below) *is* that object, so tests call its handler straight from the
// import binding rather than through a side-registry that a deep, mostly-real
// import graph (suppression, phone, postgrest) can race against.
vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: vi.fn(async () => undefined),
    createFunction: (config: CapturedFunction['config'], ...rest: [unknown, CapturedHandler]) => ({
      config,
      handler: rest[1],
    }),
  },
}));
vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/email/resend', () => ({
  getResend: () => (mocks.resendConfigured.current ? { emails: { send: mocks.send } } : null),
}));

import { academyCheckoutReminderFn } from '../academy';

const reminderFn = academyCheckoutReminderFn as unknown as CapturedFunction;

function fakeStep() {
  const results = new Map<string, unknown>();
  const sleep = vi.fn<(...args: [string, string]) => Promise<void>>(async () => undefined);
  const step: FakeStep = {
    run: async <T>(...args: [string, () => Promise<T> | T]): Promise<T> => {
      const result = await args[1]();
      results.set(args[0], result);
      return result;
    },
    sleep,
  };
  return { step, results, sleep };
}

interface EnrollmentRow {
  id: string;
  program_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  status: string;
}
interface ProgramRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  seats_total: number | null;
  seats_taken: number | null;
}
interface SuppressionRow {
  email?: string;
  phone_e164?: string;
  reason: string;
}

let enrollment: EnrollmentRow | null;
let program: ProgramRow | null;
let paidSiblingEmails: string[];
let suppressionRows: SuppressionRow[];

function enrollmentRow(overrides: Partial<EnrollmentRow> = {}): EnrollmentRow {
  return {
    id: 'enr-1',
    program_id: 'prog-1',
    buyer_name: 'Aarav Gupta',
    buyer_email: 'aarav.gupta@example.com',
    buyer_phone: '+919876543210',
    status: 'reserved',
    ...overrides,
  };
}

function programRow(overrides: Partial<ProgramRow> = {}): ProgramRow {
  return {
    id: 'prog-1',
    slug: 'digital-marketing',
    title: 'Digital Marketing',
    status: 'open',
    seats_total: 25,
    seats_taken: 10,
    ...overrides,
  };
}

function installResponder(): void {
  fake.respond((call) => {
    if (call.table === 'enrollments' && call.op === 'select') {
      const idFilter = eqValue(call, 'id');
      if (idFilter !== undefined) {
        return { data: enrollment && enrollment.id === idFilter ? { ...enrollment } : null, error: null };
      }
      // Paid-sibling lookup: program_id + ilike(buyer_email) + status='paid'.
      const programIdFilter = eqValue(call, 'program_id');
      const emailFilter = ilikeValue(call, 'buyer_email') as string | undefined;
      if (programIdFilter !== undefined && emailFilter) {
        const matches = paidSiblingEmails.some((email) => likeMatches(emailFilter, email));
        return { data: matches ? [{ id: 'sibling-1' }] : [], error: null };
      }
      return { data: [], error: null };
    }
    if (call.table === 'programs' && call.op === 'select') {
      const idFilter = eqValue(call, 'id');
      return { data: program && program.id === idFilter ? { ...program } : null, error: null };
    }
    if (call.table === 'suppression_list' && call.op === 'select') {
      const emailFilter = ilikeValue(call, 'email') as string | undefined;
      const phoneFilter = eqValue(call, 'phone_e164') as string | undefined;
      if (emailFilter) {
        const rows = suppressionRows.filter((r) => r.email && likeMatches(emailFilter, r.email));
        return { data: rows.map((r) => ({ id: 'sup', reason: r.reason })), error: null };
      }
      if (phoneFilter) {
        const rows = suppressionRows.filter((r) => r.phone_e164 === phoneFilter);
        return { data: rows.map((r) => ({ id: 'sup', reason: r.reason })), error: null };
      }
      return { data: [], error: null };
    }
    return { data: [], error: null };
  });
}

beforeEach(() => {
  fake.reset();
  vi.clearAllMocks();
  mocks.resendConfigured.current = true;
  mocks.send.mockClear();
  mocks.send.mockResolvedValue({ data: { id: 'resend_1' }, error: null });
  enrollment = enrollmentRow();
  program = programRow();
  paidSiblingEmails = [];
  suppressionRows = [];
  installResponder();
  delete process.env.SALES_REPLY_TO;
  delete process.env.SALES_FROM_EMAIL;
  delete process.env.NOTIFICATION_EMAIL;
});

function sentPayload(): Record<string, unknown> {
  const payload = mocks.send.mock.calls[0]?.[0];
  if (!payload) throw new Error('nothing was sent');
  return payload;
}

describe('academy-checkout-reminder', () => {
  it('is registered as academy-checkout-reminder, waits exactly one hour before deciding', async () => {
    expect(reminderFn.config).toMatchObject({ id: 'academy-checkout-reminder' });

    const { step, sleep } = fakeStep();
    await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(sleep).toHaveBeenCalledWith('wait-1-hour', '1h');
  });

  it.each(['reserved', 'failed'])('sends the reminder for a %s enrollment', async (status) => {
    enrollment = enrollmentRow({ status });
    const { step } = fakeStep();

    const result = await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(result).toEqual({ sent: true });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(sentPayload()).toMatchObject({ to: 'aarav.gupta@example.com', subject: 'Finish booking your seat on Digital Marketing' });
  });

  it('skips when the enrollment no longer exists', async () => {
    enrollment = null;
    const { step } = fakeStep();

    const result = await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(result).toEqual({ skipped: 'enrollment_not_found' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it.each(['paid', 'refunded', 'cancelled'])('skips a %s enrollment — nothing left to remind about', async (status) => {
    enrollment = enrollmentRow({ status });
    const { step } = fakeStep();

    const result = await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(result).toEqual({ skipped: 'not_unpaid' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('skips when any enrollment for the same programme and email (case-insensitive) is already paid', async () => {
    enrollment = enrollmentRow({ buyer_email: 'aarav.gupta@example.com' });
    paidSiblingEmails = ['Aarav.Gupta@Example.com'];
    const { step } = fakeStep();

    const result = await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(result).toEqual({ skipped: 'already_paid' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('skips when the programme is no longer found', async () => {
    program = null;
    const { step } = fakeStep();

    const result = await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(result).toEqual({ skipped: 'program_not_found' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it.each(['draft', 'closed', 'archived'])('skips when the programme status is %s', async (status) => {
    program = programRow({ status });
    const { step } = fakeStep();

    const result = await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(result).toEqual({ skipped: 'program_not_open' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('skips when the batch has sold out since checkout started', async () => {
    program = programRow({ seats_total: 25, seats_taken: 25 });
    const { step } = fakeStep();

    const result = await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(result).toEqual({ skipped: 'sold_out' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('never sold-out-skips an unlimited-seats programme', async () => {
    program = programRow({ seats_total: null, seats_taken: 500 });
    const { step } = fakeStep();

    const result = await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(result).toEqual({ sent: true });
  });

  it.each(['bounced', 'complaint', 'manual', 'deletion_request', 'unsubscribed'])(
    'skips when the buyer email is on the do-not-contact list for reason: %s',
    async (reason) => {
      suppressionRows = [{ email: 'aarav.gupta@example.com', reason }];
      const { step } = fakeStep();

      const result = await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

      expect(result).toEqual({ skipped: 'suppressed' });
      expect(mocks.send).not.toHaveBeenCalled();
    }
  );

  it('skips when the buyer phone (normalised to E.164) is on the do-not-contact list', async () => {
    enrollment = enrollmentRow({ buyer_phone: '98765 43210' }); // normalises to +919876543210
    suppressionRows = [{ phone_e164: '+919876543210', reason: 'manual' }];
    const { step } = fakeStep();

    const result = await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(result).toEqual({ skipped: 'suppressed' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('throws (retries) when the suppression lookup itself errors, instead of sending to a possibly-suppressed address', async () => {
    fake.respond((call) => {
      if (call.table === 'enrollments' && call.op === 'select') {
        const idFilter = eqValue(call, 'id');
        if (idFilter !== undefined) {
          return { data: enrollment && enrollment.id === idFilter ? { ...enrollment } : null, error: null };
        }
        return { data: [], error: null }; // no paid sibling
      }
      if (call.table === 'programs' && call.op === 'select') {
        const idFilter = eqValue(call, 'id');
        return { data: program && program.id === idFilter ? { ...program } : null, error: null };
      }
      if (call.table === 'suppression_list' && call.op === 'select') {
        return { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } };
      }
      return { data: [], error: null };
    });
    const { step } = fakeStep();

    await expect(
      reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step })
    ).rejects.toThrow(/suppression lookup failed/);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('treats a missing suppression_list table (pre-migration) as not suppressed', async () => {
    fake.respond((call) => {
      if (call.table === 'enrollments' && call.op === 'select') {
        const idFilter = eqValue(call, 'id');
        if (idFilter !== undefined) {
          return { data: enrollment && enrollment.id === idFilter ? { ...enrollment } : null, error: null };
        }
        return { data: [], error: null };
      }
      if (call.table === 'programs' && call.op === 'select') {
        const idFilter = eqValue(call, 'id');
        return { data: program && program.id === idFilter ? { ...program } : null, error: null };
      }
      if (call.table === 'suppression_list' && call.op === 'select') {
        return { data: null, error: { code: 'PGRST205', message: 'table not found in schema cache' } };
      }
      return { data: [], error: null };
    });
    const { step } = fakeStep();

    const result = await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(result).toEqual({ sent: true });
  });

  it('skips when Resend is not configured', async () => {
    mocks.resendConfigured.current = false;
    const { step } = fakeStep();

    const result = await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(result).toEqual({ skipped: 'resend_not_configured' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('sends with the From/Reply-To sendTransactionalEmail uses, and an idempotency key so a retry cannot double-send', async () => {
    process.env.SALES_REPLY_TO = 'replies@reply.freakingminds.in';
    const { step } = fakeStep();

    await reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step });

    expect(sentPayload()).toMatchObject({
      from: 'FreakingMinds <hello@freakingminds.in>',
      replyTo: 'replies@reply.freakingminds.in',
    });
    const options = mocks.send.mock.calls[0]?.[1] as { idempotencyKey?: string } | undefined;
    expect(options?.idempotencyKey).toBe('academy-checkout-reminder-enr-1');
    delete process.env.SALES_REPLY_TO;
  });

  it('retries (throws) on a transient Resend failure instead of silently skipping', async () => {
    mocks.send.mockResolvedValueOnce({ data: null, error: { message: 'network error' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { step } = fakeStep();

    await expect(
      reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step })
    ).rejects.toThrow(/Resend send failed/);
    consoleError.mockRestore();
  });

  it('retries (throws) on a transient DB error instead of skipping', async () => {
    fake.respond((call) =>
      call.table === 'enrollments' && eqValue(call, 'id') !== undefined
        ? { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }
        : { data: [], error: null }
    );
    const { step } = fakeStep();

    await expect(
      reminderFn.handler({ event: { data: { enrollmentId: 'enr-1' } }, step })
    ).rejects.toThrow(/enrollment lookup failed/);
  });
});
