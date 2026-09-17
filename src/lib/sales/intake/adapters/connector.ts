/**
 * Generic lead webhook for Zapier or Make: LinkedIn Lead Gen (until Lead Sync
 * API access is approved), Quora, Snapchat, JustDial, IndiaMART and anything
 * added later. The zap sends `Authorization: Bearer <LEAD_CONNECTOR_SECRET>`
 * and the JSON body documented in docs/SALES-SETUP.md.
 */

import { z } from 'zod';
import { WebhookRejection } from '@/lib/sales/errors';
import { ingestLead } from '@/lib/sales/intake/ingest';
import type { IntakeLead } from '@/lib/sales/types';
import type { SalesWebhookAdapter } from './types';
import { isRecord, readString, safeEqual } from './verify';

const connectorSchema = z.object({
  platform: z.string().trim().min(1).max(50),
  externalId: z.string().trim().max(200).optional(),
  name: z.string().max(200).optional(),
  email: z.string().max(320).optional(),
  phone: z.string().max(40).optional(),
  company: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
  campaign: z.string().max(200).optional(),
  formName: z.string().max(200).optional(),
  consentText: z.string().max(2000).optional(),
});

export function mapConnectorLead(payload: unknown, now: Date = new Date()): IntakeLead {
  const parsed = connectorSchema.safeParse(payload);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.') || issue.message).join(', ');
    throw new WebhookRejection(`Invalid connector payload: ${fields}`);
  }

  const body = parsed.data;
  const platform = body.platform.toLowerCase();
  // The campaign the zap explicitly posted — the only campaign a sales email may
  // show. It is kept in its own custom field, always present (null when none was
  // posted), because mergeEmptyFields only adds custom-field keys a lead lacks:
  // a later Google, Meta or website arrival for the same person can fill an
  // empty utm_campaign, but can never fill this.
  const connectorCampaign = body.campaign?.replace(/\s+/g, ' ').trim() || null;

  return {
    source: 'connector',
    name: body.name,
    email: body.email,
    phone: body.phone,
    company: body.company,
    message: body.message,
    sourceDetail: [platform, body.formName ?? body.campaign].filter(Boolean).join(' · '),
    externalSourceId: body.externalId ? `${platform}:${body.externalId}` : undefined,
    attribution: { utmSource: platform, utmMedium: 'lead_form', utmCampaign: body.campaign },
    consent: {
      basis: 'inbound_request',
      evidence: { platform, formName: body.formName ?? null, consentText: body.consentText ?? null },
      capturedAt: now.toISOString(),
    },
    customFields: { platform, connectorCampaign },
  };
}

export const connectorAdapter: SalesWebhookAdapter = {
  requiredEnv: ['LEAD_CONNECTOR_SECRET'],

  verify({ request }) {
    const secret = process.env.LEAD_CONNECTOR_SECRET ?? '';
    const header = request.headers.get('authorization') ?? '';
    return secret.length > 0 && safeEqual(header, `Bearer ${secret}`);
  },

  describe(payload) {
    if (!isRecord(payload)) return { externalId: null, eventType: 'lead' };
    const platform = readString(payload, 'platform')?.toLowerCase();
    const externalId = readString(payload, 'externalId');
    return { externalId: platform && externalId ? `${platform}:${externalId}` : null, eventType: 'lead' };
  },

  async handle(payload) {
    await ingestLead(mapConnectorLead(payload));
  },
};
