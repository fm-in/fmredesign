import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(async (_request: unknown, _permission: string) => ({
    error: new Response(null, { status: 403 }),
  })),
}));

vi.mock('@/lib/admin-auth-middleware', () => ({
  requirePermission: mocks.requirePermission,
  requireAdminAuth: vi.fn(async () => null),
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(() => {
    throw new Error('the database must not be reached when permission is denied');
  }),
}));

function lastPermission(): string | undefined {
  return mocks.requirePermission.mock.calls.at(-1)?.[1];
}

describe('sales route permissions', () => {
  beforeEach(() => mocks.requirePermission.mockClear());

  it('GET /api/leads requires sales.read', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/api/leads'));
    expect(res.status).toBe(403);
    expect(lastPermission()).toBe('sales.read');
  });

  it('PUT /api/leads requires sales.write', async () => {
    const { PUT } = await import('../route');
    const res = await PUT(new NextRequest('http://localhost/api/leads', { method: 'PUT', body: '{}' }));
    expect(res.status).toBe(403);
    expect(lastPermission()).toBe('sales.write');
  });

  it('GET /api/leads/analytics requires sales.read', async () => {
    const { GET } = await import('../analytics/route');
    const res = await GET(new NextRequest('http://localhost/api/leads/analytics'));
    expect(res.status).toBe(403);
    expect(lastPermission()).toBe('sales.read');
  });

  it('POST /api/leads/convert requires sales.write', async () => {
    const { POST } = await import('../convert/route');
    const res = await POST(new NextRequest('http://localhost/api/leads/convert', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(403);
    expect(lastPermission()).toBe('sales.write');
  });

  it('GET /api/admin/scorecard requires sales.read', async () => {
    const { GET } = await import('@/app/api/admin/scorecard/route');
    const res = await GET(new NextRequest('http://localhost/api/admin/scorecard'));
    expect(res.status).toBe(403);
    expect(lastPermission()).toBe('sales.read');
  });

  it('POST /api/admin/scrape-jobs/execute requires settings.write', async () => {
    const { POST } = await import('@/app/api/admin/scrape-jobs/execute/route');
    const res = await POST(new NextRequest('http://localhost/api/admin/scrape-jobs/execute', { method: 'POST' }));
    expect(res.status).toBe(403);
    expect(lastPermission()).toBe('settings.write');
  });
});
