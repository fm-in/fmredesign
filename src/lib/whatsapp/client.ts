/**
 * WhatsApp Cloud API transport.
 *
 * Raw `fetch` against Graph, no SDK — the same convention as
 * `src/lib/social/meta-api.ts` and `src/lib/sales/intake/meta-graph.ts`, which
 * already talk to v21.0 this way.
 *
 * This module only puts messages on the wire. It performs no consent,
 * suppression or send-window checks: those belong to the callers in
 * `src/lib/whatsapp/send.ts`, so that there is one place per policy rather
 * than a check buried in the transport.
 */

import { toE164 } from '@/lib/sales/phone';

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

/** Cloud API rejects a parameter that is empty, or holds a newline, a tab, or 4+ spaces. */
const ILLEGAL_PARAM = /[\n\t]|\s{4,}/;

export interface WhatsAppSendResult {
  ok: boolean;
  /** Meta's message id (`wamid.…`), present only on success. */
  wamid?: string;
  error?: string;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Tidy a value for a template placeholder.
 *
 * Meta rejects the whole message if a parameter is empty or carries a newline,
 * a tab, or four consecutive spaces — so a template that renders fine in the
 * Manager preview fails at send time against real data. Every caller runs its
 * values through this, and supplies a fallback for the ones that can be blank.
 */
export function templateParam(value: string | null | undefined, fallback: string): string {
  const cleaned = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned || ILLEGAL_PARAM.test(cleaned)) return fallback;
  return cleaned;
}

async function post(body: Record<string, unknown>): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return { ok: false, error: 'WhatsApp is not configured' };

  try {
    const response = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
    });

    const json: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      // Meta's error bodies carry no secrets, but they do quote the request —
      // keep only the message so a token can never reach a log.
      const message =
        typeof json === 'object' && json !== null && 'error' in json &&
        typeof (json as { error: unknown }).error === 'object' && (json as { error: unknown }).error !== null &&
        'message' in (json as { error: Record<string, unknown> }).error
          ? String((json as { error: Record<string, unknown> }).error.message)
          : `HTTP ${response.status}`;
      return { ok: false, error: message.slice(0, 300) };
    }

    const wamid =
      typeof json === 'object' && json !== null && 'messages' in json && Array.isArray((json as { messages: unknown }).messages)
        ? ((json as { messages: Array<{ id?: string }> }).messages[0]?.id ?? undefined)
        : undefined;

    return { ok: true, wamid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 300) : 'Request failed' };
  }
}

/**
 * Plain text, valid ONLY inside the 24-hour customer service window — that is,
 * within 24 hours of the recipient's own last message to us. Outside it Meta
 * rejects the send and a template is required instead.
 */
export async function sendWhatsAppText(toE164Number: string, body: string): Promise<WhatsAppSendResult> {
  const to = toE164(toE164Number);
  if (!to) return { ok: false, error: 'Not a usable phone number' };
  const text = body.trim();
  if (!text) return { ok: false, error: 'Empty message' };

  return post({
    recipient_type: 'individual',
    to: to.replace('+', ''),
    type: 'text',
    text: { preview_url: false, body: text.slice(0, 4096) },
  });
}

export interface TemplateSend {
  /** Exactly as approved, e.g. `enquiry_first_touch`. */
  name: string;
  /** Must match the approved template's language exactly — `en` is not `en_US`. */
  language: string;
  /** Body placeholders in order. Run each through `templateParam` first. */
  bodyParams?: string[];
  /** URL-button suffixes, in button order. Numbered separately from the body. */
  buttonParams?: string[];
}

/** A pre-approved template. The only thing that may be sent outside the 24-hour window. */
export async function sendWhatsAppTemplate(
  toE164Number: string,
  template: TemplateSend
): Promise<WhatsAppSendResult> {
  const to = toE164(toE164Number);
  if (!to) return { ok: false, error: 'Not a usable phone number' };

  const components: Record<string, unknown>[] = [];

  if (template.bodyParams?.length) {
    const bad = template.bodyParams.find((value) => !value || ILLEGAL_PARAM.test(value));
    if (bad !== undefined) return { ok: false, error: 'A template parameter is empty or badly formed' };
    components.push({
      type: 'body',
      parameters: template.bodyParams.map((text) => ({ type: 'text', text })),
    });
  }

  template.buttonParams?.forEach((text, index) => {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: String(index),
      parameters: [{ type: 'text', text }],
    });
  });

  return post({
    to: to.replace('+', ''),
    type: 'template',
    template: {
      name: template.name,
      language: { code: template.language },
      ...(components.length > 0 ? { components } : {}),
    },
  });
}
