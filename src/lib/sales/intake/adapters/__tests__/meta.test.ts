import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';

const mocks = vi.hoisted(() => ({ send: vi.fn(async (_event: unknown) => undefined) }));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: mocks.send } }));

import { extractLeadgenChanges, metaAdapter } from '../meta';

const payload = {
  object: 'page',
  entry: [
    {
      id: '1234567890',
      time: 1726380000,
      changes: [
        { field: 'leadgen', value: { leadgen_id: '444', page_id: '1234567890', form_id: '555', ad_id: '666', created_time: 1726380000 } },
        { field: 'feed', value: { item: 'status' } },
      ],
    },
  ],
};

beforeEach(() => {
  process.env.META_APP_SECRET = 'app-secret';
  process.env.META_LEADS_VERIFY_TOKEN = 'verify-me';
  mocks.send.mockClear();
});

afterEach(() => {
  delete process.env.META_APP_SECRET;
  delete process.env.META_LEADS_VERIFY_TOKEN;
});

describe('metaAdapter.handleGet', () => {
  it('echoes the challenge for the right verify token', async () => {
    const res = metaAdapter.handleGet!(
      new Request('http://localhost/api/webhooks/sales/meta?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc123')
    );
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe('abc123');
  });

  it('refuses a wrong token', () => {
    const res = metaAdapter.handleGet!(
      new Request('http://localhost/api/webhooks/sales/meta?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=abc123')
    );
    expect(res.status).toBe(403);
  });
});

describe('metaAdapter.verify', () => {
  it('checks the X-Hub-Signature-256 HMAC of the raw body', () => {
    const rawBody = JSON.stringify(payload);
    const signature = createHmac('sha256', 'app-secret').update(rawBody).digest('hex');
    const signed = new Request('http://localhost', { method: 'POST', headers: { 'x-hub-signature-256': `sha256=${signature}` } });
    const forged = new Request('http://localhost', { method: 'POST', headers: { 'x-hub-signature-256': 'sha256=deadbeef' } });
    expect(metaAdapter.verify({ request: signed, rawBody })).toBe(true);
    expect(metaAdapter.verify({ request: forged, rawBody })).toBe(false);
  });
});

describe('leadgen changes', () => {
  it('extracts only leadgen changes', () => {
    expect(extractLeadgenChanges(payload)).toEqual([{ leadgenId: '444', pageId: '1234567890', formId: '555', adId: '666' }]);
    expect(extractLeadgenChanges({ object: 'user', entry: [] })).toEqual([]);
  });

  it('describes the delivery by its lead ids', () => {
    expect(metaAdapter.describe(payload)).toEqual({ externalId: 'leadgen:444', eventType: 'leadgen' });
  });

  it('queues one Inngest event per lead', async () => {
    await metaAdapter.handle(payload);
    expect(mocks.send).toHaveBeenCalledWith({
      id: 'meta-leadgen-444',
      name: 'sales/meta.leadgen',
      data: { leadgenId: '444', pageId: '1234567890', formId: '555', adId: '666' },
    });
  });

  it('gives every lead its own event id, so a redelivered webhook is deduplicated', async () => {
    await metaAdapter.handle({
      object: 'page',
      entry: [
        {
          id: '1234567890',
          changes: [
            { field: 'leadgen', value: { leadgen_id: '444', page_id: '1234567890' } },
            { field: 'leadgen', value: { leadgen_id: '445', page_id: '1234567890' } },
          ],
        },
      ],
    });

    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'meta-leadgen-444' }));
    expect(mocks.send).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'meta-leadgen-445' }));
  });
});
