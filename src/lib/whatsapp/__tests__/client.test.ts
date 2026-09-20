import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWhatsAppConfigured, sendWhatsAppTemplate, sendWhatsAppText, templateParam } from '../client';

const OK = { messages: [{ id: 'wamid.ABC' }] };

function mockFetch(response: unknown, ok = true, status = 200) {
  const spy = vi.fn().mockResolvedValue({ ok, status, json: async () => response });
  vi.stubGlobal('fetch', spy);
  return spy;
}

/** The JSON body of the single fetch call. */
function bodyOf(spy: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return JSON.parse(spy.mock.calls[0][1].body);
}

beforeEach(() => {
  vi.stubEnv('WHATSAPP_TOKEN', 'test-token');
  vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '12345');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('isWhatsAppConfigured', () => {
  it('needs both the token and the number id', () => {
    expect(isWhatsAppConfigured()).toBe(true);
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '');
    expect(isWhatsAppConfigured()).toBe(false);
  });
});

describe('templateParam', () => {
  it('falls back when the value is missing or blank', () => {
    expect(templateParam(undefined, 'your project')).toBe('your project');
    expect(templateParam(null, 'your project')).toBe('your project');
    expect(templateParam('   ', 'your project')).toBe('your project');
  });

  it('collapses the whitespace Meta rejects rather than failing the send', () => {
    // Newlines, tabs and 4+ consecutive spaces make Cloud API refuse the whole
    // message, so a value carrying them is normalised, not passed through.
    expect(templateParam('SEO for\nan e-commerce store', 'x')).toBe('SEO for an e-commerce store');
    expect(templateParam('a\tb', 'x')).toBe('a b');
    expect(templateParam('a    b', 'x')).toBe('a b');
  });

  it('keeps an ordinary value untouched', () => {
    expect(templateParam('social media marketing', 'x')).toBe('social media marketing');
  });
});

describe('sendWhatsAppText', () => {
  it('posts a text message to the number id, with the + stripped', async () => {
    const spy = mockFetch(OK);
    const result = await sendWhatsAppText('+916268112515', 'Hello');

    expect(result).toEqual({ ok: true, wamid: 'wamid.ABC' });
    expect(spy.mock.calls[0][0]).toBe('https://graph.facebook.com/v21.0/12345/messages');
    expect(bodyOf(spy)).toMatchObject({
      messaging_product: 'whatsapp',
      to: '916268112515',
      type: 'text',
      text: { preview_url: false, body: 'Hello' },
    });
  });

  it('carries the token in the header, never in the URL', async () => {
    const spy = mockFetch(OK);
    await sendWhatsAppText('+916268112515', 'Hello');
    expect(spy.mock.calls[0][0]).not.toContain('test-token');
    expect(spy.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
  });

  it('normalises a number that arrives without a country code', async () => {
    const spy = mockFetch(OK);
    await sendWhatsAppText('9833257659', 'Hello');
    expect(bodyOf(spy).to).toBe('919833257659');
  });

  it('refuses an unusable number or an empty body without calling Meta', async () => {
    const spy = mockFetch(OK);
    expect(await sendWhatsAppText('12', 'Hello')).toMatchObject({ ok: false });
    expect(await sendWhatsAppText('+916268112515', '   ')).toMatchObject({ ok: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it('reports Meta’s error message rather than a bare status', async () => {
    mockFetch({ error: { message: 'Recipient phone number not in allowed list' } }, false, 400);
    expect(await sendWhatsAppText('+916268112515', 'Hello')).toEqual({
      ok: false,
      error: 'Recipient phone number not in allowed list',
    });
  });

  it('is not configured without credentials, and says so', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', '');
    const spy = mockFetch(OK);
    expect(await sendWhatsAppText('+916268112515', 'Hello')).toEqual({ ok: false, error: 'WhatsApp is not configured' });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('sendWhatsAppTemplate', () => {
  it('sends the name, the exact language, and body parameters in order', async () => {
    const spy = mockFetch(OK);
    await sendWhatsAppTemplate('+916268112515', {
      name: 'enquiry_first_touch',
      language: 'en',
      bodyParams: ['Priya', 'SEO for an e-commerce store', 'Aaryavar'],
    });

    expect(bodyOf(spy)).toMatchObject({
      type: 'template',
      template: {
        name: 'enquiry_first_touch',
        // `en` is a different template from `en_US`; it must not be widened.
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Priya' },
              { type: 'text', text: 'SEO for an e-commerce store' },
              { type: 'text', text: 'Aaryavar' },
            ],
          },
        ],
      },
    });
  });

  it('numbers button parameters separately from the body', async () => {
    const spy = mockFetch(OK);
    await sendWhatsAppTemplate('+916268112515', {
      name: 'academy_checkout_pending',
      language: 'en',
      bodyParams: ['Priya'],
      buttonParams: ['digital-marketing'],
    });

    const components = (bodyOf(spy).template as { components: Record<string, unknown>[] }).components;
    expect(components[1]).toEqual({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: 'digital-marketing' }],
    });
  });

  it('refuses a malformed parameter instead of letting Meta reject the send', async () => {
    const spy = mockFetch(OK);
    const result = await sendWhatsAppTemplate('+916268112515', {
      name: 'enquiry_first_touch',
      language: 'en',
      bodyParams: ['Priya', '', 'Aaryavar'],
    });

    expect(result).toMatchObject({ ok: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it('omits components entirely for a template with no variables', async () => {
    const spy = mockFetch(OK);
    await sendWhatsAppTemplate('+916268112515', { name: 'hello_world', language: 'en_US' });
    expect(bodyOf(spy).template).not.toHaveProperty('components');
  });
});
