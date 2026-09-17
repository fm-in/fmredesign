/**
 * Pure intake helpers: clean what a source sent, decide how to find an
 * existing lead, and map to `leads` columns. No database access here, so
 * every rule is unit-tested.
 */

import { toE164 } from '@/lib/sales/phone';
import type { Attribution, IntakeLead } from '@/lib/sales/types';

export interface NormalisedIntake extends IntakeLead {
  name: string;
  email?: string;
  phoneE164: string | null;
}

export type MatchKey =
  | { kind: 'external'; source: string; value: string }
  | { kind: 'email'; value: string }
  | { kind: 'phone'; value: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_MESSAGE = 5000;
const MAX_ATTRIBUTION = 300;

/** Columns an incoming submission may fill on an existing lead. */
const MERGEABLE_COLUMNS = [
  'email',
  'phone',
  'phone_e164',
  'company',
  'website',
  'job_title',
  'company_size',
  'industry',
  'project_type',
  'project_description',
  'budget_range',
  'timeline',
  'primary_challenge',
  'source_detail',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'landing_page',
  'referrer',
  'gclid',
  'fbclid',
] as const;

function cleanLine(value: string | null | undefined, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, max) : undefined;
}

function cleanText(value: string | null | undefined, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/<[^>]*>/g, '').trim();
  return cleaned ? cleaned.slice(0, max) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

export function normaliseEmail(raw?: string | null): string | undefined {
  const email = raw?.trim().toLowerCase();
  return email && EMAIL_RE.test(email) ? email : undefined;
}

function normaliseAttribution(input: Attribution | undefined): Attribution | undefined {
  if (!input) return undefined;
  return {
    utmSource: cleanLine(input.utmSource, MAX_ATTRIBUTION),
    utmMedium: cleanLine(input.utmMedium, MAX_ATTRIBUTION),
    utmCampaign: cleanLine(input.utmCampaign, MAX_ATTRIBUTION),
    utmContent: cleanLine(input.utmContent, MAX_ATTRIBUTION),
    utmTerm: cleanLine(input.utmTerm, MAX_ATTRIBUTION),
    landingPage: cleanLine(input.landingPage, MAX_ATTRIBUTION),
    referrer: cleanLine(input.referrer, MAX_ATTRIBUTION),
    gclid: cleanLine(input.gclid, MAX_ATTRIBUTION),
    fbclid: cleanLine(input.fbclid, MAX_ATTRIBUTION),
  };
}

export function normaliseIntake(input: IntakeLead): NormalisedIntake {
  const email = normaliseEmail(input.email);
  const phone = cleanLine(input.phone, 40);
  const phoneE164 = toE164(phone);
  const name = cleanLine(input.name, 200) ?? (email ? email.split('@')[0] : undefined) ?? phoneE164 ?? 'Unknown';

  return {
    ...input,
    name,
    email,
    phone,
    phoneE164,
    company: cleanLine(input.company, 200),
    website: cleanLine(input.website, 300),
    jobTitle: cleanLine(input.jobTitle, 200),
    message: cleanText(input.message, MAX_MESSAGE),
    sourceDetail: cleanLine(input.sourceDetail, 200),
    externalSourceId: cleanLine(input.externalSourceId, 200),
    primaryChallenge: cleanText(input.primaryChallenge, 2000),
    specificRequirements: cleanText(input.specificRequirements, 2000),
    additionalChallenges: input.additionalChallenges
      ?.map((challenge) => cleanLine(challenge, 300))
      .filter((challenge): challenge is string => Boolean(challenge)),
    attribution: normaliseAttribution(input.attribution),
  };
}

export function hasContact(lead: NormalisedIntake): boolean {
  return Boolean(lead.email || lead.phoneE164);
}

export function matchKeys(lead: NormalisedIntake): MatchKey[] {
  const keys: MatchKey[] = [];
  if (lead.externalSourceId) keys.push({ kind: 'external', source: lead.source, value: lead.externalSourceId });
  if (lead.email) keys.push({ kind: 'email', value: lead.email });
  if (lead.phoneE164) keys.push({ kind: 'phone', value: lead.phoneE164 });
  return keys;
}

/**
 * Contact columns a merge may fill, by what matched. Only the platform's own
 * lead id proves the email and phone belong to the same person: knowing
 * someone's phone number must not let a stranger attach an email to their lead.
 */
const CONTACT_COLUMNS_FILLABLE: Record<MatchKey['kind'], ReadonlySet<string>> = {
  external: new Set(['email', 'phone', 'phone_e164']),
  email: new Set(['email']),
  phone: new Set(['phone', 'phone_e164']),
};

const CONTACT_COLUMNS = new Set(['email', 'phone', 'phone_e164']);

/** The subset of `incoming` that fills gaps on `existing`. Never overwrites. */
export function mergeEmptyFields(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  matchedOn: MatchKey['kind']
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  const fillableContacts = CONTACT_COLUMNS_FILLABLE[matchedOn];

  for (const column of MERGEABLE_COLUMNS) {
    if (CONTACT_COLUMNS.has(column) && !fillableContacts.has(column)) continue;
    if (isEmpty(existing[column]) && !isEmpty(incoming[column])) {
      updates[column] = incoming[column];
    }
  }

  const existingCustom = isRecord(existing.custom_fields) ? existing.custom_fields : {};
  const incomingCustom = isRecord(incoming.custom_fields) ? incoming.custom_fields : {};
  const addedKeys = Object.keys(incomingCustom).filter((key) => !(key in existingCustom));
  if (addedKeys.length > 0) {
    updates.custom_fields = {
      ...existingCustom,
      ...Object.fromEntries(addedKeys.map((key) => [key, incomingCustom[key]])),
    };
  }

  return updates;
}

export function toLeadRecord(lead: NormalisedIntake, id: string, nowIso: string): Record<string, unknown> {
  const attribution = lead.attribution ?? {};
  return {
    id,
    name: lead.name,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    phone_e164: lead.phoneE164,
    company: lead.company ?? null,
    website: lead.website ?? null,
    job_title: lead.jobTitle ?? null,
    company_size: lead.companySize ?? null,
    industry: lead.industry ?? null,
    project_type: lead.projectType ?? null,
    project_description: lead.message ?? null,
    budget_range: lead.budgetRange ?? null,
    timeline: lead.timeline ?? null,
    primary_challenge: lead.primaryChallenge ?? null,
    additional_challenges: lead.additionalChallenges ?? [],
    specific_requirements: lead.specificRequirements ?? null,
    status: 'new',
    source: lead.source,
    source_detail: lead.sourceDetail ?? null,
    external_source_id: lead.externalSourceId ?? null,
    tags: lead.tags ?? [],
    notes: '',
    custom_fields: lead.customFields ?? {},
    utm_source: attribution.utmSource ?? null,
    utm_medium: attribution.utmMedium ?? null,
    utm_campaign: attribution.utmCampaign ?? null,
    utm_content: attribution.utmContent ?? null,
    utm_term: attribution.utmTerm ?? null,
    landing_page: attribution.landingPage ?? null,
    referrer: attribution.referrer ?? null,
    gclid: attribution.gclid ?? null,
    fbclid: attribution.fbclid ?? null,
    consent_basis: lead.consent.basis,
    consent_evidence: lead.consent.evidence,
    consent_captured_at: lead.consent.capturedAt,
    ip_address: lead.ipAddress ?? null,
    user_agent: lead.userAgent ?? null,
    last_activity_at: nowIso,
    stage_changed_at: nowIso,
  };
}
