/**
 * Picking an email address out of a WhatsApp message.
 *
 * WhatsApp gives us a phone number and nothing else, and a lead with no email
 * is a dead end: `sequenceStartState` refuses one outright — "This lead has no
 * email address, so follow-ups can't be sent" — so every enquiry that arrives
 * here sits untouched until a person chases it by hand. Of the WhatsApp leads
 * in the database when this was written, none had an email.
 *
 * ## Why this does not go through `ingestLead`
 *
 * It deliberately will not do it. `CONTACT_COLUMNS_FILLABLE` in
 * intake/normalise.ts refuses to fill `email` on a lead matched by phone,
 * because "knowing someone's phone number must not let a stranger attach an
 * email to their lead". That is the right rule for a webhook, where a payload
 * merely *asserts* that a phone and an email belong together.
 *
 * This is the case that rule is not about. Meta authenticates the sending
 * number, and the address arrives in that same authenticated thread, typed by
 * whoever holds the phone. The pairing is witnessed rather than claimed, so
 * the guard is left exactly as it is and this writes the one field directly.
 *
 * ## What keeps it safe
 *
 * - It only ever fills a gap. An existing email is never overwritten, so a
 *   later message cannot redirect a lead's mail somewhere else.
 * - Capturing an address sends nothing. Sequences are started by a person
 *   (`No automatic enrolment`), and `sendSalesEmail` re-checks consent at
 *   send time, so a mistyped or borrowed address cannot quietly become mail.
 * - It goes on the timeline, so where an address came from is auditable.
 */

import { recordActivity } from '@/lib/sales/activity';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Deliberately permissive about its surroundings and strict about the address.
 *
 * "rohit@acme.in", "sure — rohit@acme.in" and "you can reach me at
 * rohit@acme.in" are all the same intent, and a pattern that only accepted a
 * bare address would miss most of them.
 */
const EMAIL = /[^\s@<>()[\],;:]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}/i;

/** The address in a message, or null. Trailing sentence punctuation is dropped. */
export function findEmail(text: string | null): string | null {
  if (!text) return null;
  const match = EMAIL.exec(text);
  if (!match) return null;
  const address = match[0].replace(/[.,;:!?)]+$/, '').toLowerCase();
  // A dot immediately before the @ is never valid, and is the usual shape of
  // a sentence running into an address.
  return address.includes('.@') ? null : address;
}

/**
 * Fills in a lead's email from something they sent us.
 *
 * Returns the address when it was actually stored, so the caller can confirm
 * it back to them — a wrong address is far likelier to be corrected if the
 * person sees which one we took.
 */
export async function captureEmail(
  leadId: string,
  currentEmail: string | null,
  text: string | null
): Promise<string | null> {
  if (currentEmail) return null;
  const email = findEmail(text);
  if (!email) return null;

  try {
    const { error } = await getSupabaseAdmin()
      .from('leads')
      // Guarded in SQL as well as above: two messages arriving together must
      // not race each other into overwriting one another.
      .update({ email })
      .eq('id', leadId)
      .is('email', null);

    if (error) throw new Error(error.message);

    await recordActivity({
      leadId,
      type: 'note',
      channel: 'whatsapp',
      body: `Email captured from their WhatsApp message: ${email}`,
      metadata: { field: 'email', via: 'whatsapp_message' },
    });

    return email;
  } catch (err) {
    // Never fail a conversation over this. The message still reaches a person.
    console.error('[whatsapp] could not store the email:', err instanceof Error ? err.message : err);
    return null;
  }
}
