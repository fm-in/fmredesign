import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    expect(json.data.sequences).toEqual({
      recommended: 'brief-v1',
      canStart: true,
      blockedReason: null,
      starting: false,
      lastStartFailed: false,
    });
  });

  describe('start in flight or failed', () => {
    const NOW = new Date('2026-09-17T06:00:00.000Z');
    const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(NOW);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    function respondWithActivities(sequenceStatus: 'active' | null, activities: Array<{ type: string; occurred_at: string }>) {
      fake.respond((call) => {
        if (call.table === 'leads' && call.op === 'select') {
          return { data: leadRow({ owner_id: null, sequence_status: sequenceStatus, sequence_key: sequenceStatus ? 'enquiry-v1' : null }), error: null };
        }
        if (call.table === 'lead_activities') {
          return { data: activities.map((a, i) => ({ id: `act_${i}`, lead_id: 'lead_1', metadata: {}, ...a })), error: null };
        }
        if (call.table === 'admin_settings') return { data: { sales: { automationEnabled: true } }, error: null };
        if (call.op === 'select') return { data: [], error: null };
        return { data: null, error: null };
      });
    }

    async function sequencesPayload() {
      const json = await (await GET(new NextRequest('http://localhost/api/admin/sales/leads/lead_1'), context)).json();
      return json.data.sequences as { starting: boolean; lastStartFailed: boolean; canStart: boolean };
    }

    it('is starting inside the window when nothing has enrolled yet', async () => {
      respondWithActivities(null, [{ type: 'sequence_started', occurred_at: minutesAgo(3) }]);
      expect(await sequencesPayload()).toMatchObject({ starting: true, lastStartFailed: false });
    });

    it('uses the newest sequence_started even when a later activity landed on top of it', async () => {
      respondWithActivities(null, [
        { type: 'note', occurred_at: minutesAgo(1) },
        { type: 'sequence_started', occurred_at: minutesAgo(4) },
      ]);
      expect(await sequencesPayload()).toMatchObject({ starting: true, lastStartFailed: false });
    });

    it('stops reporting starting once the window passes, and reports the start as failed', async () => {
      respondWithActivities(null, [{ type: 'sequence_started', occurred_at: minutesAgo(11) }]);
      expect(await sequencesPayload()).toMatchObject({ starting: false, lastStartFailed: true, canStart: true });
    });

    it('moves from starting to failed as the clock passes ten minutes', async () => {
      respondWithActivities(null, [{ type: 'sequence_started', occurred_at: NOW.toISOString() }]);
      vi.setSystemTime(new Date(NOW.getTime() + 9 * 60_000));
      expect(await sequencesPayload()).toMatchObject({ starting: true, lastStartFailed: false });
      vi.setSystemTime(new Date(NOW.getTime() + 10 * 60_000));
      expect(await sequencesPayload()).toMatchObject({ starting: false, lastStartFailed: true });
    });

    it('is neither starting nor failed once the sequence has enrolled', async () => {
      respondWithActivities('active', [{ type: 'sequence_started', occurred_at: minutesAgo(3) }]);
      expect(await sequencesPayload()).toMatchObject({ starting: false, lastStartFailed: false });

      respondWithActivities('active', [{ type: 'sequence_started', occurred_at: minutesAgo(30) }]);
      expect(await sequencesPayload()).toMatchObject({ starting: false, lastStartFailed: false });
    });

    it('is neither starting nor failed when no start was ever recorded', async () => {
      respondWithActivities(null, [{ type: 'note', occurred_at: minutesAgo(1) }]);
      expect(await sequencesPayload()).toMatchObject({ starting: false, lastStartFailed: false });
    });

    it('carries the sequence key on the lead', async () => {
      respondWithActivities('active', []);
      const json = await (await GET(new NextRequest('http://localhost/api/admin/sales/leads/lead_1'), context)).json();
      expect(json.data.lead.sequenceKey).toBe('enquiry-v1');
    });
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
