/**
 * Send one sales email to a lead. The consent, suppression and configuration
 * checks live here, at send time, so no caller can skip them.
 *
 * Resend's acceptable-use policy forbids cold email: this is only ever called
 * for leads who contacted FreakingMinds (consent_basis inbound_request/consent).
 */

import { getResend } from '@/lib/email/resend';
import { recordActivity } from '@/lib/sales/activity';
import { firstNameOf, renderSalesEmail } from '@/lib/sales/emails';
import { bookingUrl, companyWhatsappUrl } from '@/lib/sales/links';
import { isSuppressed } from '@/lib/sales/suppression';
import { isUnsubscribeConfigured, oneClickUnsubscribeUrl, unsubscribeUrl } from '@/lib/sales/unsubscribe-token';
import { SITE_URL } from '@/lib/site-url';
import type { SalesEmailTemplate } from '@/lib/sales/sequence';
import type { LeadRow, SalesSettings } from '@/lib/sales/types';

export const SALES_FROM_DEFAULT = 'FreakingMinds <hello@freakingminds.in>';

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

  const rendered = renderSalesEmail(template, {
    firstName: firstNameOf(lead.name),
    ownerName,
    bookingUrl: bookingUrl(settings.bookingLink, { leadId: lead.id, name: lead.name, email: lead.email }),
    whatsappUrl: companyWhatsappUrl(`Hi, this is ${lead.name}. I sent an enquiry on your website.`),
    unsubscribeUrl: unsubscribeUrl(lead.email),
    workUrl: `${SITE_URL}/work`,
    scorecardUrl: `${SITE_URL}/scorecard`,
  });

  const { data, error } = await resend.emails.send({
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
  });

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
