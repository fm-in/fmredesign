import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  ingestLead: vi.fn(async (_lead: unknown) => ({ leadId: 'lead_1', created: true })),
  logWebhook: vi.fn(async (_entry: unknown) => ({ id: 'log_1', duplicate: false, processed: false })),
  markWebhook: vi.fn(async (_id: unknown, _result: unknown) => undefined),
}));

vi.mock('@/lib/sales/intake/ingest', () => ({ ingestLead: mocks.ingestLead }));
vi.mock('@/lib/sales/intake/webhook-log', () => ({
  logWebhook: mocks.logWebhook,
  markWebhook: mocks.markWebhook,
  safeHeaders: () => ({}),
}));

import { GET, POST } from '../route';

const googleBody = {
  lead_id: 'G1',
  google_key: 'secret-key',
  user_column_data: [{ column_id: 'EMAIL', string_value: 'p@x.com' }],
};

function post(source: string, body: unknown, headers?: Record<string, string>) {
  const request = new NextRequest(`http://localhost/api/webhooks/sales/${source}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ source }) });
}

beforeEach(() => {
  process.env.GOOGLE_ADS_LEAD_KEY = 'secret-key';
  mocks.ingestLead.mockClear();
  mocks.logWebhook.mockClear();
  mocks.markWebhook.mockClear();
});

afterEach(() => {
  delete process.env.GOOGLE_ADS_LEAD_KEY;
});

describe('POST /api/webhooks/sales/[source]', () => {
  it('404s an unknown source', async () => {
    expect((await post('tiktok', {})).status).toBe(404);
  });

  it('503s until the source is configured', async () => {
    delete process.env.GOOGLE_ADS_LEAD_KEY;
    expect((await post('google', googleBody)).status).toBe(503);
  });

  it('401s and logs an unverified request without processing it', async () => {
    const res = await post('google', { ...googleBody, google_key: 'wrong' });
    expect(res.status).toBe(401);
    expect(mocks.logWebhook).toHaveBeenCalledWith(expect.objectContaining({ signatureValid: false }));
    expect(mocks.ingestLead).not.toHaveBeenCalled();
  });

  it('ingests a verified lead and answers with the adapter success body', async () => {
    const res = await post('google', googleBody);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({});
    expect(mocks.ingestLead).toHaveBeenCalledTimes(1);
    expect(mocks.markWebhook).toHaveBeenCalledWith('log_1', { processed: true });
  });

  it('skips a delivery that was already processed', async () => {
    mocks.logWebhook.mockResolvedValueOnce({ id: 'log_1', duplicate: true, processed: true });
    expect((await post('google', googleBody)).status).toBe(200);
    expect(mocks.ingestLead).not.toHaveBeenCalled();
  });

  it('400s a verified but unusable payload so the platform stops retrying', async () => {
    const res = await post('google', { google_key: 'secret-key', user_column_data: [] });
    expect(res.status).toBe(400);
  });

  it('throttles logging of repeated invalid-signature requests from one IP, but always answers 401', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.9' };
    const bad = { ...googleBody, google_key: 'wrong' };

    for (let i = 0; i < 11; i++) {
      const res = await post('google', bad, headers);
      expect(res.status).toBe(401);
    }

    expect(mocks.logWebhook).toHaveBeenCalledTimes(10);
  });
});

describe('GET /api/webhooks/sales/[source]', () => {
  it('404s a source without a handshake', async () => {
    const res = await GET(new NextRequest('http://localhost/api/webhooks/sales/google'), {
      params: Promise.resolve({ source: 'google' }),
    });
    expect(res.status).toBe(404);
  });
});
