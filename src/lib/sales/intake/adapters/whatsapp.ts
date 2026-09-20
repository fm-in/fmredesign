/**
 * WhatsApp Cloud API webhooks for the FreakingMinds pilot number.
 *
 * GET answers Meta's subscription handshake; POST is signed with the app
 * secret. Inbound messages and delivery statuses arrive on the same field
 * (`messages`), so this adapter only parses and verifies them — attaching a
 * message to a lead's timeline lands with the send path, once a real number
 * is registered.
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
  /** Body text for a plain text message. Never logged. */
  text: string | undefined;
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
      events.messages.push({
        id,
        from,
        type: readString(message, 'type') ?? 'unknown',
        timestamp: readString(message, 'timestamp'),
        text: body,
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
      const { text, image, video, audio, document: doc, ...rest } = message;
      const carried = [text && 'text', image && 'image', video && 'video', audio && 'audio', doc && 'document']
        .filter((part): part is string => typeof part === 'string');
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
    // Verification and parsing only for now: the pilot number is not live yet,
    // so there is no lead to attach a message to. Recording inbound messages on
    // the timeline, stopping sequences on a reply and handling opt-outs arrive
    // with the send path.
    extractWhatsAppEvents(payload);
  },
};
