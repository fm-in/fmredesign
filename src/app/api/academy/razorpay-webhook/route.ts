/**
 * Razorpay webhook receiver for FM Academy.
 *
 *   POST /api/academy/razorpay-webhook
 *
 * Razorpay calls this when a payment is captured (or fails / refunds). The
 * webhook secret is configured in the Razorpay dashboard → Settings →
 * Webhooks; we verify HMAC-SHA256(rawBody, secret) against the
 * `x-razorpay-signature` header.
 *
 * Idempotency: every event has a unique `id`. We insert into
 * `payment_events` first; a duplicate event id will fail the insert and we
 * short-circuit with 200.
 *
 * Side effects on `payment.captured`:
 *   - flip the matched enrollment to `status='paid'` (the SQL trigger then
 *     increments `programs.seats_taken`)
 *   - stamp razorpay_payment_id + paid_at
 *   - send confirmation email to buyer (with delivery URLs)
 *   - notify admin
 *
 * NOTE: Webhook MUST return 2xx within 5 seconds or Razorpay retries. We
 * keep the work synchronous (DB writes are fast) but fire email + admin
 * notification through Inngest so neither blocks the response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { inngest } from '@/lib/inngest/client';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { buildEnrollmentConfirmationEmail } from '@/lib/email/academy-confirmation';

// Razorpay needs the *raw* body for signature verification. App Router gives
// us request.text() to read it before any JSON parsing.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RazorpayEvent {
  id?: string;
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
        method?: string;
        email?: string;
        contact?: string;
      };
    };
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
      };
    };
  };
  created_at?: number;
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!verifyWebhookSignature(raw, signature)) {
    console.warn('Razorpay webhook signature check failed');
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw) as RazorpayEvent;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const eventId = event.id;
  const eventType = event.event;
  if (!eventId || !eventType) {
    return NextResponse.json({ ok: false, error: 'Missing event id/type' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Idempotency check — try to record the event first. PK collision on the
  // event id means we've already processed it; respond 200 so Razorpay stops
  // retrying.
  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;
  const orderId = payment?.order_id;
  const paymentId = payment?.id || refund?.payment_id;

  const { error: dupeErr } = await supabase.from('payment_events').insert({
    id: eventId,
    source: 'razorpay',
    event_type: eventType,
    razorpay_order_id: orderId || null,
    razorpay_payment_id: paymentId || null,
    payload: event as unknown as Record<string, unknown>,
  });

  if (dupeErr) {
    // 23505 = unique_violation → already processed.
    if ((dupeErr as { code?: string }).code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error('payment_events insert failed:', dupeErr);
    return NextResponse.json({ ok: false, error: 'Storage error' }, { status: 500 });
  }

  // Route by event type. Anything we don't act on still gets logged via
  // payment_events for future visibility.
  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    if (!orderId) {
      return NextResponse.json({ ok: true, skipped: 'no order_id on payload' });
    }
    await handlePaymentCaptured({ orderId, paymentId: paymentId || '', event });
  } else if (eventType === 'payment.failed') {
    if (orderId) await markFailed(orderId);
  } else if (eventType.startsWith('refund.')) {
    if (paymentId) await markRefunded(paymentId);
  }

  return NextResponse.json({ ok: true });
}

async function handlePaymentCaptured(opts: {
  orderId: string;
  paymentId: string;
  event: RazorpayEvent;
}): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .select('*, programs!inner(id, title, slug, format, starts_at, delivery_zoom_url, delivery_whatsapp_url, delivery_notion_url)')
    .eq('razorpay_order_id', opts.orderId)
    .maybeSingle();

  if (error) {
    console.error('Enrollment lookup error:', error);
    return;
  }
  if (!enrollment) {
    console.warn('Webhook received for unknown order_id', opts.orderId);
    return;
  }
  if (enrollment.status === 'paid') {
    // Defensive: trigger already ran on a prior identical webhook attempt.
    return;
  }

  const { error: updateErr } = await supabase
    .from('enrollments')
    .update({
      status: 'paid',
      razorpay_payment_id: opts.paymentId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollment.id)
    .eq('status', 'reserved');   // optimistic concurrency — don't double-credit

  if (updateErr) {
    console.error('Enrollment status update failed:', updateErr);
    return;
  }

  const program = enrollment.programs as {
    id: string; title: string; slug: string; format: string;
    starts_at?: string;
    delivery_zoom_url?: string;
    delivery_whatsapp_url?: string;
    delivery_notion_url?: string;
  } | null;

  // Confirmation email — async via Inngest so the webhook returns fast.
  if (program) {
    const email = buildEnrollmentConfirmationEmail({
      buyerName: enrollment.buyer_name as string,
      programTitle: program.title,
      programSlug: program.slug,
      programFormat: program.format,
      startsAt: program.starts_at,
      amountInr: Number(enrollment.amount_inr) || 0,
      deliveryZoomUrl: program.delivery_zoom_url,
      deliveryWhatsappUrl: program.delivery_whatsapp_url,
      deliveryNotionUrl: program.delivery_notion_url,
    });

    inngest
      .send({
        name: 'email/send',
        data: {
          to: enrollment.buyer_email as string,
          subject: email.subject,
          html: email.html,
        },
      })
      .catch((err) => console.error('Confirmation email send failed:', err));

    // Stamp invite_sent_at so admin sees it went out.
    supabase
      .from('enrollments')
      .update({ invite_sent_at: new Date().toISOString() })
      .eq('id', enrollment.id)
      .then(({ error: stampErr }) => {
        if (stampErr) console.error('invite_sent_at stamp failed:', stampErr);
      });

    inngest
      .send({
        name: 'notification/send',
        data: {
          recipientType: 'admin' as const,
          type: 'general' as const,
          title: 'Academy payment received',
          message: `${enrollment.buyer_name} paid ₹${enrollment.amount_inr} for ${program.title}.`,
          priority: 'high' as const,
          actionUrl: '/admin/academy/enrollments',
        },
      })
      .catch((err) => console.error('Admin notification failed:', err));
  }
}

async function markFailed(orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('enrollments')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('razorpay_order_id', orderId)
    .eq('status', 'reserved');
  if (error) console.error('Mark-failed error:', error);
}

async function markRefunded(paymentId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('enrollments')
    .update({ status: 'refunded', updated_at: new Date().toISOString() })
    .eq('razorpay_payment_id', paymentId);
  if (error) console.error('Mark-refunded error:', error);
}
