/**
 * Meta Lead Ads: a Page subscription to the `leadgen` webhook field.
 * GET answers the subscription handshake; POST is signed with the app secret
 * and carries only ids, so each lead is fetched in an Inngest step
 * (`sales-meta-leadgen`), which retries Graph API failures.
 */

import type { SalesWebhookAdapter } from './types';
import { hmacSha256Hex, isRecord, readString, safeEqual } from './verify';

export interface LeadgenChange {
  leadgenId: string;
  pageId: string;
  formId?: string;
  adId?: string;
}

export function extractLeadgenChanges(payload: unknown): LeadgenChange[] {
  if (!isRecord(payload) || payload.object !== 'page' || !Array.isArray(payload.entry)) return [];

  const changes: LeadgenChange[] = [];
  for (const entry of payload.entry.filter(isRecord)) {
    const entryPageId = readString(entry, 'id');
    const entryChanges = Array.isArray(entry.changes) ? entry.changes.filter(isRecord) : [];
    for (const change of entryChanges) {
      if (change.field !== 'leadgen' || !isRecord(change.value)) continue;
      const leadgenId = readString(change.value, 'leadgen_id');
      const pageId = readString(change.value, 'page_id') ?? entryPageId;
      if (!leadgenId || !pageId) continue;
      changes.push({
        leadgenId,
        pageId,
        formId: readString(change.value, 'form_id'),
        adId: readString(change.value, 'ad_id'),
      });
    }
  }
  return changes;
}

export const metaAdapter: SalesWebhookAdapter = {
  requiredEnv: ['META_APP_SECRET', 'META_LEADS_VERIFY_TOKEN', 'META_TOKEN_SECRET'],

  handleGet(request) {
    const url = new URL(request.url);
    const expected = process.env.META_LEADS_VERIFY_TOKEN ?? '';
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
    const secret = process.env.META_APP_SECRET ?? '';
    const header = request.headers.get('x-hub-signature-256') ?? '';
    if (!secret || !header.startsWith('sha256=')) return false;
    return safeEqual(header.slice('sha256='.length), hmacSha256Hex(secret, rawBody));
  },

  describe(payload) {
    const ids = extractLeadgenChanges(payload).map((change) => change.leadgenId).sort();
    return { externalId: ids.length > 0 ? `leadgen:${ids.join(',')}` : null, eventType: 'leadgen' };
  },

  async handle(payload) {
    // Send directly (not sendSalesEvent): if queueing fails the route must
    // answer 500 so Meta retries — these ids are the only copy of the lead.
    const { inngest } = await import('@/lib/inngest/client');
    for (const change of extractLeadgenChanges(payload)) {
      await inngest.send({ name: 'sales/meta.leadgen', data: change });
    }
  },
};
