/**
 * Sending WhatsApp to a lead, with the policy that decides whether we may.
 *
 * `client.ts` is the wire; this is the gate. It mirrors `sendSalesEmail`
 * deliberately — same refusal reasons, same order — because two channels that
 * answer "may we contact this person" differently is how a person who opted
 * out still hears from you.
 *
 * The split below is WhatsApp's own, not one we invented: Meta classifies
 * every template as MARKETING or UTILITY, and the rules differ. Marketing
 * needs consent and stays inside sending hours; utility is an update on
 * something already under way and only has to respect a hard opt-out.
 */

import { firstNameOf } from '@/lib/sales/emails';
import { recordActivity } from '@/lib/sales/activity';
import { getSalesSettings } from '@/lib/sales/settings';
import { isSuppressed } from '@/lib/sales/suppression';
import type { LeadRow } from '@/lib/sales/types';
import { isWithinSendWindow } from '@/lib/sales/send-window';
import {
  isWhatsAppConfigured,
  sendWhatsAppTemplate,
  sendWhatsAppText,
  templateParam,
  type TemplateSend,
} from '@/lib/whatsapp/client';
import { windowStateFor } from '@/lib/whatsapp/conversations';

export type WhatsAppSendOutcome =
  | { sent: true; wamid?: string }
  | {
      sent: false;
      reason:
        | 'no_phone'
        | 'no_consent'
        | 'suppressed'
        | 'not_configured'
        | 'automation_off'
        | 'outside_hours'
        /** Past 24 hours since their last message: only a template will send. */
        | 'window_closed'
        | 'failed';
      error?: string;
    };

/** MARKETING carries the full gate; UTILITY only a hard opt-out. */
export type TemplateCategory = 'marketing' | 'utility';

export interface SendTemplateArgs {
  lead: LeadRow;
  template: TemplateSend;
  category: TemplateCategory;
  /**
   * Skip the sending-hours check for a message that is a direct answer to
   * something the person just did. Someone who fills in a form at 02:00 is
   * awake and expecting a reply; holding it until 09:00 defeats the point.
   * Never set for a scheduled or bulk send.
   */
  respondingToAction?: boolean;
}

export async function sendTemplateToLead({
  lead,
  template,
  category,
  respondingToAction = false,
}: SendTemplateArgs): Promise<WhatsAppSendOutcome> {
  if (!lead.phone_e164) return { sent: false, reason: 'no_phone' };
  if (!isWhatsAppConfigured()) return { sent: false, reason: 'not_configured' };

  if (category === 'marketing') {
    if (lead.consent_basis !== 'inbound_request' && lead.consent_basis !== 'consent') {
      return { sent: false, reason: 'no_consent' };
    }
    const settings = await getSalesSettings();
    if (!settings.automationEnabled) return { sent: false, reason: 'automation_off' };
    if (!respondingToAction && !isWithinSendWindow(new Date())) {
      return { sent: false, reason: 'outside_hours' };
    }
  }

  // Checked for both categories: a hard opt-out outranks an operational update.
  if (await isSuppressed({ phoneE164: lead.phone_e164 }, 'whatsapp')) {
    return { sent: false, reason: 'suppressed' };
  }

  const result = await sendWhatsAppTemplate(lead.phone_e164, template);

  await recordActivity({
    leadId: lead.id,
    type: result.ok ? 'message_sent' : 'message_failed',
    channel: 'whatsapp',
    direction: 'out',
    subject: template.name,
    providerMessageId: result.wamid ?? null,
    metadata: result.ok
      ? { template: template.name, category }
      : { template: template.name, category, error: result.error },
  });

  return result.ok ? { sent: true, wamid: result.wamid } : { sent: false, reason: 'failed', error: result.error };
}

/**
 * The approved `enquiry_first_touch` template, filled from a lead.
 *
 * Body placeholders, in order:
 *   {{1}} their first name
 *   {{2}} what the enquiry was about, mid-sentence
 *   {{3}} who is looking after it
 *
 * Every one has a fallback because Cloud API rejects the whole message if a
 * parameter is empty — and `{{2}}` genuinely is unknown for an ad lead, a
 * scorecard lead, or anyone who booked a call directly.
 */
export function enquiryFirstTouch(lead: LeadRow, ownerName: string): TemplateSend {
  return {
    name: 'enquiry_first_touch',
    // Approved as `en`. `en_US` is a different template and would 404.
    language: 'en',
    bodyParams: [
      templateParam(firstNameOf(lead.name), 'there'),
      templateParam(enquiryAbout(lead), 'your project'),
      templateParam(ownerName, 'the Freaking Minds team'),
    ],
  };
}

/**
 * What the enquiry was about, as it reads mid-sentence after "about".
 *
 * `receipts.ts` does this for the confirmation email, but from the raw form
 * body. This reads the stored lead instead, so it also works for a message
 * sent hours later by a background job.
 */
function enquiryAbout(lead: LeadRow): string | null {
  const custom = (lead.custom_fields && typeof lead.custom_fields === 'object' ? lead.custom_fields : {}) as Record<
    string,
    unknown
  >;
  const service = typeof custom.service === 'string' ? custom.service : null;
  if (service) return SERVICE_PHRASES[service] ?? service;
  if (typeof lead.project_type === 'string' && lead.project_type) return lead.project_type.replace(/_/g, ' ');
  return null;
}

/** Keyed by the contact form's service option; the same phrasing the receipt email uses. */
const SERVICE_PHRASES: Readonly<Record<string, string>> = {
  SEO: 'SEO',
  'Social Media': 'social media marketing',
  'Performance Marketing': 'performance marketing',
  'Brand Identity': 'brand identity',
  'Web Development': 'web design and development',
  'Content & Video': 'content and video',
};


/**
 * A person replying as the business, from the inbox.
 *
 * Free text, so it is legal only inside the 24-hour window — checked here
 * rather than trusted from the caller, because the window can close between
 * the screen rendering and the send button being pressed, and Meta's refusal
 * at that point is opaque.
 *
 * Deliberately NOT gated on consent, sending hours or the automation switch:
 * this is a human answering someone who wrote to us first. Those gates exist
 * to stop us starting conversations, not to stop us finishing them. A hard
 * opt-out still applies — if they said stop, a person should not override it.
 */
export async function sendReplyToLead({
  lead,
  text,
  actor,
}: {
  lead: LeadRow;
  text: string;
  actor: { id: string; name: string };
}): Promise<WhatsAppSendOutcome> {
  if (!lead.phone_e164) return { sent: false, reason: 'no_phone' };
  if (!isWhatsAppConfigured()) return { sent: false, reason: 'not_configured' };

  const body = text.trim();
  if (!body) return { sent: false, reason: 'failed', error: 'Nothing to send' };

  if (await isSuppressed({ phoneE164: lead.phone_e164 }, 'whatsapp')) {
    return { sent: false, reason: 'suppressed' };
  }

  const window = await windowStateFor(lead.id);
  if (!window.open) return { sent: false, reason: 'window_closed' };

  const result = await sendWhatsAppText(lead.phone_e164, body);

  await recordActivity({
    leadId: lead.id,
    type: result.ok ? 'message_sent' : 'message_failed',
    channel: 'whatsapp',
    direction: 'out',
    body: result.ok ? body : null,
    providerMessageId: result.wamid ?? null,
    metadata: result.ok ? {} : { error: result.error },
    actor,
  });

  return result.ok ? { sent: true, wamid: result.wamid } : { sent: false, reason: 'failed', error: result.error };
}
