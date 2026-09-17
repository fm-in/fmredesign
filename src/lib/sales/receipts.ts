/**
 * Confirmation receipts: the instant "we've got it" email for a contact-page
 * enquiry, a get-started brief, or an Academy seat reservation. Copy is
 * owner-approved (approved-copy.md, addendum of 2026-09-17) — change it only
 * with the owner.
 *
 * Receipts are transactional, not sales email: they go through
 * `sendTransactionalEmail`, belong to no sequence, and are sent whatever
 * `automationEnabled` says.
 */

import { batchSchedule } from '@/lib/academy/schedule';
import { recordActivity } from '@/lib/sales/activity';
import { firstNameOf, NO_FIRST_NAME, renderEmailCopy, TEAM_SIGNATURE, type EmailCopy, type RenderedEmail } from '@/lib/sales/emails';
import { companyWhatsappUrl } from '@/lib/sales/links';
import { projectTypePhrase } from '@/lib/sales/send-email';
import { sendTransactionalEmail } from '@/lib/sales/transactional-email';
import { SITE_URL } from '@/lib/site-url';

/**
 * The contact page's service options (src/app/contact/page.tsx) as they read
 * after "your enquiry about …". Keyed by the exact option text; anything else —
 * "Other", nothing chosen, or a value the page never offered — is left out, so
 * the approved fallback applies instead of repeating whatever was posted.
 */
export const CONTACT_SERVICE_PHRASES: Readonly<Record<string, string>> = {
  'SEO & Digital Marketing': 'SEO and digital marketing',
  'Social Media Marketing': 'social media marketing',
  'PPC Advertising': 'PPC advertising',
  'Website Design & Development': 'website design and development',
  'Branding & Creative Design': 'branding and creative design',
  'Content Marketing': 'content marketing',
  'E-commerce Solutions': 'e-commerce solutions',
};

/** The fields of a `POST /api/leads` body a receipt reads. */
export interface EnquirySubmission {
  name: string;
  email: string;
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
  const hasName = firstName !== NO_FIRST_NAME;
  const whatsappUrl = companyWhatsappUrl(
    hasName ? `Hi, this is ${submission.name.trim()}. I sent an enquiry on your website` : 'Hi, I sent an enquiry on your website'
  );
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
 * went and a lead row exists, notes it on the lead's timeline. Never throws.
 */
export async function sendEnquiryReceipt(submission: EnquirySubmission, leadId: string | null): Promise<void> {
  const email = renderEnquiryReceipt(submission);
  const outcome = await sendTransactionalEmail({ to: submission.email, template: 'enquiry_receipt', email });
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

/** A new Academy reservation, from what `POST /api/academy/enroll` already loads. */
export interface AcademyReservation {
  buyerName: string;
  program: {
    title: string | null;
    slug: string | null;
    /** `programs.starts_at` */
    startsAt: string | null;
  };
}

/**
 * The start date as India reads it ("12 October 2026"), only while it is still
 * ahead — the same rule the Academy pages follow, so a stale `starts_at` is
 * never claimed.
 */
function upcomingStartDate(startsAt: string | null): string | undefined {
  if (!startsAt || !batchSchedule(startsAt).isUpcoming) return undefined;
  return new Date(startsAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function renderAcademyReserved({ buyerName, program }: AcademyReservation): RenderedEmail {
  const programName = program.title?.trim() || undefined;
  const slug = program.slug?.trim();
  const startDate = upcomingStartDate(program.startsAt);
  const seat = programName ? `Your seat on ${programName}` : 'Your seat';

  const copy: EmailCopy = {
    subject: `${seat} is reserved`,
    preheader: "We'll send your payment link shortly.",
    paragraphs: [
      `Hi ${firstNameOf(buyerName)},`,
      `${seat} is reserved${startDate ? `, starting ${startDate}` : ''}.`,
      "We'll send your payment link shortly — your seat is confirmed once payment is complete.",
      'Questions? Just reply to this email.',
    ],
    cta: { label: 'View the programme', url: slug ? `${SITE_URL}/academy/${encodeURIComponent(slug)}` : `${SITE_URL}/academy` },
  };
  return renderEmailCopy(copy, { ownerName: TEAM_SIGNATURE });
}

/** Sends the reservation receipt to the buyer. Never throws. */
export async function sendAcademyReservedReceipt(buyerEmail: string, reservation: AcademyReservation): Promise<void> {
  await sendTransactionalEmail({ to: buyerEmail, template: 'academy_reserved', email: renderAcademyReserved(reservation) });
}
