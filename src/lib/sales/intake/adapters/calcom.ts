/** Cal.com webhooks, signed with `x-cal-signature-256` (HMAC-SHA256 of the raw body). */

import { handleCalcomEvent } from '@/lib/sales/meetings';
import type { SalesWebhookAdapter } from './types';
import { hmacSha256Hex, isRecord, readString, safeEqual } from './verify';

export const calcomAdapter: SalesWebhookAdapter = {
  requiredEnv: ['CALCOM_WEBHOOK_SECRET'],

  verify({ request, rawBody }) {
    const secret = process.env.CALCOM_WEBHOOK_SECRET ?? '';
    const signature = request.headers.get('x-cal-signature-256') ?? '';
    return Boolean(secret && signature) && safeEqual(signature, hmacSha256Hex(secret, rawBody));
  },

  describe(payload) {
    if (!isRecord(payload)) return { externalId: null, eventType: 'unknown' };
    const trigger = readString(payload, 'triggerEvent') ?? 'unknown';
    const inner = isRecord(payload.payload) ? payload.payload : {};
    const uid = readString(inner, 'uid');
    const createdAt = readString(payload, 'createdAt') ?? '';
    return { externalId: uid ? `${trigger}:${uid}:${createdAt}` : null, eventType: trigger };
  },

  async handle(payload) {
    await handleCalcomEvent(payload);
  },
};
