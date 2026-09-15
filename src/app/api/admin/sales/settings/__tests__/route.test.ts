import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fake } from '@/test-utils/fake-supabase';

const mocks = vi.hoisted(() => ({
  user: { id: 'u-admin', name: 'Asha', role: 'admin', permissions: ['sales.read', 'sales.write'] },
}));

vi.mock('@/lib/admin-auth-middleware', () => ({
  requirePermission: vi.fn(async () => ({ user: mocks.user })),
}));
vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn(async () => undefined) } }));

import { requirePermission } from '@/lib/admin-auth-middleware';
import { GET, PUT } from '../route';

/** Enough of a fake response shape for buildPayload() to run without throwing. */
function respondEmpty() {
  fake.respond(() => ({ data: [], error: null }));
}

function respondToRotationLookup(existingIds: string[]) {
  fake.respond((call) => {
    if (call.table === 'authorized_users' && call.op === 'select') {
      return { data: existingIds.map((id) => ({ id })), error: null };
    }
    return { data: [], error: null };
  });
}

beforeEach(() => {
  fake.reset();
  vi.mocked(requirePermission).mockClear();
});

describe('/api/admin/sales/settings', () => {
  it('requests sales.read for GET', async () => {
    respondEmpty();
    const res = await GET(new NextRequest('http://localhost/api/admin/sales/settings'));
    expect(res.status).toBe(200);
    expect(requirePermission).toHaveBeenCalledWith(expect.anything(), 'sales.read');
  });

  it('requests sales.write for PUT', async () => {
    respondEmpty();
    const res = await PUT(
      new NextRequest('http://localhost/api/admin/sales/settings', { method: 'PUT', body: JSON.stringify({}) })
    );
    expect(res.status).toBe(200);
    expect(requirePermission).toHaveBeenCalledWith(expect.anything(), 'sales.write');
  });

  it('rejects a rotation with an id that does not exist, and writes nothing', async () => {
    respondToRotationLookup(['user-1']);
    const res = await PUT(
      new NextRequest('http://localhost/api/admin/sales/settings', {
        method: 'PUT',
        body: JSON.stringify({ rotation: ['user-1', 'does-not-exist'] }),
      })
    );
    expect(res.status).toBe(400);
    expect(fake.callsTo('authorized_users', 'update')).toHaveLength(0);
    expect(fake.callsTo('admin_settings', 'upsert')).toHaveLength(0);
  });
});
