import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fake } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';
import type { LeadRow } from '@/lib/sales/types';

const mocks = vi.hoisted(() => ({
  user: { id: 'user-1', name: 'Asha', role: 'manager', permissions: ['sales.read', 'sales.write'] },
  changeStage: vi.fn<(...args: unknown[]) => Promise<void>>(async () => undefined),
}));

vi.mock('@/lib/admin-auth-middleware', () => ({
  requirePermission: vi.fn(async () => ({ user: mocks.user })),
}));
vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/admin/audit-log', () => ({ logAuditEvent: vi.fn(async () => undefined), getClientIP: () => '127.0.0.1' }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));
vi.mock('@/lib/sales/activity', () => ({ changeStage: mocks.changeStage }));

import { POST } from '../route';

function respondWithLead(lead: LeadRow): void {
  fake.respond((call) => {
    if (call.table === 'leads' && call.op === 'select') return { data: lead, error: null };
    if (call.table === 'clients' && call.op === 'select') return { data: [], error: null };
    return { data: null, error: null };
  });
}

function convert() {
  return POST(
    new NextRequest('http://localhost/api/leads/convert', { method: 'POST', body: JSON.stringify({ leadId: 'lead_1' }) })
  );
}

beforeEach(() => {
  fake.reset();
  mocks.changeStage.mockClear();
  Object.assign(mocks.user, { id: 'user-1', role: 'manager' });
});

describe('POST /api/leads/convert', () => {
  it('answers not found when a manager converts a lead someone else owns', async () => {
    respondWithLead(leadRow({ owner_id: 'user-2' }));

    const res = await convert();

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Lead not found');
    expect(fake.callsTo('clients', 'insert')).toHaveLength(0);
    expect(mocks.changeStage).not.toHaveBeenCalled();
  });

  it('lets an admin convert any lead', async () => {
    Object.assign(mocks.user, { role: 'admin' });
    respondWithLead(leadRow({ owner_id: 'user-2' }));

    const res = await convert();

    expect(res.status).toBe(200);
    expect(fake.callsTo('clients', 'insert')).toHaveLength(1);
    expect(mocks.changeStage).toHaveBeenCalledWith('lead_1', 'won', expect.anything(), expect.anything());
  });

  it('asks for an email address before converting a lead without one', async () => {
    respondWithLead(leadRow({ owner_id: 'user-1', email: null }));

    const res = await convert();

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Add an email address to this lead before converting it to a client');
    expect(fake.callsTo('clients', 'insert')).toHaveLength(0);
  });
});
