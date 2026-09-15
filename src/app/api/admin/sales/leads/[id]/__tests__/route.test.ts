import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fake, payloadOf } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';

const mocks = vi.hoisted(() => ({
  user: { id: 'u-mgr', name: 'Maya', role: 'manager', permissions: ['sales.read', 'sales.write'] },
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

import { GET, PATCH } from '../route';

const context = { params: Promise.resolve({ id: 'lead_1' }) };

function respondWithLead(ownerId: string | null) {
  fake.respond((call) => {
    if (call.table === 'leads' && call.op === 'select') return { data: leadRow({ owner_id: ownerId }), error: null };
    if (call.table === 'authorized_users') {
      return call.single
        ? { data: { id: 'u-mgr', name: 'Maya', email: 'maya@fm.in' }, error: null }
        : { data: [{ id: 'u-mgr', name: 'Maya' }], error: null };
    }
    if (call.op === 'select') return { data: [], error: null };
    return { data: null, error: null };
  });
}

beforeEach(() => fake.reset());

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

  it('refuses to mark a lead lost without a reason', async () => {
    respondWithLead('u-mgr');
    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/sales/leads/lead_1', { method: 'PATCH', body: JSON.stringify({ status: 'lost' }) }),
      context
    );
    expect(res.status).toBe(400);
  });

  it('lets a manager take an unassigned lead', async () => {
    respondWithLead(null);
    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/sales/leads/lead_1', { method: 'PATCH', body: JSON.stringify({ ownerId: 'u-mgr' }) }),
      context
    );
    expect(res.status).toBe(200);
    expect(fake.callsTo('leads', 'update').map(payloadOf)).toContainEqual({ owner_id: 'u-mgr', assigned_to: 'Maya' });
  });
});
