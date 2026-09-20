import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';

const logWebhook = vi.fn(async () => ({ id: 'log_1', duplicate: false, processed: false }));
const markWebhook = vi.fn(async () => undefined);
vi.mock('@/lib/sales/intake/webhook-log', () => ({
  logWebhook: (...a: unknown[]) => logWebhook(...(a as [])),
  markWebhook: (...a: unknown[]) => markWebhook(...(a as [])),
  safeHeaders: () => ({}),
}));

const handleWhatsAppEvents = vi.fn(async () => undefined);
vi.mock('@/lib/whatsapp/inbound', () => ({ handleWhatsAppEvents: () => handleWhatsAppEvents() }));

import { GET, POST } from '../route';
import { POST as SALES_POST } from '../../sales/[source]/route';

const SECRET = 'app-secret';
const BODY = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'waba',
      changes: [
        {
          field: 'messages',
          value: { metadata: { phone_number_id: '1' }, messages: [{ id: 'wamid.A', from: '919833257659', type: 'text', text: { body: 'hi' } }] },
        },
      ],
    },
  ],
});

function signed(url: string, body: string, secret = SECRET) {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`,
    },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('WHATSAPP_APP_SECRET', SECRET);
  vi.stubEnv('WHATSAPP_VERIFY_TOKEN', 'verify-me');
  logWebhook.mockResolvedValue({ id: 'log_1', duplicate: false, processed: false });
});

afterEach(() => vi.unstubAllEnvs());

describe('GET /api/webhooks/whatsapp', () => {
  it('echoes the challenge when the verify token matches', async () => {
    const res = await GET(
      new NextRequest('https://x.test/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42')
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('42');
  });

  it('refuses a wrong token', async () => {
    const res = await GET(
      new NextRequest('https://x.test/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42')
    );
    expect(res.status).toBe(403);
  });
});

describe('POST /api/webhooks/whatsapp', () => {
  it('verifies the signature and hands the payload on', async () => {
    const res = await POST(signed('https://x.test/api/webhooks/whatsapp', BODY));
    expect(res.status).toBe(200);
    expect(handleWhatsAppEvents).toHaveBeenCalledTimes(1);
  });

  it('logs under `whatsapp`, not `sales:whatsapp`', async () => {
    // The whole point of the path: these messages are not all about sales.
    await POST(signed('https://x.test/api/webhooks/whatsapp', BODY));
    expect(logWebhook).toHaveBeenCalledWith(expect.objectContaining({ provider: 'whatsapp', signatureValid: true }));
  });

  it('rejects a bad signature without handling anything', async () => {
    const res = await POST(signed('https://x.test/api/webhooks/whatsapp', BODY, 'wrong-secret'));
    expect(res.status).toBe(401);
    expect(handleWhatsAppEvents).not.toHaveBeenCalled();
  });

  it('keeps the message body out of the log', async () => {
    await POST(signed('https://x.test/api/webhooks/whatsapp', BODY));
    expect(JSON.stringify(logWebhook.mock.calls[0])).not.toContain('"hi"');
  });

  it('does not re-handle a delivery Meta has already sent', async () => {
    logWebhook.mockResolvedValue({ id: 'log_1', duplicate: true, processed: true });
    const res = await POST(signed('https://x.test/api/webhooks/whatsapp', BODY));
    expect(res.status).toBe(200);
    expect(handleWhatsAppEvents).not.toHaveBeenCalled();
  });

  it('answers 503 until the credentials are set', async () => {
    vi.stubEnv('WHATSAPP_APP_SECRET', '');
    const res = await POST(signed('https://x.test/api/webhooks/whatsapp', BODY));
    expect(res.status).toBe(503);
  });
});

describe('the older /sales/whatsapp path', () => {
  it('still works, so a callback URL already given to Meta keeps delivering', async () => {
    const res = await SALES_POST(signed('https://x.test/api/webhooks/sales/whatsapp', BODY), {
      params: Promise.resolve({ source: 'whatsapp' }),
    });
    expect(res.status).toBe(200);
    expect(handleWhatsAppEvents).toHaveBeenCalledTimes(1);
  });

  it('is distinguishable in the log, so the admin screen can say which arrived', async () => {
    await SALES_POST(signed('https://x.test/api/webhooks/sales/whatsapp', BODY), {
      params: Promise.resolve({ source: 'whatsapp' }),
    });
    expect(logWebhook).toHaveBeenCalledWith(expect.objectContaining({ provider: 'sales:whatsapp' }));
  });
});
