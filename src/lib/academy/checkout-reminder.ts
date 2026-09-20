/**
 * FM Academy abandoned-checkout reminder — pure helpers with no Inngest
 * dependency, so they can be imported from the enroll route (to dispatch the
 * event) without pulling in `inngest.createFunction`'s registration side
 * effect. The function that actually sends the reminder lives in
 * `src/lib/inngest/functions/academy.ts`.
 */

import { firstNameOf, renderEmailCopy, TEAM_SIGNATURE, type EmailCopy, type RenderedEmail } from '@/lib/sales/emails';
import { SITE_URL } from '@/lib/site-url';

/** Deterministic Inngest event id for one enrollment's reminder — sending the
 *  same id twice is a no-op, so a retried or duplicated dispatch can't double it up. */
export function checkoutReminderEventId(enrollmentId: string): string {
  return `academy-checkout-reminder-${enrollmentId}`;
}

/**
 * Owner-approved copy (2026-09-17), verbatim. `renderEmailCopy` builds the
 * branded HTML (via `renderShell`) and a plain-text alternative; passing no
 * `unsubscribeUrl` means neither part carries an unsubscribe line — this is
 * a one-off reminder about a checkout the person themselves started, not a
 * sales mailing.
 */
export function renderCheckoutReminderEmail(opts: {
  buyerName: string;
  programTitle: string;
  programSlug: string;
}): RenderedEmail {
  const firstName = firstNameOf(opts.buyerName);
  const copy: EmailCopy = {
    subject: `Finish booking your seat on ${opts.programTitle}`,
    preheader: "Your seat isn't booked until payment goes through.",
    paragraphs: [
      `Hi ${firstName},`,
      `You started booking a seat on ${opts.programTitle}, but the payment didn't go through, so your seat isn't booked yet.`,
      "If you'd still like to join, it takes a couple of minutes to finish.",
      'Questions? Just reply to this email.',
    ],
    cta: { label: 'Finish booking', url: `${SITE_URL}/academy/${opts.programSlug}` },
  };
  return renderEmailCopy(copy, { ownerName: TEAM_SIGNATURE });
}
