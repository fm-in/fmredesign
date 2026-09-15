/** Resend webhooks (Svix-signed): replies, bounces and complaints. */

import { getResend } from '@/lib/email/resend';
import { handleResendEvent } from '@/lib/sales/replies';
import type { SalesWebhookAdapter } from './types';
import { isRecord, readString } from './verify';

export const resendAdapter: SalesWebhookAdapter = {
  requiredEnv: ['RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET'],

  verify({ request, rawBody }) {
    const resend = getResend();
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET ?? '';
    if (!resend || !webhookSecret) return false;

    // resend.webhooks.verify() wants the three Svix header values, not the
    // Request's Headers object.
    const id = request.headers.get('svix-id');
    const timestamp = request.headers.get('svix-timestamp');
    const signature = request.headers.get('svix-signature');
    if (!id || !timestamp || !signature) return false;

    try {
      resend.webhooks.verify({ payload: rawBody, headers: { id, timestamp, signature }, webhookSecret });
      return true;
    } catch {
      return false;
    }
  },

  describe(payload) {
    if (!isRecord(payload) || !isRecord(payload.data)) return { externalId: null, eventType: 'unknown' };
    const type = readString(payload, 'type') ?? 'unknown';
    const emailId = readString(payload.data, 'email_id');
    return { externalId: emailId ? `${type}:${emailId}` : null, eventType: type };
  },

  async handle(payload) {
    await handleResendEvent(payload);
  },
};
