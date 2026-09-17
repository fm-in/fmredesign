/**
 * Public FM Academy — direct payment only. Creates (or reuses) an enrollment
 * row and a Razorpay order in one call; there is no manual/payment-link path.
 * A seat counts only once the webhook flips the row to `paid` — until then it
 * shows as "Payment pending" (stored status stays `reserved`).
 *
 *   POST /api/academy/enroll
 *   body: { programId, buyerName, buyerEmail, buyerPhone?, buyerCompany?,
 *           buyerMessage? }
 *
 *   Response:
 *     {
 *       success: true,
 *       data: { id, status },      // never buyer fields, notes or Razorpay ids —
 *                                   // this is a public, unauthenticated endpoint,
 *                                   // and an email lookup means an attacker who
 *                                   // guesses (or already knows) an address must
 *                                   // learn nothing else about that buyer from it
 *       meta: {
 *         razorpay: { orderId, amount, currency, keyId }   // absent when
 *                                                           // checkout could
 *                                                           // not be opened
 *       }
 *     }
 *
 *   - Validates the program is `open` and (if seats are bounded) not sold out.
 *   - Inserts an enrollment row with status='reserved'.
 *   - Creates a Razorpay order and writes the order_id back to the row so the
 *     webhook can look up the enrollment on `payment.captured`.
 *   - Notifies admins so the new checkout surfaces in the dashboard.
 *
 * No auth — this is the public conversion endpoint. Three layers of abuse
 * control: a per-IP rate limit (3/min), a honeypot + email-pattern spam
 * filter (see `@/lib/spam-guard`), and per-email idempotency (one pending
 * reservation per buyer per program) so legitimate retries are not blocked.
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';
import { inngest } from '@/lib/inngest/client';
import { generateEnrollmentId } from '@/lib/admin/academy-types';
import { checkoutReminderEventId } from '@/lib/academy/checkout-reminder';
import { createOrder } from '@/lib/razorpay';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';
import { captureMeta, isMissingColumnError } from '@/lib/capture-meta';
import { checkSpam, HONEYPOT_FIELD } from '@/lib/spam-guard';
import { notifyAdmins } from '@/lib/notifications';
import { afterResponse } from '@/lib/sales/transactional-email';
import { safeErrorLog, safeErrorMessage } from '@/lib/safe-log';

interface RazorpayMeta {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

// `*` is a valid character in an email local-part, but PostgREST reads it as
// an `ilike`/`like` wildcard with no way to escape it. This route no longer
// uses `ilike` (see the retry lookup below), but a plain, defensive reject
// here means a stray wildcard can never reach any query in this file, now or
// after a future edit.
function isLikelyEmail(s: string): boolean {
  return !s.includes('*') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Only what the public form reads back (`data.status`, plus the separate
 *  `razorpay` meta) — never buyer contact details, admin notes or Razorpay
 *  ids. This is an unauthenticated endpoint keyed on an email address the
 *  caller supplies, so the response must never let a lookup double as a way
 *  to read another buyer's row. */
function publicEnrollment(row: Record<string, unknown>): { id: string; status: string } {
  return { id: row.id as string, status: row.status as string };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return ApiResponse.validationError('Invalid JSON body');
  }

  // Rate limit before any DB work. Matches /api/leads (5/min) and
  // /api/talent (3/min); enrollment is a deliberate action, so 3 is ample.
  const clientIp = getClientIp(request);
  if (!rateLimit(clientIp, 3)) {
    return ApiResponse.error('Too many requests. Please try again in a minute.', 429);
  }

  // Bot filter. Returns the same shape as a validation failure so a bot
  // learns nothing about why it was turned away.
  const spam = checkSpam({
    honeypot: body[HONEYPOT_FIELD],
    email: body.buyerEmail as string,
    name: body.buyerName as string,
  });
  // Logs carry the reason and IP, never the buyer's address or phone.
  if (spam.isSpam) {
    console.warn(`[enroll] rejected submission — ${spam.reason}`, { ip: clientIp });
    return ApiResponse.validationError('A valid email is required');
  }
  if (spam.suspicions.length > 0) {
    console.warn('[enroll] accepted with suspicions', {
      ip: clientIp,
      suspicions: spam.suspicions,
    });
  }

  const programId = (body.programId as string)?.trim();
  const buyerName = (body.buyerName as string)?.trim();
  const buyerEmail = (body.buyerEmail as string)?.trim().toLowerCase();
  if (!programId) return ApiResponse.validationError('programId is required');
  if (!buyerName) return ApiResponse.validationError('Your name is required');
  if (!buyerEmail || !isLikelyEmail(buyerEmail)) {
    return ApiResponse.validationError('A valid email is required');
  }

  const supabase = getSupabaseAdmin();

  const { data: program, error: programErr } = await supabase
    .from('programs')
    .select('id, title, status, price_inr, early_bird_price_inr, early_bird_until, currency, seats_total, seats_taken')
    .eq('id', programId)
    .single();

  if (programErr || !program) return ApiResponse.notFound('Program not found');
  if (program.status !== 'open') {
    return ApiResponse.error('This program is not currently open for enrollment', 410);
  }
  if (
    program.seats_total != null &&
    (program.seats_taken || 0) >= program.seats_total
  ) {
    return ApiResponse.error('Sold out — no seats remaining', 410);
  }

  // Idempotent retry: if this buyer already has a row for this program,
  // reuse it instead of creating another.
  //   paid                             → unchanged: "You are already enrolled."
  //   reserved / failed, with an order → return that order (retry payment).
  //   reserved / failed, no order yet  → an earlier order creation failed;
  //     create one now for this same row (never insert a new row).
  // `buyerEmail` was already trimmed and lowercased above, and every row this
  // route has ever written stores a lowercased email, so a plain `.eq()`
  // already finds it. An `ilike` here previously let an anonymous caller
  // enumerate any buyer's row with a wildcard (`buyerEmail: "*@*.*"` — the
  // pattern PostgREST builds from an escaped literal — matches everyone,
  // since `*` itself is read as `%` and cannot be escaped); an old row whose
  // stored email differs only in case simply won't be matched.
  //
  // A `paid` row is checked first, on its own, and takes priority regardless
  // of recency: the second query below only ever returns `reserved`/`failed`
  // rows, so a newer unpaid row (e.g. a stale duplicate from before this
  // route reused rows) can never be picked over an older `paid` one.
  const { data: paidRows } = await supabase
    .from('enrollments')
    .select('*')
    .eq('program_id', programId)
    .eq('buyer_email', buyerEmail)
    .eq('status', 'paid')
    .limit(1);

  if (paidRows && paidRows.length > 0) {
    return ApiResponse.success(publicEnrollment(paidRows[0]), {
      message: 'You are already enrolled.',
    });
  }

  const { data: existing } = await supabase
    .from('enrollments')
    .select('*')
    .eq('program_id', programId)
    .eq('buyer_email', buyerEmail)
    .in('status', ['reserved', 'failed'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    const row = existing[0];
    // Reserved or failed but with an existing order — reuse it.
    if (row.razorpay_order_id) {
      return ApiResponse.success(publicEnrollment(row), {
        razorpay: {
          orderId: row.razorpay_order_id as string,
          amount: Math.round((Number(row.amount_inr) || 0) * 100),
          currency: (row.currency as string) || 'INR',
          keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '',
        },
      });
    }

    // No order yet — an earlier order creation attempt failed. Create one now
    // for this same row, at today's server-derived price.
    const amountInr = deriveAmountInr(program);
    if (!amountInr || amountInr <= 0) {
      return ApiResponse.error('This program has no price configured — please contact the team', 409);
    }
    const razorpayMeta = await attemptCreateOrder({
      enrollmentId: row.id as string,
      programId,
      programTitle: (program.title as string) || '',
      buyerEmail,
      amountInr,
    });
    return ApiResponse.success(
      publicEnrollment(row),
      razorpayMeta ? { razorpay: razorpayMeta } : undefined
    );
  }

  // Server-derived amount — the buyer's posted amount is ignored. The DB is
  // the source of truth for what the seat costs right now.
  const amountInr = deriveAmountInr(program);
  if (!amountInr || amountInr <= 0) {
    return ApiResponse.error('This program has no price configured — please contact the team', 409);
  }

  const id = generateEnrollmentId();
  const record = {
    id,
    program_id: programId,
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    buyer_phone: (body.buyerPhone as string)?.trim() || null,
    buyer_company: (body.buyerCompany as string)?.trim() || null,
    buyer_message: (body.buyerMessage as string)?.trim() || null,
    amount_inr: amountInr,
    currency: (program.currency as string) || 'INR',
    status: 'reserved' as const,
  };

  // See leads route: attribution is best-effort, the reservation is not.
  let { data: inserted, error: insertErr } = await supabase
    .from('enrollments')
    .insert({ ...record, ...captureMeta(request) })
    .select()
    .single();

  if (insertErr && isMissingColumnError(insertErr)) {
    console.warn(
      '[enroll] capture-metadata columns absent — apply migrations/2026-08-10-capture-metadata.sql'
    );
    ({ data: inserted, error: insertErr } = await supabase
      .from('enrollments')
      .insert(record)
      .select()
      .single());
  }

  if (insertErr || !inserted) {
    // Code and message only: a Postgres error's `details` can quote the whole row.
    console.error('Enrollment insert error:', insertErr ? safeErrorLog(insertErr) : 'no row returned');
    return ApiResponse.error('Could not start checkout — please try again.');
  }

  // A brand-new row only: the retry paths above return before reaching here,
  // so this never double-schedules a reminder for a row that already exists.
  // Deferred via `afterResponse()` (as POST /api/leads does for its
  // confirmation receipt) so a slow or failed event send never delays or
  // changes the response.
  afterResponse('checkout-reminder event send', () =>
    inngest.send({
      id: checkoutReminderEventId(id),
      name: 'academy/checkout.started',
      data: { enrollmentId: id },
    })
  );

  // Surface the checkout in the admin dashboard. The header used to claim
  // this happened via Inngest, but no notification was ever sent — every
  // enrolment since launch landed silently in the table.
  notifyAdmins({
    type: 'general',
    title: 'Academy checkout started',
    message: `${buyerName} started checkout for ${(program.title as string) || programId}.`,
    priority: 'normal',
    actionUrl: '/admin/academy/enrollments',
  });

  // Create the Razorpay order. If this fails the reservation row is left in
  // place — the client falls back to the "checkout unavailable" state and the
  // buyer can retry, which reuses this same row (see the retry block above).
  const razorpayMeta = await attemptCreateOrder({
    enrollmentId: id,
    programId,
    programTitle: (program.title as string) || '',
    buyerEmail,
    amountInr,
  });

  // Admin notification — non-fatal.
  inngest
    .send({
      name: 'notification/send',
      data: {
        recipientType: 'admin' as const,
        type: 'general' as const,
        title: 'Academy checkout started',
        message: `${buyerName} started checkout for ${program.title}.`,
        priority: 'normal' as const,
        actionUrl: '/admin/academy/enrollments',
      },
    })
    .catch((err) => console.error('Inngest notification failed:', safeErrorMessage(err)));

  return ApiResponse.success(
    publicEnrollment(inserted),
    razorpayMeta ? { razorpay: razorpayMeta } : undefined
  );
}

/** Server-derived price for a program row: early-bird when active, else list price. */
function deriveAmountInr(program: {
  price_inr: unknown;
  early_bird_price_inr: unknown;
  early_bird_until: unknown;
}): number {
  const earlyBirdActive =
    !!program.early_bird_price_inr &&
    !!program.early_bird_until &&
    new Date(program.early_bird_until as string).getTime() > Date.now();
  return earlyBirdActive ? Number(program.early_bird_price_inr) : Number(program.price_inr);
}

/**
 * Create a Razorpay order for an enrollment row and write the order id (and
 * today's price) back onto it — but only if the row is still order-less.
 * Returns null — never throws — on failure, so the caller can fall back to
 * "checkout unavailable" without losing the reservation row.
 *
 * The write is conditional (`.is('razorpay_order_id', null)`) because this
 * runs on the retry path too: two concurrent retries on the same order-less
 * row would otherwise both create a Razorpay order here, and an
 * unconditional last-write-wins would silently orphan whichever order lost —
 * the buyer holding that order id would pay into a slot the row no longer
 * points at. Whichever call loses the race (zero rows updated) re-reads the
 * row and returns the order that actually stuck, instead of the one it just
 * created.
 */
async function attemptCreateOrder(opts: {
  enrollmentId: string;
  programId: string;
  programTitle: string;
  buyerEmail: string;
  amountInr: number;
}): Promise<RazorpayMeta | null> {
  const supabase = getSupabaseAdmin();
  try {
    const order = await createOrder({
      amountInr: opts.amountInr,
      receipt: opts.enrollmentId,
      notes: {
        program_id: opts.programId,
        program_title: opts.programTitle,
        buyer_email: opts.buyerEmail,
        enrollment_id: opts.enrollmentId,
      },
    });

    const { data: updated, error: updateErr } = await supabase
      .from('enrollments')
      .update({
        razorpay_order_id: order.id,
        amount_inr: opts.amountInr,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opts.enrollmentId)
      .is('razorpay_order_id', null)
      .select('id');

    if (updateErr) {
      // The order exists in Razorpay but the row never learned its id — if we
      // returned it anyway, the webhook would later see payment.captured for
      // an order_id no row carries (200, "unknown order_id"): captured money,
      // no seat, no confirmation. Safer to tell the buyer checkout is
      // unavailable and let them retry, which re-reads this same row.
      console.error('Razorpay order write-back failed:', safeErrorLog(updateErr));
      return null;
    }

    if (!updated || updated.length === 0) {
      // Lost the race: some other call (a concurrent retry) already wrote an
      // order onto this row between our read and this write. Re-read and
      // return that order instead of the one we just created, so the order
      // we made here — which no row will ever point at — is simply unused
      // rather than orphaning the other buyer's checkout.
      const { data: current, error: reReadErr } = await supabase
        .from('enrollments')
        .select('razorpay_order_id, amount_inr, currency')
        .eq('id', opts.enrollmentId)
        .maybeSingle();
      if (reReadErr || !current?.razorpay_order_id) {
        console.error(
          'Razorpay order re-read after a lost write race failed:',
          reReadErr ? safeErrorLog(reReadErr) : 'no stored order found on re-read'
        );
        return null;
      }
      return {
        orderId: current.razorpay_order_id as string,
        amount: Math.round((Number(current.amount_inr) || 0) * 100),
        currency: (current.currency as string) || 'INR',
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '',
      };
    }

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '',
    };
  } catch (rzpErr) {
    // Log structured detail so a future debug session has enough to triage
    // without bouncing back to "Unknown error".
    const err = rzpErr as { message?: string; statusCode?: number; error?: { description?: string; code?: string; reason?: string } };
    console.error('Razorpay order create failed:', {
      message: err?.message ? safeErrorMessage(err.message) : undefined,
      statusCode: err?.statusCode,
      description: err?.error?.description ? safeErrorMessage(err.error.description) : undefined,
      code: err?.error?.code,
      reason: err?.error?.reason,
    });
    return null;
  }
}
