import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ unsubscribeEmail: vi.fn(async (_email: string, _via: string) => undefined) }));
vi.mock('@/lib/sales/unsubscribe', () => ({ unsubscribeEmail: mocks.unsubscribeEmail }));

import { POST } from '../route';
import { signUnsubscribeToken } from '@/lib/sales/unsubscribe-token';

beforeEach(() => {
  process.env.SALES_LINK_SECRET = 'test-secret-with-enough-length';
  mocks.unsubscribeEmail.mockClear();
});

afterEach(() => {
  delete process.env.SALES_LINK_SECRET;
});

describe('POST /api/sales/unsubscribe', () => {
  it('handles a one-click unsubscribe with the token in the URL', async () => {
    const token = encodeURIComponent(signUnsubscribeToken('priya@example.com'));
    const res = await POST(
      new NextRequest(`http://localhost/api/sales/unsubscribe?t=${token}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click',
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.unsubscribeEmail).toHaveBeenCalledWith('priya@example.com', 'link');
  });

  it('accepts the token in a JSON body', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/sales/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ t: signUnsubscribeToken('priya@example.com') }),
      })
    );
    expect(res.status).toBe(200);
  });

  it('rejects a forged token', async () => {
    const res = await POST(new NextRequest('http://localhost/api/sales/unsubscribe?t=abc.def', { method: 'POST' }));
    expect(res.status).toBe(400);
    expect(mocks.unsubscribeEmail).not.toHaveBeenCalled();
  });

  it('503s when unsubscribe links are not configured', async () => {
    delete process.env.SALES_LINK_SECRET;
    const res = await POST(new NextRequest('http://localhost/api/sales/unsubscribe?t=abc.def', { method: 'POST' }));
    expect(res.status).toBe(503);
  });
});
