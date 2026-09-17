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
import { safeErrorMessage } from '@/lib/safe-log';
import { SITE_URL } from '@/lib/site-url';
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
    console.error('[receipts] could not check for a recent confirmation:', safeErrorMessage(error));
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
 * went and a lead row exists, notes it on the lead's timeline. Skipped silently
 * when that lead already had one within `RECEIPT_CAP_MS`. `leadId` is null only
 * on the pre-migration fallback, which has no timeline to check, so that path
 * is uncapped. Never throws.
 */
export async function sendEnquiryReceipt(submission: EnquirySubmission, leadId: string | null): Promise<void> {
  if (leadId && (await confirmedRecently(leadId))) return;

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

/** The reservation just created, which the receipt confirms. */
export interface NewReservation {
  buyerEmail: string;
  programId: string;
  /** The new `enrollments.id`, which the cap check leaves out. */
  enrollmentId: string;
}

/**
 * Whether the buyer made another reservation for the same programme (any
 * status) within the cap. `enrollments` records no sent receipts, so an earlier
 * reservation stands in for one. Keyed on buyer and programme, so reserving two
 * programmes on the same day confirms both; the route already reuses a live
 * reservation for the same pair, so in practice this is one receipt per
 * reservation. A failed check counts as recent, as for enquiries.
 */
async function reservedRecently({ buyerEmail, programId, enrollmentId }: NewReservation): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('enrollments')
    .select('id')
    .eq('buyer_email', buyerEmail.trim().toLowerCase())
    .eq('program_id', programId)
    .neq('id', enrollmentId)
    .gte('created_at', capStart())
    .limit(1);
  if (error) {
    console.error('[receipts] could not check for a recent reservation:', safeErrorMessage(error));
    return true;
  }
  return Array.isArray(data) && data.length > 0;
}

/**
 * Sends the reservation receipt to the buyer, unless they already reserved
 * this programme within `RECEIPT_CAP_MS`. Never throws.
 */
export async function sendAcademyReservedReceipt(reservationMade: NewReservation, reservation: AcademyReservation): Promise<void> {
  if (await reservedRecently(reservationMade)) return;
  await sendTransactionalEmail({
    to: reservationMade.buyerEmail,
    template: 'academy_reserved',
    email: renderAcademyReserved(reservation),
  });
}
