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
 *       data: <enrollment>,
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

import { NextRequest, after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';
import { inngest } from '@/lib/inngest/client';
import {
  generateEnrollmentId,
  transformEnrollmentRow,
} from '@/lib/admin/academy-types';
import { checkoutReminderEventId } from '@/lib/academy/checkout-reminder';
import { createOrder } from '@/lib/razorpay';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';
import { captureMeta, isMissingColumnError } from '@/lib/capture-meta';
import { checkSpam, HONEYPOT_FIELD } from '@/lib/spam-guard';
import { notifyAdmins } from '@/lib/notifications';
import { safeErrorLog, safeErrorMessage } from '@/lib/safe-log';
import { likeLiteral } from '@/lib/postgrest';

interface RazorpayMeta {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

function isLikelyEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * Fires `academy/checkout.started` for a brand-new enrollment row so
 * `academyCheckoutReminderFn` can send one reminder an hour later if the
 * buyer still hasn't paid. Deferred via `after()` (as POST /api/leads does
 * for its confirmation receipt) so a slow or failed event send never delays
 * or changes the response; a failure is logged by message only.
 */
function dispatchCheckoutReminder(enrollmentId: string): void {
  const send = () =>
    inngest
      .send({
        id: checkoutReminderEventId(enrollmentId),
        name: 'academy/checkout.started',
        data: { enrollmentId },
      })
      .catch((err) => console.error('[enroll] checkout-reminder event send failed:', safeErrorMessage(err)));

  try {
    after(send);
  } catch {
    // after() unavailable outside a request scope — fire and forget instead.
    void send();
  }
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
  // `buyerEmail` was already trimmed and lowercased above; matching here with
  // an escaped `ilike` (rather than `eq`) also catches a stored row whose
  // email carries different case — the same defensive pattern
  // src/lib/sales/suppression.ts uses for the do-not-contact list.
  const { data: existing } = await supabase
    .from('enrollments')
    .select('*')
    .eq('program_id', programId)
    .ilike('buyer_email', likeLiteral(buyerEmail))
    .in('status', ['reserved', 'failed', 'paid'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    const row = existing[0];
    if (row.status === 'paid') {
      return ApiResponse.success(transformEnrollmentRow(row), {
        message: 'You are already enrolled.',
      });
    }
    // Reserved or failed but with an existing order — reuse it.
    if (row.razorpay_order_id) {
      return ApiResponse.success(transformEnrollmentRow(row), {
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
      transformEnrollmentRow({
        ...row,
        razorpay_order_id: razorpayMeta?.orderId,
        amount_inr: razorpayMeta ? amountInr : row.amount_inr,
      }),
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
    return ApiResponse.error('Could not create reservation');
  }

  // A brand-new row only: the retry paths above return before reaching here,
  // so this never double-schedules a reminder for a row that already exists.
  dispatchCheckoutReminder(id);

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
    transformEnrollmentRow({ ...inserted, razorpay_order_id: razorpayMeta?.orderId }),
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
 * Create a Razorpay order for an existing enrollment row and write the order
 * id (and today's price) back onto it. Returns null — never throws — on
 * failure, so the caller can fall back to "checkout unavailable" without
 * losing the reservation row.
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

    await supabase
      .from('enrollments')
      .update({
        razorpay_order_id: order.id,
        amount_inr: opts.amountInr,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opts.enrollmentId);

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
