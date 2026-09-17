/**
 * Google Ads lead form assets (Search, Performance Max, YouTube).
 * https://developers.google.com/google-ads/webhook/docs/implementation
 * Google authenticates with the `google_key` you set on the form.
 */

import { WebhookRejection } from '@/lib/sales/errors';
import { ingestLead } from '@/lib/sales/intake/ingest';
import type { IntakeLead } from '@/lib/sales/types';
import type { SalesWebhookAdapter } from './types';
import { isRecord, parseJson, readString, safeEqual } from './verify';

type ContactField = 'name' | 'email' | 'phone' | 'company' | 'jobTitle';

const STANDARD_COLUMNS: Record<string, ContactField> = {
  FULL_NAME: 'name',
  EMAIL: 'email',
  WORK_EMAIL: 'email',
  PHONE_NUMBER: 'phone',
  WORK_PHONE: 'phone',
  COMPANY_NAME: 'company',
  JOB_TITLE: 'jobTitle',
};

export function mapGoogleLead(payload: unknown, now: Date = new Date()): IntakeLead {
  if (!isRecord(payload)) throw new WebhookRejection('Google lead payload must be an object');
  const leadId = readString(payload, 'lead_id');
  if (!leadId) throw new WebhookRejection('Google lead payload has no lead_id');

  const formId = readString(payload, 'form_id');
  const campaignId = readString(payload, 'campaign_id');
  const columns = Array.isArray(payload.user_column_data) ? payload.user_column_data.filter(isRecord) : [];

  const lead: IntakeLead = {
    source: 'google_lead_form',
    externalSourceId: leadId,
    sourceDetail: formId ? `Google lead form ${formId}` : 'Google lead form',
    attribution: { utmSource: 'google', utmMedium: 'lead_form', utmCampaign: campaignId, gclid: readString(payload, 'gcl_id') },
    consent: {
      basis: 'inbound_request',
      evidence: { platform: 'google_ads', leadId, formId: formId ?? null, campaignId: campaignId ?? null },
      capturedAt: now.toISOString(),
    },
    tags: payload.is_test === true ? ['test'] : [],
  };

  const customFields: Record<string, unknown> = {};
  let firstName: string | undefined;
  let lastName: string | undefined;

  for (const column of columns) {
    const columnId = readString(column, 'column_id') ?? '';
    const value = readString(column, 'string_value');
    if (!value) continue;

    const field = STANDARD_COLUMNS[columnId];
    if (field) {
      if (!lead[field]) lead[field] = value;
    } else if (columnId === 'FIRST_NAME') {
      firstName = value;
    } else if (columnId === 'LAST_NAME') {
      lastName = value;
    } else {
      customFields[readString(column, 'column_name') ?? columnId] = value;
    }
  }

  if (!lead.name && (firstName || lastName)) lead.name = [firstName, lastName].filter(Boolean).join(' ');
  lead.customFields = customFields;
  return lead;
}

export const googleAdapter: SalesWebhookAdapter = {
  requiredEnv: ['GOOGLE_ADS_LEAD_KEY'],
  successBody: {},

  verify({ rawBody }) {
    const expected = process.env.GOOGLE_ADS_LEAD_KEY ?? '';
    const payload = parseJson(rawBody);
    const given = isRecord(payload) ? readString(payload, 'google_key') ?? '' : '';
    return expected.length > 0 && safeEqual(given, expected);
  },

  describe(payload) {
    return { externalId: isRecord(payload) ? readString(payload, 'lead_id') ?? null : null, eventType: 'lead' };
  },

  redact(payload) {
    return isRecord(payload) ? { ...payload, google_key: '[redacted]' } : payload;
  },

  async handle(payload) {
    await ingestLead(mapGoogleLead(payload));
  },
};
