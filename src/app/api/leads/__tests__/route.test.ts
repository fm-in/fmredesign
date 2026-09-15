import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fake } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';
import type { IntakeLead } from '@/lib/sales/types';
import type { IngestResult } from '@/lib/sales/intake/ingest';

const mocks = vi.hoisted(() => ({
  ingestLead: vi.fn(async (_lead: IntakeLead): Promise<IngestResult> => ({ leadId: 'lead_new', created: true })),
  notifyAdmins: vi.fn(async (_opts: unknown) => undefined),
  notifyTeam: vi.fn((_subject: string, _html: string) => undefined),
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
  requirePermission: vi.fn(async () => ({ error: new Response(null, { status: 403 }) })),
  requireAdminAuth: vi.fn(async () => null),
}));
vi.mock('@/lib/admin/audit-log', () => ({ logAuditEvent: vi.fn(async () => undefined), getClientIP: () => '127.0.0.1' }));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn(async () => undefined) } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));

import { POST } from '../route';

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
  // Every lead select answers with a full record, so a leak would show in the body.
  fake.respond((call) =>
    call.table === 'leads' && call.op === 'select'
      ? { data: leadRow({ id: 'lead_new', email: 'priya@example.com' }), error: null }
      : { data: null, error: null }
  );
});

describe('POST /api/leads', () => {
  it('returns only the id of a newly created lead', async () => {
    const res = await POST(postLead(publicSubmission));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toEqual({ id: 'lead_new' });
    expect(mocks.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('returns no lead data when the submission merged into an existing lead', async () => {
    mocks.ingestLead.mockResolvedValueOnce({ leadId: 'lead_1', created: false });

    const res = await POST(postLead(publicSubmission));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual({ id: null });
    const body = JSON.stringify(json);
    expect(body).not.toContain('priya@example.com');
    expect(body).not.toContain('9833257659');
    expect(body).not.toContain('lead_1');
  });

  it('ignores a source chosen by a public submission', async () => {
    await POST(postLead({ ...publicSubmission, source: 'cal_booking' }));

    expect(mocks.ingestLead.mock.calls[0]?.[0].source).toBe('website_form');
  });
});
