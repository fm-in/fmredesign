import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { eqValue, fake, payloadOf, type FakeCall } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';
import type { IntakeLead } from '@/lib/sales/types';
import type { IngestResult } from '@/lib/sales/intake/ingest';
import { contactPageBody, getStartedBody } from '@/test-utils/public-form-bodies';

type SendResult = { data: { id: string } | null; error: { message: string } | null };

const mocks = vi.hoisted(() => ({
  ingestLead: vi.fn<(lead: IntakeLead) => Promise<IngestResult>>(async () => ({ leadId: 'lead_new', created: true })),
  notifyAdmins: vi.fn(async () => undefined),
  notifyTeam: vi.fn(),
  user: { id: 'user-1', name: 'Asha', role: 'manager', permissions: ['sales.read', 'sales.write'] },
  resendSend: vi.fn<(payload: Record<string, unknown>, options?: unknown) => Promise<SendResult>>(),
  /** Payloads Resend accepted — a successful send, as opposed to a call that failed. */
  delivered: [] as Array<Record<string, unknown>>,
  /** Work handed to next/server `after()` — it runs only once the test flushes it, i.e. after the response. */
  afterTasks: [] as Array<() => Promise<void>>,
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/sales/intake/ingest', () => ({ ingestLead: mocks.ingestLead }));
vi.mock('@/lib/notifications', () => ({ notifyAdmins: mocks.notifyAdmins }));
vi.mock('@/lib/email/send', () => ({
  notifyTeam: mocks.notifyTeam,
  newLeadEmail: () => ({ subject: 'New lead', html: '<p>New lead</p>' }),
}));
vi.mock('@/lib/admin-auth-middleware', () => ({
  requirePermission: vi.fn(async () => ({ user: mocks.user })),
  requireAdminAuth: vi.fn(async () => null),
}));
vi.mock('@/lib/admin/audit-log', () => ({ logAuditEvent: vi.fn(async () => undefined), getClientIP: () => '127.0.0.1' }));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn(async () => undefined) } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));
vi.mock('@/lib/email/resend', () => ({ getResend: () => ({ emails: { send: mocks.resendSend } }) }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (task: () => Promise<void>) => {
    mocks.afterTasks.push(task);
  },
}));

import { logAuditEvent } from '@/lib/admin/audit-log';
import { DELETE, GET, POST, PUT } from '../route';

let ipCounter = 0;

function postLead(body: Record<string, unknown>): NextRequest {
  ipCounter += 1;
  return new NextRequest('http://localhost/api/leads', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${ipCounter}` },
    body: JSON.stringify(body),
  });
}

const publicSubmission = {
  name: 'Priya Shah',
  email: 'priya@example.com',
  phone: '98332 57659',
  company: 'Acme',
  projectType: 'digital_marketing',
  projectDescription: 'Need more qualified leads',
  budgetRange: '25k_50k',
  timeline: '3_6_months',
  primaryChallenge: 'Lead quality',
  companySize: 'small_business',
  consentText: 'You may contact me about my enquiry.',
};

/** Runs everything scheduled to happen after the response was sent. */
async function flushAfterResponse(): Promise<void> {
  const tasks = mocks.afterTasks.splice(0);
  for (const task of tasks) await task();
}

beforeEach(() => {
  fake.reset();
  mocks.afterTasks.length = 0;
  mocks.delivered.length = 0;
  mocks.resendSend.mockReset();
  mocks.resendSend.mockImplementation(async (payload) => {
    mocks.delivered.push(payload);
    return { data: { id: 'resend_rcpt_1' }, error: null };
  });
  mocks.ingestLead.mockClear();
  mocks.notifyAdmins.mockClear();
  mocks.notifyTeam.mockClear();
  Object.assign(mocks.user, { id: 'user-1', role: 'manager' });
  // Every lead select answers with a full record, so a leak would show in the body.
  fake.respond((call) =>
    call.table === 'leads' && call.op === 'select'
      ? { data: leadRow({ id: 'lead_new', email: 'priya@example.com' }), error: null }
      : { data: null, error: null }
  );
});

describe('POST /api/leads', () => {
  it('answers a newly created lead with the generic received response', async () => {
    const res = await POST(postLead(publicSubmission));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toEqual({ received: true });
    expect(mocks.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('answers a submission merged into an existing lead with the same generic response', async () => {
    mocks.ingestLead.mockResolvedValueOnce({ leadId: 'lead_1', created: false });

    const res = await POST(postLead(publicSubmission));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toEqual({ received: true });
    const body = JSON.stringify(json);
    expect(body).not.toContain('priya@example.com');
    expect(body).not.toContain('9833257659');
    expect(body).not.toContain('lead_1');
  });

  it('ignores a source chosen by a public submission', async () => {
    await POST(postLead({ ...publicSubmission, source: 'cal_booking' }));

    expect(mocks.ingestLead.mock.calls[0]?.[0].source).toBe('website_form');
  });

  it('still saves the submission when the code is deployed before the migration', async () => {
    mocks.ingestLead.mockRejectedValueOnce({
      code: 'PGRST204',
      message: "Could not find the 'consent_basis' column of 'leads' in the schema cache",
    });

    const res = await POST(postLead(publicSubmission));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toEqual({ received: true });
    const inserts = fake.callsTo('leads', 'insert').map(payloadOf);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ email: 'priya@example.com', source: 'website_form', status: 'new', ip_address: expect.any(String) });
    expect(inserts[0]).not.toHaveProperty('consent_basis');
    expect(mocks.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('retries the pre-migration insert without capture metadata when those columns are missing too', async () => {
    mocks.ingestLead.mockRejectedValueOnce({ code: '42703', message: 'column leads.phone_e164 does not exist' });
    let insertAttempts = 0;
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'insert') {
        insertAttempts += 1;
        return insertAttempts === 1
          ? { data: null, error: { code: 'PGRST204', message: "Could not find the 'ip_address' column of 'leads' in the schema cache" } }
          : { data: null, error: null };
      }
      return { data: null, error: null };
    });

    const res = await POST(postLead(publicSubmission));

    expect(res.status).toBe(201);
    const inserts = fake.callsTo('leads', 'insert').map(payloadOf);
    expect(inserts).toHaveLength(2);
    expect(inserts[1]).toMatchObject({ email: 'priya@example.com' });
    expect(inserts[1]).not.toHaveProperty('ip_address');
  });
});

describe('POST /api/leads confirmation receipt', () => {
  const MIGRATION_MISSING = { code: 'PGRST204', message: "Could not find the 'consent_basis' column of 'leads' in the schema cache" };

  function sentEmails(): Array<Record<string, unknown>> {
    return mocks.resendSend.mock.calls.map((call) => call[0]);
  }

  function confirmationActivities(): Array<Record<string, unknown>> {
    return fake.callsTo('lead_activities', 'insert').map(payloadOf).filter((p) => p.type === 'confirmation_sent');
  }

  function suppressedAs(reason: string) {
    fake.respond((call) => {
      if (call.table === 'suppression_list') return { data: [{ reason }], error: null };
      if (call.table === 'leads' && call.op === 'select') return { data: leadRow({ id: 'lead_new' }), error: null };
      return { data: null, error: null };
    });
  }

  async function responseOf(res: Response): Promise<{ status: number; body: unknown }> {
    return { status: res.status, body: await res.json() };
  }

  const GENERIC = { status: 201, body: { success: true, data: { received: true } } };

  function without(body: Record<string, unknown>, key: string): Record<string, unknown> {
    return Object.fromEntries(Object.entries(body).filter(([name]) => name !== key));
  }

  it('sends a contact-page enquirer the receipt after the response, naming the service, and notes it on the lead', async () => {
    const res = await POST(postLead(contactPageBody({ name: 'Priya Shah', email: 'Priya.Shah@example.com', service: 'Social Media' })));

    expect(await responseOf(res)).toEqual(GENERIC);
    // Nothing is sent while the response is being built.
    expect(mocks.resendSend).not.toHaveBeenCalled();

    await flushAfterResponse();

    expect(sentEmails()).toHaveLength(1);
    const sent = sentEmails()[0];
    expect(sent).toMatchObject({ to: 'Priya.Shah@example.com', subject: "We've got your enquiry" });
    expect(sent?.text).toContain("Thanks for getting in touch with FreakingMinds — we've received your enquiry about social media marketing.");
    expect(JSON.stringify(sent)).not.toMatch(/unsubscribe/i);

    expect(confirmationActivities()).toEqual([
      expect.objectContaining({
        lead_id: 'lead_new',
        channel: 'email',
        direction: 'out',
        subject: "We've got your enquiry",
        provider_message_id: 'resend_rcpt_1',
      }),
    ]);
  });

  it('names the project type for a get-started brief', async () => {
    await POST(postLead(getStartedBody({ name: 'Meera Iyer', email: 'meera@example.com', projectType: 'website_design' })));
    await flushAfterResponse();

    expect(sentEmails()[0]?.text).toContain("we've received your enquiry about website design.");
    expect(sentEmails()[0]?.text).toMatch(/^Hi Meera,\n/);
  });

  it('sends the receipt for a submission merged into an existing lead, noting it on that lead', async () => {
    mocks.ingestLead.mockResolvedValueOnce({ leadId: 'lead_1', created: false });

    const res = await POST(postLead(contactPageBody({ name: 'Priya Shah', email: 'priya@example.com', service: '' })));
    expect(await responseOf(res)).toEqual(GENERIC);
    await flushAfterResponse();

    expect(sentEmails()).toHaveLength(1);
    expect(sentEmails()[0]?.text).toContain("we've received your enquiry.\n");
    expect(confirmationActivities().map((a) => a.lead_id)).toEqual(['lead_1']);
  });

  it('sends the receipt from the pre-migration fallback, with no timeline entry (that table does not exist yet)', async () => {
    mocks.ingestLead.mockRejectedValueOnce(MIGRATION_MISSING);

    const res = await POST(postLead(getStartedBody({ name: 'Meera Iyer', email: 'meera@example.com', projectType: 'branding' })));
    expect(await responseOf(res)).toEqual(GENERIC);
    await flushAfterResponse();

    expect(sentEmails()).toHaveLength(1);
    expect(sentEmails()[0]?.to).toBe('meera@example.com');
    expect(fake.callsTo('lead_activities', 'insert')).toHaveLength(0);
  });

  it('answers new, merged and fallback submissions identically, whether or not the receipt sends', async () => {
    const outcomes: Array<{ status: number; body: unknown }> = [];

    outcomes.push(await responseOf(await POST(postLead(contactPageBody({ name: 'Priya Shah', email: 'priya@example.com', service: 'PPC Advertising' })))));

    mocks.ingestLead.mockResolvedValueOnce({ leadId: 'lead_1', created: false });
    outcomes.push(await responseOf(await POST(postLead(contactPageBody({ name: 'Priya Shah', email: 'priya@example.com', service: '' })))));

    mocks.ingestLead.mockRejectedValueOnce(MIGRATION_MISSING);
    outcomes.push(await responseOf(await POST(postLead(getStartedBody({ name: 'Meera Iyer', email: 'meera@example.com', projectType: 'web_app' })))));

    mocks.resendSend.mockRejectedValueOnce(new Error('Resend is down'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    outcomes.push(await responseOf(await POST(postLead(getStartedBody({ name: 'Meera Iyer', email: 'meera@example.com', projectType: 'web_app' })))));
    await expect(flushAfterResponse()).resolves.toBeUndefined();
    error.mockRestore();

    expect(outcomes).toEqual([GENERIC, GENERIC, GENERIC, GENERIC]);
  });

  it('a failed send still leaves the normal success response, logs no address or message, and notes nothing', async () => {
    mocks.resendSend.mockResolvedValueOnce({ data: null, error: { message: 'The meera@example.com domain is not verified' } });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await POST(postLead(getStartedBody({ name: 'Meera Iyer', email: 'meera@example.com', projectType: 'web_app' })));
    expect(await responseOf(res)).toEqual(GENERIC);
    await expect(flushAfterResponse()).resolves.toBeUndefined();

    const logged = error.mock.calls.flat().map(String).join('\n');
    error.mockRestore();
    expect(logged).toContain('enquiry_receipt send failed');
    expect(logged).not.toContain('meera@example.com');
    expect(logged).not.toContain('We need a new site');
    expect(confirmationActivities()).toHaveLength(0);
  });

  it('sends nothing for a submission with no email address (rejected as invalid)', async () => {
    const res = await POST(postLead(without(contactPageBody({ name: 'Priya Shah', email: 'priya@example.com', service: '' }), 'email')));
    expect(res.status).toBe(400);
    await flushAfterResponse();

    expect(mocks.resendSend).not.toHaveBeenCalled();
  });

  it('sends nothing for a lead typed in through the admin Add Lead modal (no consent text)', async () => {
    const adminBody = without(getStartedBody({ name: 'Meera Iyer', email: 'meera@example.com', projectType: 'web_app' }), 'consentText');

    const res = await POST(postLead(adminBody));
    expect(res.status).toBe(201);
    await flushAfterResponse();

    expect(mocks.resendSend).not.toHaveBeenCalled();
  });

  it.each(['bounced', 'complaint', 'manual', 'deletion_request'])('sends nothing to an address suppressed as %s', async (reason) => {
    suppressedAs(reason);

    const res = await POST(postLead(contactPageBody({ name: 'Priya Shah', email: 'priya@example.com', service: '' })));
    expect(await responseOf(res)).toEqual(GENERIC);
    await flushAfterResponse();

    expect(mocks.resendSend).not.toHaveBeenCalled();
    expect(confirmationActivities()).toHaveLength(0);
  });

  it('sends nothing when the phone submitted with the form has a phone-only deletion request', async () => {
    fake.respond((call) => {
      if (call.table === 'suppression_list') {
        return { data: eqValue(call, 'phone_e164') === '+919833257659' ? [{ reason: 'deletion_request' }] : [], error: null };
      }
      if (call.table === 'leads' && call.op === 'select') return { data: leadRow({ id: 'lead_new' }), error: null };
      return { data: null, error: null };
    });

    const res = await POST(postLead(contactPageBody({ name: 'Priya Shah', email: 'priya@example.com', phone: '98332 57659', service: '' })));
    expect(await responseOf(res)).toEqual(GENERIC);
    await flushAfterResponse();

    expect(mocks.resendSend).not.toHaveBeenCalled();
    const phoneLookup = fake.callsTo('suppression_list', 'select').find((call) => eqValue(call, 'phone_e164') !== undefined);
    expect(phoneLookup && eqValue(phoneLookup, 'phone_e164')).toBe('+919833257659');
  });

  it('still sends to an address that unsubscribed from sales email: re-submitting is a fresh request', async () => {
    suppressedAs('unsubscribed');

    await POST(postLead(contactPageBody({ name: 'Priya Shah', email: 'priya@example.com', service: '' })));
    await flushAfterResponse();

    expect(mocks.delivered).toHaveLength(1);
  });
});

describe('POST /api/leads confirmation receipt: one per address per 24 hours', () => {
  const T0 = new Date('2026-09-17T06:00:00.000Z');
  const HOUR = 60 * 60 * 1000;

  /** The first `.gte(column, value)` on a call. */
  function gteValue(call: FakeCall, column: string): unknown {
    return call.filters.find((f) => f.method === 'gte' && f.args[0] === column)?.args[1];
  }

  /**
   * A lead_activities table that keeps what is written and answers the receipt
   * check by applying the query's own lead, type and time filters.
   */
  function respondWithTimeline(): Array<Record<string, unknown>> {
    const activities: Array<Record<string, unknown>> = [];
    fake.respond((call) => {
      if (call.table === 'lead_activities' && call.op === 'insert') {
        activities.push(payloadOf(call));
        return { data: null, error: null };
      }
      if (call.table === 'lead_activities' && call.op === 'select') {
        const since = gteValue(call, 'occurred_at');
        const matches = activities.filter(
          (a) =>
            a.lead_id === eqValue(call, 'lead_id') &&
            a.type === eqValue(call, 'type') &&
            typeof since === 'string' &&
            String(a.occurred_at) >= since
        );
        return { data: matches.map((a) => ({ id: a.id })), error: null };
      }
      if (call.table === 'leads' && call.op === 'select') return { data: leadRow({ id: 'lead_1' }), error: null };
      return { data: null, error: null };
    });
    return activities;
  }

  async function submitAt(at: Date): Promise<Response> {
    vi.setSystemTime(at);
    const res = await POST(postLead(contactPageBody({ name: 'Priya Shah', email: 'priya@example.com', service: 'Content Marketing' })));
    await flushAfterResponse();
    return res;
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // Every submission for this address lands on the same lead, as intake merges them.
    mocks.ingestLead.mockResolvedValue({ leadId: 'lead_1', created: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    mocks.ingestLead.mockReset();
    mocks.ingestLead.mockResolvedValue({ leadId: 'lead_new', created: true });
  });

  it('sends nothing for a second submission within 24 hours, and answers it exactly the same', async () => {
    respondWithTimeline();

    const first = await submitAt(T0);
    expect(mocks.delivered).toHaveLength(1);

    const second = await submitAt(new Date(T0.getTime() + 23 * HOUR + 59 * 60 * 1000));
    expect(mocks.delivered).toHaveLength(1);

    expect({ status: second.status, body: await second.json() }).toEqual({ status: first.status, body: await first.json() });
  });

  it('sends again once 24 hours have passed since the last confirmation', async () => {
    const activities = respondWithTimeline();

    await submitAt(T0);
    await submitAt(new Date(T0.getTime() + 24 * HOUR + 60 * 1000));

    expect(mocks.delivered).toHaveLength(2);
    expect(activities.filter((a) => a.type === 'confirmation_sent')).toHaveLength(2);
  });

  it("checks the lead the submission merged into, not the address's first lead", async () => {
    respondWithTimeline();
    await submitAt(T0);

    mocks.ingestLead.mockResolvedValueOnce({ leadId: 'lead_2', created: false });
    await submitAt(new Date(T0.getTime() + HOUR));

    expect(mocks.delivered).toHaveLength(2);
  });

  it('sends nothing when the check itself fails', async () => {
    fake.respond((call) =>
      call.table === 'lead_activities' && call.op === 'select'
        ? { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }
        : { data: null, error: null }
    );
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await submitAt(T0);
    error.mockRestore();

    expect(res.status).toBe(201);
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });

  it('cannot cap the pre-migration fallback (no timeline table): it sends once per accepted submission', async () => {
    mocks.ingestLead.mockRejectedValue({ code: 'PGRST204', message: "Could not find the 'consent_basis' column of 'leads' in the schema cache" });
    respondWithTimeline();

    await submitAt(T0);

    expect(mocks.delivered).toHaveLength(1);
    expect(fake.callsTo('lead_activities')).toHaveLength(0);
  });
});

function putLead(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/leads', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PUT /api/leads', () => {
  beforeEach(() => {
    fake.respond((call) =>
      call.table === 'leads' && call.op === 'select'
        ? { data: leadRow({ owner_id: 'user-2', assigned_to: 'Ben' }), error: null }
        : { data: null, error: null }
    );
  });

  it('answers not found when a manager edits a lead someone else owns', async () => {
    const res = await PUT(putLead({ id: 'lead_1', notes: 'Called them' }));

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Lead not found');
    expect(fake.callsTo('leads', 'update')).toHaveLength(0);
  });

  it('lets an admin edit any lead', async () => {
    Object.assign(mocks.user, { role: 'admin' });

    const res = await PUT(putLead({ id: 'lead_1', notes: 'Called them' }));

    expect(res.status).toBe(200);
    expect(fake.callsTo('leads', 'update').map(payloadOf)).toContainEqual({ notes: 'Called them' });
  });

  it('never changes ownership', async () => {
    Object.assign(mocks.user, { role: 'admin' });

    await PUT(putLead({ id: 'lead_1', assignedTo: 'Ben', notes: 'Called them' }));

    expect(fake.callsTo('leads', 'update').map(payloadOf).some((p) => 'assigned_to' in p)).toBe(false);
  });
});

describe('/api/leads logs carry no contact details', () => {
  const EMAIL = 'priya.shah@example.com';
  const PHONE = '+91 98332 57659';
  const PHONE_DIGITS = '9833257659';

  /** A database error that repeats the person's data, the way Postgres `details` quotes the failing row. */
  function rowQuotingError(code: string): { code: string; message: string } {
    return Object.assign(
      { code, message: `could not write the lead for ${EMAIL} (${PHONE})` },
      { details: `Failing row contains (lead_mfk2a9_x1y2z, Priya Shah, ${EMAIL}, ${PHONE}, new).`, hint: `Check ${EMAIL}` }
    );
  }

  let spies: Array<{ mock: { calls: unknown[][] }; mockRestore: () => void }> = [];

  beforeEach(() => {
    spies = (['error', 'warn', 'log', 'info'] as const).map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));
  });

  afterEach(() => {
    spies.forEach((spy) => spy.mockRestore());
    Object.assign(mocks.user, { role: 'manager' });
  });

  function logged(): string {
    return spies
      .flatMap((spy) => spy.mock.calls.flat())
      .map((arg) => (typeof arg === 'string' ? arg : arg instanceof Error ? `${arg.message} ${arg.stack}` : JSON.stringify(arg)))
      .join('\n');
  }

  function expectNoContactDetails(): void {
    const text = logged();
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain(EMAIL);
    expect(text).not.toMatch(/@example\.com/);
    expect(text.replace(/\D/g, '')).not.toContain(PHONE_DIGITS);
  }

  const submission = () => contactPageBody({ name: 'Priya Shah', email: EMAIL, phone: PHONE, service: 'PPC Advertising' });

  it('POST: an intake failure quoting the row logs its code, not the address or phone', async () => {
    mocks.ingestLead.mockRejectedValueOnce(rowQuotingError('XX000'));

    const res = await POST(postLead(submission()));

    expect(res.status).toBe(500);
    expect(logged()).toContain('XX000');
    expectNoContactDetails();
  });

  it('POST: a merge failure (an Error naming the matched address) logs neither', async () => {
    mocks.ingestLead.mockRejectedValueOnce(new Error(`update of the lead matched on ${EMAIL} / ${PHONE} failed`));

    const res = await POST(postLead(submission()));

    expect(res.status).toBe(500);
    expect(logged()).toContain('Error creating lead');
    expectNoContactDetails();
  });

  it('POST: a failed pre-migration fallback insert logs neither', async () => {
    mocks.ingestLead.mockRejectedValueOnce({ code: 'PGRST204', message: "Could not find the 'consent_basis' column of 'leads' in the schema cache" });
    fake.respond((call) => (call.table === 'leads' && call.op === 'insert' ? { data: null, error: rowQuotingError('23502') } : { data: null, error: null }));

    const res = await POST(postLead(submission()));

    expect(res.status).toBe(500);
    expect(logged()).toContain('23502');
    expectNoContactDetails();
  });

  it('POST: failing to load the new lead for the team notification logs neither', async () => {
    fake.respond((call) => (call.table === 'leads' && call.op === 'select' ? { data: null, error: rowQuotingError('PGRST116') } : { data: null, error: null }));

    const res = await POST(postLead(submission()));

    expect(res.status).toBe(201);
    expect(logged()).toContain('could not load the new lead');
    expectNoContactDetails();
  });

  it('GET: a query error echoing an admin search for an address logs neither', async () => {
    fake.respond((call) =>
      call.table === 'leads'
        ? { data: null, error: { code: 'PGRST100', message: `failed to parse logic tree ((name.ilike.%${EMAIL}%,phone.ilike.%${PHONE}%))` } }
        : { data: null, error: null }
    );

    const res = await GET(new NextRequest(`http://localhost/api/leads?search=${encodeURIComponent(EMAIL)}`));

    expect(res.status).toBe(500);
    expect(logged()).toContain('PGRST100');
    expectNoContactDetails();
  });

  it('PUT: an update error quoting the row logs neither', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select') return { data: leadRow({ owner_id: 'user-1' }), error: null };
      if (call.table === 'leads' && call.op === 'update') return { data: null, error: rowQuotingError('23514') };
      return { data: null, error: null };
    });

    const res = await PUT(
      new NextRequest('http://localhost/api/leads', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 'lead_1', notes: `Call ${PHONE}` }),
      })
    );

    expect(res.status).toBe(500);
    expect(logged()).toContain('23514');
    expectNoContactDetails();
  });

  it('DELETE: a failure after deleting logs neither', async () => {
    Object.assign(mocks.user, { role: 'admin' });
    vi.mocked(logAuditEvent).mockRejectedValueOnce(new Error(`audit write failed for ${EMAIL}, ${PHONE}`));

    const res = await DELETE(new NextRequest('http://localhost/api/leads?id=lead_1', { method: 'DELETE' }));

    expect(res.status).toBe(500);
    expect(logged()).toContain('Error deleting lead');
    expectNoContactDetails();
  });
});
