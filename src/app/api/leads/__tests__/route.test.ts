import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fake, payloadOf } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';
import type { IntakeLead } from '@/lib/sales/types';
import type { IngestResult } from '@/lib/sales/intake/ingest';

const mocks = vi.hoisted(() => ({
  ingestLead: vi.fn<(lead: IntakeLead) => Promise<IngestResult>>(async () => ({ leadId: 'lead_new', created: true })),
  notifyAdmins: vi.fn(async () => undefined),
  notifyTeam: vi.fn(),
  user: { id: 'user-1', name: 'Asha', role: 'manager', permissions: ['sales.read', 'sales.write'] },
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

import { POST, PUT } from '../route';

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

beforeEach(() => {
  fake.reset();
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
