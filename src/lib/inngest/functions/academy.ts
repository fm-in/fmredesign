/**
 * Inngest: FM Academy — one abandoned-checkout reminder.
 *
 * A seat is only ever counted once payment succeeds (the SQL trigger counts
 * `paid` rows only), and an unpaid row is never auto-cancelled — it just sits
 * as "Payment pending". This function sends exactly one reminder email, an
 * hour after checkout started, when the buyer still hasn't paid and nothing
 * else has since made the reminder pointless (they paid, the batch filled or
 * closed, or they're on the do-not-contact list).
 *
 * Only primitive values pass between steps, and the single `step.run` below
 * re-reads everything it needs — the same pattern `functions/sales.ts` uses —
 * so a retried step never works from a stale copy of the enrollment.
 *
 * The deterministic event id and the email copy are pure helpers in
 * `@/lib/academy/checkout-reminder` (not here), so the enroll route can
 * import them to dispatch the event without pulling in the
 * `inngest.createFunction(...)` registration this file runs at import time.
 */

import { inngest } from '../client';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/email/resend';
import { checkoutReminderEventId, renderCheckoutReminderEmail } from '@/lib/academy/checkout-reminder';
import { isSuppressedOrThrow } from '@/lib/sales/suppression';
import { toE164 } from '@/lib/sales/phone';
import { likeLiteral } from '@/lib/postgrest';
import { SALES_FROM_DEFAULT } from '@/lib/sales/send-email';
import { safeErrorLog, safeErrorMessage } from '@/lib/safe-log';

interface EnrollmentRow {
  id: string;
  program_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  status: string;
}

interface ProgramRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  seats_total: number | null;
  seats_taken: number | null;
}

type ReminderResult = { sent: true } | { skipped: string };

export const academyCheckoutReminderFn = inngest.createFunction(
  { id: 'academy-checkout-reminder', retries: 3 },
  { event: 'academy/checkout.started' },
  async ({ event, step }) => {
    const { enrollmentId } = event.data;

    await step.sleep('wait-1-hour', '1h');

    return step.run('decide-and-send', () => decideAndSend(enrollmentId));
  }
);

async function decideAndSend(enrollmentId: string): Promise<ReminderResult> {
  const supabase = getSupabaseAdmin();

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('id, program_id, buyer_name, buyer_email, buyer_phone, status')
    .eq('id', enrollmentId)
    .maybeSingle();
  if (enrollmentError) {
    // A transient DB error — throw so Inngest retries instead of losing the reminder.
    throw new Error(`enrollment lookup failed: ${safeErrorMessage(enrollmentError)}`);
  }
  const row = enrollment as EnrollmentRow | null;
  if (!row) return { skipped: 'enrollment_not_found' };
  if (row.status !== 'reserved' && row.status !== 'failed') return { skipped: 'not_unpaid' };

  // Any other row for the same programme + buyer that is already paid means
  // the buyer completed checkout, whatever became of *this* row.
  const { data: paidSiblings, error: siblingError } = await supabase
    .from('enrollments')
    .select('id')
    .eq('program_id', row.program_id)
    .ilike('buyer_email', likeLiteral(row.buyer_email))
    .eq('status', 'paid')
    .limit(1);
  if (siblingError) {
    throw new Error(`paid-sibling lookup failed: ${safeErrorMessage(siblingError)}`);
  }
  if (paidSiblings && paidSiblings.length > 0) return { skipped: 'already_paid' };

  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('id, slug, title, status, seats_total, seats_taken')
    .eq('id', row.program_id)
    .maybeSingle();
  if (programError) {
    throw new Error(`program lookup failed: ${safeErrorMessage(programError)}`);
  }
  const programRow = program as ProgramRow | null;
  if (!programRow) return { skipped: 'program_not_found' };
  if (programRow.status !== 'open') return { skipped: 'program_not_open' };
  if (programRow.seats_total != null && (programRow.seats_taken ?? 0) >= programRow.seats_total) {
    return { skipped: 'sold_out' };
  }

  // Phone is normalised the same way sales intake does (src/lib/sales/phone.ts),
  // so a do-not-contact entry recorded against the E.164 form still matches.
  // `isSuppressedOrThrow` (not `isSuppressed`) fails closed: a lookup error
  // throws so Inngest retries, instead of a DB blip reading as "not
  // suppressed" and emailing someone who asked not to be contacted.
  const phoneE164 = toE164(row.buyer_phone);
  if (await isSuppressedOrThrow({ email: row.buyer_email, phoneE164 })) {
    return { skipped: 'suppressed' };
  }

  const resend = getResend();
  if (!resend) return { skipped: 'resend_not_configured' };

  const email = renderCheckoutReminderEmail({
    buyerName: row.buyer_name,
    programTitle: programRow.title,
    programSlug: programRow.slug,
  });

  const { error: sendError } = await resend.emails.send(
    {
      from: process.env.SALES_FROM_EMAIL || SALES_FROM_DEFAULT,
      to: row.buyer_email,
      replyTo: process.env.SALES_REPLY_TO || process.env.NOTIFICATION_EMAIL || undefined,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [{ name: 'template', value: 'academy_checkout_reminder' }],
    },
    // A retried step that already reached Resend sends nothing new (Resend
    // keeps idempotency keys for 24 hours) — the same guard sendSalesEmail uses.
    { idempotencyKey: checkoutReminderEventId(enrollmentId) }
  );
  if (sendError) {
    // Throwing lets Inngest retry a transient Resend failure, the same as sendSalesEmail.
    console.error('[academy] checkout-reminder send failed:', safeErrorLog(sendError));
    throw new Error(`Resend send failed: ${safeErrorMessage(sendError)}`);
  }

  return { sent: true };
}
