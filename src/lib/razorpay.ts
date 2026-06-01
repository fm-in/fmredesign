/**
 * Razorpay client singleton + helpers.
 *
 * Used by FM Academy enroll endpoint to create an order and by the
 * webhook handler to verify incoming events. Keep this server-only —
 * the key_secret must never reach the bundle.
 */

import crypto from 'node:crypto';
import Razorpay from 'razorpay';

let _razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      throw new Error(
        'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set — cannot create Razorpay client.'
      );
    }
    _razorpay = new Razorpay({ key_id, key_secret });
  }
  return _razorpay;
}

export interface CreateOrderInput {
  amountInr: number;     // rupees (will be ×100 for paise internally)
  receipt: string;       // our enrollment id — surfaces in Razorpay dashboard
  notes?: Record<string, string>;
}

/** Create a Razorpay order. Returns the order id + raw response. */
export async function createOrder(input: CreateOrderInput): Promise<{
  id: string;
  amount: number;
  currency: string;
}> {
  const rzp = getRazorpay();
  const order = await rzp.orders.create({
    amount: Math.round(input.amountInr * 100),
    currency: 'INR',
    receipt: input.receipt,
    notes: input.notes,
    payment_capture: true,
  });
  return {
    id: order.id,
    amount: typeof order.amount === 'string' ? Number(order.amount) : order.amount,
    currency: order.currency,
  };
}

/**
 * Verify a Razorpay webhook signature. Razorpay signs the raw request body
 * with the webhook secret (configured in Settings → Webhooks in the Razorpay
 * dashboard). We compare in constant time to avoid timing attacks.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('RAZORPAY_WEBHOOK_SECRET not set — refusing webhook');
    return false;
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Verify a Razorpay client-side payment success payload. Used as a defensive
 * second check in addition to the webhook — the client gets payment_id and
 * signature on success; both must match the order_id.
 */
export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex');
  const sigBuf = Buffer.from(input.signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
