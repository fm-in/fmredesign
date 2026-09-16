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
import { SITE_URL } from '@/lib/site-url';
import type { SalesEmailTemplate } from '@/lib/sales/sequence';
import type { LeadRow, SalesSettings } from '@/lib/sales/types';

export const SALES_FROM_DEFAULT = 'FreakingMinds <hello@freakingminds.in>';

type DerivedEmailFields = Pick<
  SalesEmailContext,
  'timeline' | 'projectType' | 'campaign' | 'platform' | 'score' | 'band' | 'weakestArea' | 'weakestScore'
>;

const WEAKEST_CHALLENGE_PATTERN = /^(.+?)\s*\((\d{1,3})\/100\)$/;
/** A slug looks like snake_case or kebab-case with no spaces, e.g. "web_app". */
const SLUG_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)+$/i;

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

/** "web_app" -> "web app"; "Website Redesign" (already natural language) is left alone. */
function humanizeProjectType(value: string | null): string | undefined {
  const trimmed = nonEmptyString(value);
  if (!trimmed) return undefined;
  return SLUG_PATTERN.test(trimmed) ? trimmed.replace(/[_-]+/g, ' ').toLowerCase() : trimmed;
}

function platformFromConnector(lead: LeadRow): string | undefined {
  const cf = customFieldsRecord(lead);
  const raw = readCustomString(cf, 'platform') ?? nonEmptyString(lead.source_detail)?.split('·')[0]?.trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : undefined;
}

function derivePlatform(lead: LeadRow): string | undefined {
  switch (lead.source) {
    case 'meta_lead_ads':
      return 'Meta';
    case 'google_lead_form':
    case 'google_ads':
      return 'Google';
    case 'connector':
      return platformFromConnector(lead);
    default:
      return undefined;
  }
}

/** Builds the email-template context fields that come from the lead row, reading every value defensively. */
export function deriveSalesEmailFields(lead: LeadRow): DerivedEmailFields {
  const cf = customFieldsRecord(lead);
  const weakest = parseWeakestChallenge(lead.primary_challenge);
  return {
    timeline: nonEmptyString(lead.timeline),
    projectType: humanizeProjectType(lead.project_type),
    campaign: nonEmptyString(lead.utm_campaign) ?? nonEmptyString(lead.source_detail),
    platform: derivePlatform(lead),
    score: readCustomNumber(cf, 'scorecardScore'),
    band: readCustomString(cf, 'scorecardBand'),
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
    whatsappUrl: companyWhatsappUrl(`Hi, this is ${lead.name}. I sent an enquiry on your website.`),
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
