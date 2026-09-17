/**
 * Send one sales email to a lead. The consent, suppression and configuration
 * checks live here, at send time, so no caller can skip them.
 *
 * Resend's acceptable-use policy forbids cold email: this is only ever called
 * for leads who contacted FreakingMinds (consent_basis inbound_request/consent).
 */

import { getResend } from '@/lib/email/resend';
import { recordActivity } from '@/lib/sales/activity';
import { firstNameOf, renderSalesEmail, type SalesEmailContext } from '@/lib/sales/emails';
import { bookingUrl, companyWhatsappUrl } from '@/lib/sales/links';
import { isSuppressed } from '@/lib/sales/suppression';
import { isUnsubscribeConfigured, oneClickUnsubscribeUrl, unsubscribeUrl } from '@/lib/sales/unsubscribe-token';
import { BAND_LABELS } from '@/lib/scorecard/scoring';
import type { Band } from '@/lib/scorecard/types';
import { SITE_URL } from '@/lib/site-url';
import type { SalesEmailTemplate } from '@/lib/sales/sequence';
import type { LeadRow, SalesSettings } from '@/lib/sales/types';

export const SALES_FROM_DEFAULT = 'FreakingMinds <hello@freakingminds.in>';

type DerivedEmailFields = Pick<
  SalesEmailContext,
  'timeline' | 'projectType' | 'campaign' | 'platform' | 'score' | 'band' | 'weakestArea' | 'weakestScore'
>;

const WEAKEST_CHALLENGE_PATTERN = /^(.+?)\s*\((\d{1,3})\/100\)$/;

/**
 * How each get-started project type reads mid-sentence ("your brief on …",
 * "your … project"). Anything not listed — including free text — is left
 * out, so the approved "your project" wording applies instead of a guess.
 */
const PROJECT_TYPE_PHRASES: Record<string, string> = {
  website_design: 'website design',
  ecommerce: 'e-commerce',
  web_app: 'web app',
  mobile_app: 'mobile app',
  branding: 'branding',
  digital_marketing: 'digital marketing',
  full_service: 'full-service marketing',
  consultation: 'strategy',
};

/**
 * Scorecard bands as they read after "which puts you in the … range".
 * `BAND_LABELS` lowercased reads naturally for every band except "Needs
 * attention" ("the needs attention range"), which is hyphenated here.
 */
const BAND_PHRASE_OVERRIDES: Partial<Record<Band, string>> = {
  at_risk: 'needs-attention',
};

/** Brand spelling for connector platforms that capitalising the first letter gets wrong (intake lowercases them). */
const CONNECTOR_PLATFORM_NAMES: Record<string, string> = {
  linkedin: 'LinkedIn',
  justdial: 'JustDial',
  indiamart: 'IndiaMART',
};

const AD_SOURCES: ReadonlySet<string> = new Set(['meta_lead_ads', 'google_lead_form', 'google_ads', 'connector']);

function nonEmptyString(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** `custom_fields` is unvalidated jsonb: it may be null, a string, or an array. Never trust its shape. */
function customFieldsRecord(lead: LeadRow): Record<string, unknown> {
  const cf = lead.custom_fields;
  return cf && typeof cf === 'object' && !Array.isArray(cf) ? (cf as Record<string, unknown>) : {};
}

function readCustomString(cf: Record<string, unknown>, key: string): string | undefined {
  return nonEmptyString(typeof cf[key] === 'string' ? (cf[key] as string) : undefined);
}

function readCustomNumber(cf: Record<string, unknown>, key: string): number | undefined {
  const value = cf[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Parses `primary_challenge` values written as "{label} ({score}/100)" by
 * the scorecard flow. `primary_challenge` is free text, not a structured
 * column, so anything that does not match this exact shape is left
 * unparsed rather than guessed at — never a half-parsed label or score.
 */
export function parseWeakestChallenge(value: string | null | undefined): { area: string; score: number } | undefined {
  if (!value) return undefined;
  const match = WEAKEST_CHALLENGE_PATTERN.exec(value.trim());
  if (!match) return undefined;
  const area = nonEmptyString(match[1]);
  const score = Number(match[2]);
  if (!area || !Number.isFinite(score)) return undefined;
  return { area, score };
}

/** A known project type as a phrase; undefined for anything else. */
export function projectTypePhrase(value: string | null | undefined): string | undefined {
  const key = nonEmptyString(value);
  return key && Object.hasOwn(PROJECT_TYPE_PHRASES, key) ? PROJECT_TYPE_PHRASES[key] : undefined;
}

/** A timeline worth mentioning. "flexible" is no timeline: that lead never mentioned one. */
function statedTimeline(value: string | null): string | undefined {
  const timeline = nonEmptyString(value);
  return timeline && timeline.toLowerCase() !== 'flexible' ? timeline : undefined;
}

function isBand(value: string): value is Band {
  return Object.hasOwn(BAND_LABELS, value);
}

/** A stored band slug as a mid-sentence phrase; undefined for anything that is not a band. */
function bandPhrase(value: string | undefined): string | undefined {
  if (!value || !isBand(value)) return undefined;
  return BAND_PHRASE_OVERRIDES[value] ?? BAND_LABELS[value].toLowerCase();
}

/**
 * A zap's free-text platform as a name: "linkedin_ads" -> "LinkedIn Ads".
 * Underscores and hyphens become spaces, known brands keep their spelling,
 * and every other word gets a capital first letter.
 */
function humanizePlatform(raw: string): string | undefined {
  const words = raw.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return undefined;
  return words
    .map((word) => {
      const known = word.toLowerCase();
      return Object.hasOwn(CONNECTOR_PLATFORM_NAMES, known)
        ? CONNECTOR_PLATFORM_NAMES[known]
        : word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function platformFromConnector(lead: LeadRow): string | undefined {
  const cf = customFieldsRecord(lead);
  const raw = readCustomString(cf, 'platform') ?? nonEmptyString(lead.source_detail)?.split('·')[0]?.trim();
  return raw ? humanizePlatform(raw) : undefined;
}

/** Meta intake stores where the lead ad ran in utm_source ("facebook" or "instagram"). */
function platformFromMeta(lead: LeadRow): string {
  switch (nonEmptyString(lead.utm_source)?.toLowerCase()) {
    case 'facebook':
      return 'Facebook';
    case 'instagram':
      return 'Instagram';
    default:
      return 'Meta';
  }
}

function derivePlatform(lead: LeadRow): string | undefined {
  switch (lead.source) {
    case 'meta_lead_ads':
      return platformFromMeta(lead);
    case 'google_lead_form':
    case 'google_ads':
      return 'Google';
    case 'connector':
      return platformFromConnector(lead);
    default:
      return undefined;
  }
}

/**
 * A campaign name a customer would recognise, or undefined. Only a connector
 * lead has one: the campaign the zap explicitly posted, which intake keeps in
 * `custom_fields.connectorCampaign`. `utm_campaign` is never read — Google
 * stores a numeric id there, Meta an internal name, website UTMs are tracking
 * values, and a merge can copy any of those onto a connector lead. The key is
 * ignored on other sources, where a submitted form could have supplied it.
 */
function customerCampaign(lead: LeadRow): string | undefined {
  return lead.source === 'connector' ? readCustomString(customFieldsRecord(lead), 'connectorCampaign') : undefined;
}

/**
 * The WhatsApp prefill's second sentence, matching how the lead reached us.
 * No closing full stop: the link would end in "." and sit before the email
 * sentence's own full stop, reading ".." in plain text.
 */
function whatsappIntroLine(source: string | null): string {
  if (source === 'website_form') return 'I sent an enquiry on your website';
  if (source === 'scorecard') return 'I took your marketing scorecard';
  if (source && AD_SOURCES.has(source)) return 'I filled in your form';
  return 'I got in touch';
}

/** Builds the email-template context fields that come from the lead row, reading every value defensively. */
export function deriveSalesEmailFields(lead: LeadRow): DerivedEmailFields {
  const cf = customFieldsRecord(lead);
  const weakest = parseWeakestChallenge(lead.primary_challenge);
  return {
    timeline: statedTimeline(lead.timeline),
    projectType: projectTypePhrase(lead.project_type),
    campaign: customerCampaign(lead),
    platform: derivePlatform(lead),
    score: readCustomNumber(cf, 'scorecardScore'),
    band: bandPhrase(readCustomString(cf, 'scorecardBand')),
    weakestArea: weakest?.area,
    weakestScore: weakest?.score,
  };
}

export type SendOutcome =
  | { sent: true; messageId: string }
  | { sent: false; reason: 'no_email' | 'no_consent' | 'suppressed' | 'not_configured' };

export interface SendSalesEmailArgs {
  lead: LeadRow;
  template: SalesEmailTemplate;
  settings: SalesSettings;
  ownerName: string;
}

export async function sendSalesEmail({ lead, template, settings, ownerName }: SendSalesEmailArgs): Promise<SendOutcome> {
  if (!lead.email) return { sent: false, reason: 'no_email' };
  if (lead.consent_basis !== 'inbound_request' && lead.consent_basis !== 'consent') {
    return { sent: false, reason: 'no_consent' };
  }
  if (await isSuppressed({ email: lead.email, phoneE164: lead.phone_e164 })) {
    return { sent: false, reason: 'suppressed' };
  }

  const resend = getResend();
  const replyTo = process.env.SALES_REPLY_TO;
  if (!resend || !replyTo || !isUnsubscribeConfigured()) return { sent: false, reason: 'not_configured' };

  const prefill = { leadId: lead.id, name: lead.name, email: lead.email };
  const rendered = renderSalesEmail(template, {
    firstName: firstNameOf(lead.name),
    ownerName,
    bookingUrl: bookingUrl(settings.bookingLink, prefill),
    bookingUrlLong: bookingUrl(settings.bookingLinkLong, prefill),
    whatsappUrl: companyWhatsappUrl(`Hi, this is ${lead.name}. ${whatsappIntroLine(lead.source)}`),
    unsubscribeUrl: unsubscribeUrl(lead.email),
    workUrl: `${SITE_URL}/work`,
    scorecardUrl: `${SITE_URL}/scorecard`,
    ...deriveSalesEmailFields(lead),
  });

  const { data, error } = await resend.emails.send(
    {
      from: process.env.SALES_FROM_EMAIL || SALES_FROM_DEFAULT,
      to: lead.email,
      replyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        'List-Unsubscribe': `<${oneClickUnsubscribeUrl(lead.email)}>, <mailto:${replyTo}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'lead_id', value: lead.id },
        { name: 'template', value: template },
      ],
    },
    // A retried step that already reached Resend sends nothing new (Resend keeps keys for 24 hours).
    { idempotencyKey: `sales:${lead.id}:${template}` }
  );

  // Throwing lets Inngest retry a transient Resend failure.
  if (error || !data) throw new Error(`Resend send failed: ${error?.message ?? 'no response'}`);

  await recordActivity({
    leadId: lead.id,
    type: 'email_sent',
    channel: 'email',
    direction: 'out',
    subject: rendered.subject,
    body: rendered.text,
    providerMessageId: data.id,
    metadata: { template },
  });

  return { sent: true, messageId: data.id };
}
