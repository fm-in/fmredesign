/**
 * Confirmation receipts: the instant "we've got it" email for a contact-page
 * enquiry or a get-started brief. Copy is owner-approved (approved-copy.md,
 * addendum of 2026-09-17) — change it only with the owner. There is no Academy
 * receipt: Reserve opens Razorpay Checkout at once, and the paid confirmation
 * comes from the Razorpay webhook.
 *
 * Receipts are transactional, not sales email: they go through
 * `sendTransactionalEmail`, belong to no sequence, and are sent whatever
 * `automationEnabled` says.
 */

import { recordActivity } from '@/lib/sales/activity';
import { firstNameOf, renderEmailCopy, TEAM_SIGNATURE, whatsappPrefillText, type EmailCopy, type RenderedEmail } from '@/lib/sales/emails';
import { companyWhatsappUrl } from '@/lib/sales/links';
import { toE164 } from '@/lib/sales/phone';
import { projectTypePhrase } from '@/lib/sales/send-email';
import { sendTransactionalEmail } from '@/lib/sales/transactional-email';
import { safeErrorLog } from '@/lib/safe-log';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * At most one receipt per address per day. A public form will send mail to any
 * address typed into it, so without a cap a bot could have FreakingMinds mail a
 * stranger over and over. A genuine enquirer needs only the first one.
 */
export const RECEIPT_CAP_MS = 24 * 60 * 60 * 1000;

function capStart(): string {
  return new Date(Date.now() - RECEIPT_CAP_MS).toISOString();
}

/**
 * Whether this lead was sent a confirmation within the cap. Repeat submissions
 * for one address merge into one lead, so this caps receipts per address. A
 * failed check counts as sent: a missed receipt costs little, an uncapped one
 * is the abuse this exists to stop.
 */
async function confirmedRecently(leadId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('lead_activities')
    .select('id')
    .eq('lead_id', leadId)
    .eq('type', 'confirmation_sent')
    .gte('occurred_at', capStart())
    .limit(1);
  if (error) {
    console.error('[receipts] could not check for a recent confirmation:', safeErrorLog(error));
    return true;
  }
  return Array.isArray(data) && data.length > 0;
}

/**
 * The contact page's service options (src/app/contact/page.tsx) as they read
 * after "your enquiry about …". Keyed by the exact option text; anything else —
 * "Other", nothing chosen, or a value the page never offered — is left out, so
 * the approved fallback applies instead of repeating whatever was posted.
 */
/**
 * How each contact-form service reads mid-sentence: "…your enquiry about X."
 *
 * Keyed by the `name` of an entry in `src/lib/services-catalogue.ts`. The
 * catalogue is not imported here — it carries lucide icons and this module
 * renders email on the server — so a test asserts every option has a phrase.
 */
export const CONTACT_SERVICE_PHRASES: Readonly<Record<string, string>> = {
  'SEO': 'SEO',
  'Social Media': 'social media marketing',
  'Performance Marketing': 'performance marketing',
  'Brand Identity': 'brand identity',
  'Web Development': 'web design and development',
  'Content & Video': 'content and video',
};

/** The fields of a `POST /api/leads` body a receipt reads. */
export interface EnquirySubmission {
  name: string;
  email: string;
  /** As typed. Only its E.164 form is used, to check the do-not-contact list. */
  phone?: string;
  projectType?: string;
  customFields?: Record<string, unknown>;
}

function customString(customFields: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = customFields?.[key];
  return typeof value === 'string' ? value : undefined;
}

/** What the enquiry was about, as a mid-sentence phrase, or undefined when unknown. */
function enquiryProject(submission: EnquirySubmission): string | undefined {
  const formName = customString(submission.customFields, 'formName');
  if (formName === 'Get started') return projectTypePhrase(submission.projectType);
  if (formName === 'Contact page') {
    const service = customString(submission.customFields, 'service');
    return service && Object.hasOwn(CONTACT_SERVICE_PHRASES, service) ? CONTACT_SERVICE_PHRASES[service] : undefined;
  }
  return undefined;
}

export function renderEnquiryReceipt(submission: EnquirySubmission): RenderedEmail {
  const firstName = firstNameOf(submission.name);
  // Only the checked first name, never the rest of the submitted name: it is
  // unbounded free text, and this link goes to whatever address was typed in.
  const whatsappUrl = companyWhatsappUrl(whatsappPrefillText(submission.name, 'I sent an enquiry on your website'));
  const project = enquiryProject(submission);

  const copy: EmailCopy = {
    subject: "We've got your enquiry",
    preheader: 'Someone from the team will reply within 24 hours.',
    paragraphs: [
      `Hi ${firstName},`,
      `Thanks for getting in touch with FreakingMinds — we've received your enquiry${project ? ` about ${project}` : ''}.`,
      `Someone from the team will reply within 24 hours. If it's urgent, message us on WhatsApp: ${whatsappUrl}`,
    ],
    cta: { label: 'Message us on WhatsApp', url: whatsappUrl },
  };
  return renderEmailCopy(copy, { ownerName: TEAM_SIGNATURE });
}

/**
 * Sends the enquiry receipt to the address the person submitted and, when it
 * went and a lead row exists, notes it on the lead's timeline. Skipped silently
 * when that lead already had one within `RECEIPT_CAP_MS`. `leadId` is null only
 * on the pre-migration fallback, which has no timeline to check, so that path
 * is uncapped. Never throws.
 */
export async function sendEnquiryReceipt(submission: EnquirySubmission, leadId: string | null): Promise<void> {
  if (leadId && (await confirmedRecently(leadId))) return;

  const email = renderEnquiryReceipt(submission);
  const outcome = await sendTransactionalEmail({
    to: submission.email,
    phoneE164: toE164(submission.phone),
    template: 'enquiry_receipt',
    email,
  });
  if (!outcome.sent || !leadId) return;

  await recordActivity({
    leadId,
    type: 'confirmation_sent',
    channel: 'email',
    direction: 'out',
    subject: email.subject,
    body: email.text,
    providerMessageId: outcome.messageId,
    metadata: { template: 'enquiry_receipt' },
  });
}
