/**
 * Fetch a lead from the Meta Graph API and map it to an IntakeLead.
 * https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 *
 * The Page token comes from `social_accounts` (the existing Facebook/Instagram
 * connect flow). It must have been granted `leads_retrieval`. The connect flow
 * stores the same Page token on a 'facebook' or 'instagram' row, and Instagram
 * lead ads arrive through the Page's leadgen webhook too, so either platform's
 * row for this page is accepted (Facebook preferred if both are connected).
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { decryptToken } from '@/lib/social/token-crypto';
import { WebhookRejection } from '@/lib/sales/errors';
import type { IntakeLead } from '@/lib/sales/types';
import { isRecord, readString } from './adapters/verify';

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';
const LEAD_FIELDS = 'field_data,created_time,ad_id,ad_name,adset_name,campaign_name,form_id,platform,is_organic';

type ContactField = 'name' | 'email' | 'phone' | 'company' | 'jobTitle' | 'website';

const STANDARD_FIELDS: Record<string, ContactField> = {
  full_name: 'name',
  email: 'email',
  work_email: 'email',
  phone_number: 'phone',
  work_phone_number: 'phone',
  company_name: 'company',
  job_title: 'jobTitle',
  website: 'website',
};

export async function getPageAccessToken(pageId: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from('social_accounts')
    .select('access_token')
    .eq('page_id', pageId)
    .in('platform', ['facebook', 'instagram'])
    .order('platform', { ascending: true })
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.access_token) throw new WebhookRejection(`No active Page connection for page ${pageId}`);
  return decryptToken(data.access_token);
}

export async function fetchMetaLead(leadgenId: string, pageId: string): Promise<Record<string, unknown>> {
  const token = await getPageAccessToken(pageId);
  const url = `${GRAPH_BASE}/${encodeURIComponent(leadgenId)}?fields=${LEAD_FIELDS}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const body: unknown = await res.json().catch(() => null);

  if (!res.ok || !isRecord(body)) {
    const message = isRecord(body) && isRecord(body.error) ? readString(body.error, 'message') : undefined;
    throw new Error(`Graph API lead fetch failed (${res.status}): ${message ?? 'no body'}`);
  }
  return body;
}

export function mapMetaLead(lead: Record<string, unknown>, pageId: string, now: Date = new Date()): IntakeLead {
  const leadgenId = readString(lead, 'id');
  if (!leadgenId) throw new WebhookRejection('Meta lead has no id');

  const platform = readString(lead, 'platform') === 'ig' ? 'instagram' : 'facebook';
  const fields = Array.isArray(lead.field_data) ? lead.field_data.filter(isRecord) : [];

  const result: IntakeLead = {
    source: 'meta_lead_ads',
    externalSourceId: leadgenId,
    sourceDetail: readString(lead, 'ad_name') ?? readString(lead, 'campaign_name') ?? 'Meta lead ad',
    attribution: {
      utmSource: platform,
      utmMedium: 'lead_ads',
      utmCampaign: readString(lead, 'campaign_name'),
      utmContent: readString(lead, 'ad_name'),
    },
    consent: {
      basis: 'inbound_request',
      evidence: {
        platform: 'meta',
        pageId,
        leadgenId,
        formId: readString(lead, 'form_id') ?? null,
        adId: readString(lead, 'ad_id') ?? null,
        createdTime: readString(lead, 'created_time') ?? null,
      },
      capturedAt: now.toISOString(),
    },
    tags: lead.is_organic === true ? ['organic'] : [],
  };

  const customFields: Record<string, unknown> = {};
  let firstName: string | undefined;
  let lastName: string | undefined;

  for (const field of fields) {
    const name = readString(field, 'name') ?? '';
    const values = Array.isArray(field.values) ? field.values.filter((v): v is string => typeof v === 'string') : [];
    const value = values.join(', ');
    if (!value) continue;

    const standard = STANDARD_FIELDS[name];
    if (standard) {
      if (!result[standard]) result[standard] = value;
    } else if (name === 'first_name') {
      firstName = value;
    } else if (name === 'last_name') {
      lastName = value;
    } else {
      customFields[name] = value;
    }
  }

  if (!result.name && (firstName || lastName)) result.name = [firstName, lastName].filter(Boolean).join(' ');
  result.customFields = customFields;
  return result;
}
