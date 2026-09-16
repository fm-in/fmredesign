import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fake, payloadOf } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';

const mocks = vi.hoisted(() => ({
  user: { id: 'u-mgr', name: 'Maya', role: 'manager', permissions: ['sales.read', 'sales.write'] },
  logAuditEvent: vi.fn(async () => undefined),
}));

vi.mock('@/lib/admin-auth-middleware', () => ({
  requirePermission: vi.fn(async () => ({ user: mocks.user })),
}));
vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn(async () => undefined) } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));
vi.mock('@/lib/admin/audit-log', () => ({
  logAuditEvent: mocks.logAuditEvent,
  getClientIP: vi.fn(() => '127.0.0.1'),
}));

import { GET, PATCH } from '../route';

const context = { params: Promise.resolve({ id: 'lead_1' }) };

function respondWithLead(ownerId: string | null) {
  fake.respond((call) => {
    if (call.table === 'leads' && call.op === 'select') return { data: leadRow({ owner_id: ownerId }), error: null };
    if (call.table === 'leads' && call.op === 'update') return { data: [{ id: 'lead_1' }], error: null };
    if (call.table === 'authorized_users') {
      return call.single
        ? { data: { id: 'u-mgr', name: 'Maya', email: 'maya@fm.in' }, error: null }
        : { data: [{ id: 'u-mgr', name: 'Maya' }], error: null };
    }
    if (call.op === 'select') return { data: [], error: null };
    return { data: null, error: null };
  });
}

/** Someone else claimed the lead between our read and our write: the CAS update matches no rows. */
function respondWithRaceLost() {
  fake.respond((call) => {
    if (call.table === 'leads' && call.op === 'select') return { data: leadRow({ owner_id: null }), error: null };
    if (call.table === 'leads' && call.op === 'update') return { data: [], error: null };
    if (call.table === 'authorized_users') {
      return call.single
        ? { data: { id: 'u-mgr', name: 'Maya', email: 'maya@fm.in' }, error: null }
        : { data: [{ id: 'u-mgr', name: 'Maya' }], error: null };
    }
    if (call.op === 'select') return { data: [], error: null };
    return { data: null, error: null };
  });
}

beforeEach(() => {
  fake.reset();
  mocks.logAuditEvent.mockClear();
});

describe('/api/admin/sales/leads/[id]', () => {
  it("hides another person's lead from a manager", async () => {
    respondWithLead('someone-else');
    const res = await GET(new NextRequest('http://localhost/api/admin/sales/leads/lead_1'), context);
    expect(res.status).toBe(404);
  });

  it('returns an unassigned lead with its timeline', async () => {
    respondWithLead(null);
    const res = await GET(new NextRequest('http://localhost/api/admin/sales/leads/lead_1'), context);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.lead).toMatchObject({ id: 'lead_1', phoneE164: '+919833257659' });
    expect(json.data.permissions).toEqual({ canAssign: false, userId: 'u-mgr' });
  });

  it('returns form answers and activity metadata with the keys they were saved with', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select') {
        return { data: leadRow({ owner_id: null, custom_fields: { budget_range: '50k', 'What do you sell?': 'Tiles' } }), error: null };
      }
      if (call.table === 'lead_activities') {
        return {
          data: [
            {
              id: 'act_1',
              lead_id: 'lead_1',
              type: 'form_submitted',
              metadata: { customFields: { team_size: '10' }, source_detail: 'Get started' },
              occurred_at: '2026-09-15T04:00:00.000Z',
            },
          ],
          error: null,
        };
      }
      if (call.op === 'select') return { data: [], error: null };
      return { data: null, error: null };
    });

    const res = await GET(new NextRequest('http://localhost/api/admin/sales/leads/lead_1'), context);
    const json = await res.json();

    expect(json.data.lead.customFields).toEqual({ budget_range: '50k', 'What do you sell?': 'Tiles' });
    expect(json.data.lead.phoneE164).toBe('+919833257659');
    expect(json.data.activities[0]).toMatchObject({ leadId: 'lead_1', occurredAt: '2026-09-15T04:00:00.000Z' });
    expect(json.data.activities[0].metadata).toEqual({ customFields: { team_size: '10' }, source_detail: 'Get started' });
  });

  it('includes the recommended sequence and start state when it can start', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select') {
        return { data: leadRow({ owner_id: null, source: 'website_form', custom_fields: { formName: 'Get started' } }), error: null };
      }
      if (call.table === 'admin_settings') return { data: { sales: { automationEnabled: true } }, error: null };
      if (call.table === 'suppression_list') return { data: [], error: null };
      if (call.op === 'select') return { data: [], error: null };
      return { data: null, error: null };
    });

    const res = await GET(new NextRequest('http://localhost/api/admin/sales/leads/lead_1'), context);
    const json = await res.json();
    expect(json.data.sequences).toEqual({ recommended: 'brief-v1', canStart: true, blockedReason: null });
  });

  it('reports the blocked reason in the sequences payload when automation is off', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select') return { data: leadRow({ owner_id: null }), error: null };
      if (call.table === 'admin_settings') return { data: { sales: { automationEnabled: false } }, error: null };
      if (call.table === 'suppression_list') return { data: [], error: null };
      if (call.op === 'select') return { data: [], error: null };
      return { data: null, error: null };
    });

    const res = await GET(new NextRequest('http://localhost/api/admin/sales/leads/lead_1'), context);
    const json = await res.json();
    expect(json.data.sequences.canStart).toBe(false);
    expect(json.data.sequences.blockedReason).toMatch(/automation is switched off/i);
  });

  it('refuses to mark a lead lost without a reason', async () => {
    respondWithLead('u-mgr');
    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/sales/leads/lead_1', { method: 'PATCH', body: JSON.stringify({ status: 'lost' }) }),
      context
    );
    expect(res.status).toBe(400);
  });

  it('lets a manager take an unassigned lead, audits the change', async () => {
    respondWithLead(null);
    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/sales/leads/lead_1', { method: 'PATCH', body: JSON.stringify({ ownerId: 'u-mgr' }) }),
      context
    );
    expect(res.status).toBe(200);
    expect(fake.callsTo('leads', 'update').map(payloadOf)).toContainEqual({ owner_id: 'u-mgr', assigned_to: 'Maya' });
    expect((await res.json()).data.lead.customFields).toEqual({});
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_type: 'lead',
        resource_id: 'lead_1',
        details: { field: 'owner', from: null, to: 'u-mgr' },
      })
    );
  });

  it('refuses to reassign a lead that was just claimed by someone else', async () => {
    respondWithRaceLost();
    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/sales/leads/lead_1', { method: 'PATCH', body: JSON.stringify({ ownerId: 'u-mgr' }) }),
      context
    );
    expect(res.status).toBe(409);
    expect(fake.callsTo('lead_activities', 'insert')).toHaveLength(0);
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });
});
