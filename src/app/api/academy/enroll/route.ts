/**
 * Public FM Academy — Reserve seat + create Razorpay order.
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
 *         razorpay: { orderId, amount, currency, keyId }   // Phase 2
 *       }
 *     }
 *
 *   - Validates the program is `open` and (if seats are bounded) not sold out.
 *   - Inserts an enrollment row with status='reserved'.
 *   - Creates a Razorpay order and writes the order_id back to the row so the
 *     webhook can look up the enrollment on `payment.captured`.
 *   - Notifies admin via Inngest so the new lead surfaces in the dashboard.
 *
 * No auth — this is the public conversion endpoint. We rate-limit by email
 * + program (one pending reservation per buyer per program) to keep abuse
 * / accidental duplicates in check without blocking legitimate retries.
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';
import { inngest } from '@/lib/inngest/client';
import {
  generateEnrollmentId,
  transformEnrollmentRow,
} from '@/lib/admin/academy-types';
import { createOrder } from '@/lib/razorpay';

function isLikelyEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return ApiResponse.validationError('Invalid JSON body');
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

  // Idempotent retry: if the same buyer already has a paid or reserved
  // enrollment for this program, return that row. Paid → no new order; the
  // form will show the "already enrolled" state. Reserved → reuse the
  // existing order so refresh-then-resubmit doesn't make duplicate orders.
  const { data: existing } = await supabase
    .from('enrollments')
    .select('*')
    .eq('program_id', programId)
    .eq('buyer_email', buyerEmail)
    .in('status', ['reserved', 'paid'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    const row = existing[0];
    if (row.status === 'paid') {
      return ApiResponse.success(transformEnrollmentRow(row), {
        message: 'You are already enrolled.',
      });
    }
    // Reserved but with an existing order — reuse it.
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
  }

  // Server-derived amount — the buyer's posted amount is ignored. The DB is
  // the source of truth for what the seat costs right now.
  const earlyBirdActive =
    !!program.early_bird_price_inr &&
    !!program.early_bird_until &&
    new Date(program.early_bird_until as string).getTime() > Date.now();
  const amountInr = earlyBirdActive
    ? Number(program.early_bird_price_inr)
    : Number(program.price_inr);

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

  const { data: inserted, error: insertErr } = await supabase
    .from('enrollments')
    .insert(record)
    .select()
    .single();

  if (insertErr || !inserted) {
    console.error('Enrollment insert error:', insertErr);
    return ApiResponse.error('Could not create reservation');
  }

  // Create the Razorpay order. If this fails the reservation row is left in
  // place (admin can still process manually via Phase 1 fallback). We return
  // the error to the client so they don't see a stuck modal.
  let razorpayMeta: { orderId: string; amount: number; currency: string; keyId: string } | null = null;
  try {
    const order = await createOrder({
      amountInr,
      receipt: id,
      notes: {
        program_id: programId,
        program_title: (program.title as string) || '',
        buyer_email: buyerEmail,
        enrollment_id: id,
      },
    });

    await supabase
      .from('enrollments')
      .update({ razorpay_order_id: order.id, updated_at: new Date().toISOString() })
      .eq('id', id);

    razorpayMeta = {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '',
    };
  } catch (rzpErr) {
    console.error('Razorpay order create failed:', rzpErr);
    // Don't fail the request — admin can still mark this reservation as paid
    // manually if the buyer pays via Payment Link instead.
  }

  // Admin notification — non-fatal.
  inngest
    .send({
      name: 'notification/send',
      data: {
        recipientType: 'admin' as const,
        type: 'general' as const,
        title: 'New academy reservation',
        message: `${buyerName} (${buyerEmail}) reserved a seat in ${program.title}.`,
        priority: 'normal' as const,
        actionUrl: '/admin/academy/enrollments',
      },
    })
    .catch((err) => console.error('Inngest notification failed:', err));

  return ApiResponse.success(
    transformEnrollmentRow({ ...inserted, razorpay_order_id: razorpayMeta?.orderId }),
    razorpayMeta ? { razorpay: razorpayMeta } : undefined
  );
}
