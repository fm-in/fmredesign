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

// ---------------------------------------------------------------------------
// Interactive messages — buttons and lists
// ---------------------------------------------------------------------------

/**
 * Meta's limits, which are rejections rather than truncations at their end.
 *
 * They are small and they are load-bearing: a reply button title is 20
 * characters, so "Talk to someone about pricing" is not a button, it is a
 * 400. Enforcing them here means a menu that is too long fails in a test
 * rather than in someone's chat.
 */
const INTERACTIVE_LIMITS = {
  body: 1024,
  header: 60,
  footer: 60,
  buttons: 3,
  buttonTitle: 20,
  replyId: 256,
  listLabel: 20,
  listRows: 10,
  rowTitle: 24,
  rowDescription: 72,
  sectionTitle: 24,
} as const;

/** The id comes back as `replyId` on the webhook; the title is what they see. */
export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveSection {
  title?: string;
  rows: InteractiveRow[];
}

export interface InteractiveMessage {
  body: string;
  header?: string;
  footer?: string;
  /** Up to three reply buttons. Mutually exclusive with `list`. */
  buttons?: InteractiveButton[];
  /** A tappable menu of up to ten rows total. Mutually exclusive with `buttons`. */
  list?: { label: string; sections: InteractiveSection[] };
}

function tooLong(label: string, value: string, max: number): string | null {
  return value.length > max ? `${label} is ${value.length} characters; the limit is ${max}` : null;
}

function validate(message: InteractiveMessage): string | null {
  const body = message.body.trim();
  if (!body) return 'Empty message';

  const checks: (string | null)[] = [
    tooLong('The body', body, INTERACTIVE_LIMITS.body),
    message.header ? tooLong('The header', message.header, INTERACTIVE_LIMITS.header) : null,
    message.footer ? tooLong('The footer', message.footer, INTERACTIVE_LIMITS.footer) : null,
  ];

  if (message.buttons && message.list) return 'A message carries buttons or a list, never both';

  if (message.buttons) {
    if (message.buttons.length === 0) return 'No buttons to send';
    if (message.buttons.length > INTERACTIVE_LIMITS.buttons) {
      return `${message.buttons.length} buttons; the limit is ${INTERACTIVE_LIMITS.buttons}`;
    }
    const ids = new Set<string>();
    for (const button of message.buttons) {
      if (!button.id.trim()) return 'A button has no id';
      // Duplicate ids make a tap ambiguous, and we would route it wrongly.
      if (ids.has(button.id)) return `Two buttons share the id "${button.id}"`;
      ids.add(button.id);
      checks.push(
        tooLong(`Button id "${button.id}"`, button.id, INTERACTIVE_LIMITS.replyId),
        tooLong(`Button title "${button.title}"`, button.title, INTERACTIVE_LIMITS.buttonTitle),
      );
    }
  }

  if (message.list) {
    checks.push(tooLong('The list label', message.list.label, INTERACTIVE_LIMITS.listLabel));
    const rows = message.list.sections.flatMap((section) => section.rows);
    if (rows.length === 0) return 'No rows to send';
    if (rows.length > INTERACTIVE_LIMITS.listRows) {
      return `${rows.length} list rows; the limit is ${INTERACTIVE_LIMITS.listRows}`;
    }
    const ids = new Set<string>();
    for (const row of rows) {
      if (!row.id.trim()) return 'A list row has no id';
      if (ids.has(row.id)) return `Two rows share the id "${row.id}"`;
      ids.add(row.id);
      checks.push(
        tooLong(`Row id "${row.id}"`, row.id, INTERACTIVE_LIMITS.replyId),
        tooLong(`Row title "${row.title}"`, row.title, INTERACTIVE_LIMITS.rowTitle),
        row.description ? tooLong(`Row description on "${row.id}"`, row.description, INTERACTIVE_LIMITS.rowDescription) : null,
      );
    }
    for (const section of message.list.sections) {
      if (section.title) checks.push(tooLong(`Section title "${section.title}"`, section.title, INTERACTIVE_LIMITS.sectionTitle));
    }
  }

  return checks.find((problem): problem is string => problem !== null) ?? null;
}

/**
 * A menu of buttons or a tappable list.
 *
 * Like plain text and unlike a template, this is a *session* message: it is
 * valid only inside the 24-hour customer service window, so it answers a
 * conversation someone already started. It cannot open one.
 *
 * A tap comes back on the webhook as `replyId` — see the WhatsApp adapter.
 * Route on that id, never on the title, which is display copy.
 */
export async function sendWhatsAppInteractive(
  toE164Number: string,
  message: InteractiveMessage
): Promise<WhatsAppSendResult> {
  const to = toE164(toE164Number);
  if (!to) return { ok: false, error: 'Not a usable phone number' };

  const problem = validate(message);
  if (problem) return { ok: false, error: problem };

  const action = message.buttons
    ? { buttons: message.buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })) }
    : {
        button: message.list!.label,
        sections: message.list!.sections.map((section) => ({
          ...(section.title ? { title: section.title } : {}),
          rows: section.rows.map((row) => ({
            id: row.id,
            title: row.title,
            ...(row.description ? { description: row.description } : {}),
          })),
        })),
      };

  return post({
    recipient_type: 'individual',
    to: to.replace('+', ''),
    type: 'interactive',
    interactive: {
      type: message.buttons ? 'button' : 'list',
      ...(message.header ? { header: { type: 'text', text: message.header } } : {}),
      body: { text: message.body.trim() },
      ...(message.footer ? { footer: { text: message.footer } } : {}),
      action,
    },
  });
}
