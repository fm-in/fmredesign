import { describe, it, expect, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { extractWhatsAppEvents, whatsappAdapter } from '../whatsapp';

const inbound = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '1740118223883588',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '916268112515', phone_number_id: '1265592716642975' },
            contacts: [{ profile: { name: 'Priya Shah' }, wa_id: '919833257659' }],
            messages: [
              {
                from: '919833257659',
                id: 'wamid.HBgMOTE5ODMzMjU3NjU5',
                timestamp: '1789200000',
                type: 'text',
                text: { body: 'Yes, Tuesday works for the call' },
              },
            ],
          },
        },
      ],
    },
  ],
};

const statusUpdate = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '1740118223883588',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '916268112515', phone_number_id: '1265592716642975' },
            statuses: [{ id: 'wamid.OUT1', status: 'delivered', recipient_id: '919833257659' }],
          },
        },
      ],
    },
  ],
};

afterEach(() => {
  delete process.env.WHATSAPP_APP_SECRET;
  delete process.env.WHATSAPP_VERIFY_TOKEN;
});

describe('extractWhatsAppEvents', () => {
  it('reads the receiving number, inbound messages and their text', () => {
    const events = extractWhatsAppEvents(inbound);
    expect(events.phoneNumberId).toBe('1265592716642975');
    expect(events.messages).toEqual([
      {
        id: 'wamid.HBgMOTE5ODMzMjU3NjU5',
        from: '919833257659',
        type: 'text',
        timestamp: '1789200000',
        text: 'Yes, Tuesday works for the call',
      },
    ]);
    expect(events.statuses).toEqual([]);
  });

  it('reads delivery statuses', () => {
    const events = extractWhatsAppEvents(statusUpdate);
    expect(events.statuses).toEqual([{ id: 'wamid.OUT1', status: 'delivered', recipientId: '919833257659' }]);
    expect(events.messages).toEqual([]);
  });

  it('ignores payloads from another product or with no messages field', () => {
    expect(extractWhatsAppEvents({ object: 'page', entry: [] }).messages).toEqual([]);
    expect(extractWhatsAppEvents(null).messages).toEqual([]);
  });
});

describe('whatsappAdapter.handleGet', () => {
  it('answers the subscription challenge when the verify token matches', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'verify-me';
    const response = whatsappAdapter.handleGet!(
      new Request('http://localhost/api/webhooks/sales/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc123')
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('abc123');
  });

  it('refuses a wrong or missing verify token', () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'verify-me';
    expect(
      whatsappAdapter.handleGet!(
        new Request('http://localhost/api/webhooks/sales/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=abc123')
      ).status
    ).toBe(403);
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    expect(
      whatsappAdapter.handleGet!(
        new Request('http://localhost/api/webhooks/sales/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc123')
      ).status
    ).toBe(403);
  });
});

describe('whatsappAdapter.verify', () => {
  it('checks the X-Hub-Signature-256 HMAC of the raw body', () => {
    process.env.WHATSAPP_APP_SECRET = 'app-secret';
    const rawBody = JSON.stringify(inbound);
    const signature = createHmac('sha256', 'app-secret').update(rawBody).digest('hex');
    const signed = new Request('http://localhost', { method: 'POST', headers: { 'x-hub-signature-256': `sha256=${signature}` } });
    const forged = new Request('http://localhost', { method: 'POST', headers: { 'x-hub-signature-256': 'sha256=deadbeef' } });
    const unsigned = new Request('http://localhost', { method: 'POST' });

    expect(whatsappAdapter.verify({ request: signed, rawBody })).toBe(true);
    expect(whatsappAdapter.verify({ request: forged, rawBody })).toBe(false);
    expect(whatsappAdapter.verify({ request: unsigned, rawBody })).toBe(false);
  });

  it('refuses everything when the secret is unset', () => {
    const rawBody = JSON.stringify(inbound);
    const signature = createHmac('sha256', 'app-secret').update(rawBody).digest('hex');
    const signed = new Request('http://localhost', { method: 'POST', headers: { 'x-hub-signature-256': `sha256=${signature}` } });
    expect(whatsappAdapter.verify({ request: signed, rawBody })).toBe(false);
  });
});

describe('whatsappAdapter.describe', () => {
  it('gives a stable id per delivery so retries are ignored', () => {
    expect(whatsappAdapter.describe(inbound)).toEqual({
      externalId: 'wa:wamid.HBgMOTE5ODMzMjU3NjU5',
      eventType: 'messages',
    });
    expect(whatsappAdapter.describe(statusUpdate)).toEqual({
      externalId: 'wa:wamid.OUT1:delivered',
      eventType: 'statuses',
    });
    expect(whatsappAdapter.describe({ object: 'whatsapp_business_account', entry: [] })).toEqual({
      externalId: null,
      eventType: 'unknown',
    });
  });
});

describe('whatsappAdapter.redact', () => {
  it('keeps message bodies and customer names out of the webhook log', () => {
    const redacted = JSON.stringify(whatsappAdapter.redact!(inbound));
    expect(redacted).not.toContain('Yes, Tuesday works for the call');
    expect(redacted).not.toContain('Priya Shah');
    expect(redacted).toContain('wamid.HBgMOTE5ODMzMjU3NjU5');
    expect(redacted).toContain('1265592716642975');
  });
});

/**
 * Until this landed the adapter read `text.body` and nothing else, so every
 * tap arrived with no content at all — which is why no menu could be built:
 * the reply was invisible the moment it came back.
 */
describe('a tapped reply', () => {
  const envelope = (message: Record<string, unknown>) => ({
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '1' }, messages: [message] } }] }],
  });

  const base = { id: 'wamid.T', from: '916268112515', timestamp: '1700000000' };

  it('reads a button tap from an interactive menu', () => {
    const { messages } = extractWhatsAppEvents(envelope({
      ...base, type: 'interactive',
      interactive: { type: 'button_reply', button_reply: { id: 'academy_fees', title: 'Fees & dates' } },
    }));
    expect(messages[0]).toMatchObject({ replyId: 'academy_fees', text: 'Fees & dates' });
  });

  it('reads a row tap from a list', () => {
    const { messages } = extractWhatsAppEvents(envelope({
      ...base, type: 'interactive',
      interactive: { type: 'list_reply', list_reply: { id: 'svc_seo', title: 'SEO', description: 'Organic growth' } },
    }));
    expect(messages[0]).toMatchObject({ replyId: 'svc_seo', text: 'SEO' });
  });

  it('reads a quick-reply button on a template, which is a different envelope', () => {
    // Not `interactive` — a template button comes back as type "button" with
    // a `payload`. This is how an opt-out tap arrives.
    const { messages } = extractWhatsAppEvents(envelope({
      ...base, type: 'button', button: { payload: 'STOP', text: 'Stop promotions' },
    }));
    expect(messages[0]).toMatchObject({ replyId: 'STOP', text: 'Stop promotions' });
  });

  it('leaves replyId unset for a typed message, so routing can tell them apart', () => {
    const { messages } = extractWhatsAppEvents(envelope({
      ...base, type: 'text', text: { body: 'Fees & dates' },
    }));
    expect(messages[0].replyId).toBeUndefined();
    expect(messages[0].text).toBe('Fees & dates');
  });

  it('keeps a tap out of the webhook log, the same as a typed message', () => {
    const redacted = JSON.stringify(whatsappAdapter.redact?.(envelope({
      ...base, type: 'interactive',
      interactive: { type: 'button_reply', button_reply: { id: 'academy_fees', title: 'Fees & dates' } },
    })));
    expect(redacted).not.toContain('Fees & dates');
    expect(redacted).toContain('[redacted]');
  });
});
