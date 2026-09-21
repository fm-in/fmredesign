/**
 * WhatsApp Cloud API webhooks for the FreakingMinds pilot number.
 *
 * GET answers Meta's subscription handshake; POST is signed with the app
 * secret. Inbound messages and delivery statuses arrive on the same field
 * (`messages`), so this adapter parses and verifies them, then hands both to
 * `src/lib/whatsapp/inbound.ts`, which owns what they mean.
 *
 * Payload shape:
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
 */

import type { SalesWebhookAdapter } from './types';
import { hmacSha256Hex, isRecord, readString, safeEqual } from './verify';

export interface WhatsAppInboundMessage {
  id: string;
  from: string;
  type: string;
  timestamp: string | undefined;
  /**
   * What the person said, as text. For a tap this is the button or row
   * *title* — the words they actually saw and chose. Never logged.
   */
  text: string | undefined;
  /**
   * The machine id behind a tap, and nothing for a typed message.
   *
   * Routing reads this rather than `text`, because the title is display copy:
   * it gets reworded, translated and truncated, and a menu that matched on it
   * would break the next time someone improved the wording.
   */
  replyId: string | undefined;
}

/**
 * A tap arrives in one of two unrelated shapes, and neither carries `text`.
 *
 * An interactive menu we sent in-session comes back under `interactive`, as
 * `button_reply` (up to three buttons) or `list_reply` (a menu of rows). A
 * quick-reply button on an approved *template* comes back as
 * `type: "button"` with `button.payload` — a different envelope entirely,
 * and the one an opt-out button on a marketing template arrives in.
 *
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
 */
function readReply(message: Record<string, unknown>): { id?: string; title?: string } {
  if (isRecord(message.interactive)) {
    const inner = message.interactive;
    for (const key of ['button_reply', 'list_reply'] as const) {
      if (isRecord(inner[key])) {
        return { id: readString(inner[key], 'id'), title: readString(inner[key], 'title') };
      }
    }
  }
  if (isRecord(message.button)) {
    return { id: readString(message.button, 'payload'), title: readString(message.button, 'text') };
  }
  return {};
}

export interface WhatsAppStatusUpdate {
  id: string;
  status: string;
  recipientId: string | undefined;
}

export interface WhatsAppEvents {
  /** Identifies which of our numbers received this, once more than one exists. */
  phoneNumberId: string | undefined;
  messages: WhatsAppInboundMessage[];
  statuses: WhatsAppStatusUpdate[];
}

function changeValues(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload) || payload.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) {
    return [];
  }
  const values: Record<string, unknown>[] = [];
  for (const entry of payload.entry.filter(isRecord)) {
    const changes = Array.isArray(entry.changes) ? entry.changes.filter(isRecord) : [];
    for (const change of changes) {
      if (change.field === 'messages' && isRecord(change.value)) values.push(change.value);
    }
  }
  return values;
}

export function extractWhatsAppEvents(payload: unknown): WhatsAppEvents {
  const events: WhatsAppEvents = { phoneNumberId: undefined, messages: [], statuses: [] };

  for (const value of changeValues(payload)) {
    const metadata = isRecord(value.metadata) ? value.metadata : undefined;
    events.phoneNumberId = events.phoneNumberId ?? (metadata ? readString(metadata, 'phone_number_id') : undefined);

    const messages = Array.isArray(value.messages) ? value.messages.filter(isRecord) : [];
    for (const message of messages) {
      const id = readString(message, 'id');
      const from = readString(message, 'from');
      if (!id || !from) continue;
      const body = isRecord(message.text) ? readString(message.text, 'body') : undefined;
      const reply = readReply(message);
      events.messages.push({
        id,
        from,
        type: readString(message, 'type') ?? 'unknown',
        timestamp: readString(message, 'timestamp'),
        // A tap has no text of its own, so the title stands in as what they
        // said. Everything downstream — the timeline entry, the notification
        // preview, the 24h window — then treats a tap like any other message.
        text: body ?? reply.title,
        replyId: reply.id,
      });
    }

    const statuses = Array.isArray(value.statuses) ? value.statuses.filter(isRecord) : [];
    for (const status of statuses) {
      const id = readString(status, 'id');
      const state = readString(status, 'status');
      if (!id || !state) continue;
      events.statuses.push({ id, status: state, recipientId: readString(status, 'recipient_id') });
    }
  }

  return events;
}

/** Message bodies and customer names never reach `webhook_logs`. */
function redactValue(value: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...value };

  if (Array.isArray(copy.messages)) {
    copy.messages = copy.messages.map((message) => {
      if (!isRecord(message)) return message;
      const { text, image, video, audio, document: doc, interactive, button, ...rest } = message;
      const carried = [
        text && 'text', image && 'image', video && 'video', audio && 'audio', doc && 'document',
        interactive && 'interactive', button && 'button',
      ].filter((part): part is string => typeof part === 'string');
      return carried.length > 0 ? { ...rest, content: '[redacted]' } : rest;
    });
  }

  if (Array.isArray(copy.contacts)) {
    copy.contacts = copy.contacts.map((contact) =>
      isRecord(contact) ? { wa_id: contact.wa_id, profile: '[redacted]' } : contact
    );
  }

  return copy;
}

export const whatsappAdapter: SalesWebhookAdapter = {
  requiredEnv: ['WHATSAPP_APP_SECRET', 'WHATSAPP_VERIFY_TOKEN'],

  handleGet(request) {
    const url = new URL(request.url);
    const expected = process.env.WHATSAPP_VERIFY_TOKEN ?? '';
    const token = url.searchParams.get('hub.verify_token') ?? '';
    if (url.searchParams.get('hub.mode') === 'subscribe' && expected && safeEqual(token, expected)) {
      return new Response(url.searchParams.get('hub.challenge') ?? '', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });
    }
    return new Response('Forbidden', { status: 403 });
  },

  verify({ request, rawBody }) {
    const secret = process.env.WHATSAPP_APP_SECRET ?? '';
    const header = request.headers.get('x-hub-signature-256') ?? '';
    if (!secret || !header.startsWith('sha256=')) return false;
    return safeEqual(header.slice('sha256='.length), hmacSha256Hex(secret, rawBody));
  },

  describe(payload) {
    const { messages, statuses } = extractWhatsAppEvents(payload);
    const ids = [...messages.map((m) => m.id), ...statuses.map((s) => `${s.id}:${s.status}`)].sort();
    const eventType = messages.length > 0 ? 'messages' : statuses.length > 0 ? 'statuses' : 'unknown';
    return { externalId: ids.length > 0 ? `wa:${ids.join(',')}` : null, eventType };
  },

  redact(payload) {
    if (!isRecord(payload) || !Array.isArray(payload.entry)) return payload;
    return {
      ...payload,
      entry: payload.entry.map((entry) => {
        if (!isRecord(entry) || !Array.isArray(entry.changes)) return entry;
        return {
          ...entry,
          changes: entry.changes.map((change) =>
            isRecord(change) && isRecord(change.value) ? { ...change, value: redactValue(change.value) } : change
          ),
        };
      }),
    };
  },

  async handle(payload) {
    // The import is dynamic so the adapter registry — which the settings screen
    // loads to list webhook URLs — does not pull Supabase and the notification
    // stack into every caller.
    const { handleWhatsAppEvents } = await import('@/lib/whatsapp/inbound');
    await handleWhatsAppEvents(extractWhatsAppEvents(payload));
  },
};
