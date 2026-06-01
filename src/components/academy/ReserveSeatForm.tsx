/**
 * Reserve Seat form — public-facing CTA on each program detail page.
 *
 * Flow (Phase 2):
 *   1. Submit hits /api/academy/enroll → creates a `reserved` enrollment row
 *      and a Razorpay order in the same call.
 *   2. Response includes `razorpay.orderId/keyId/amount` — we load the
 *      checkout.js script (if not already loaded) and open the Razorpay
 *      modal.
 *   3. Razorpay's success handler is informational only. The actual
 *      transition to `paid` happens server-side via the webhook handler at
 *      /api/academy/razorpay-webhook (single source of truth, immune to
 *      client tampering).
 *
 * Fallback: if the API returns no `razorpay` block (e.g. order creation
 * failed or program has no price → manual flow), and a `paymentLinkUrl` is
 * configured on the program, we open that in a new tab — same UX as
 * Phase 1 so we degrade cleanly.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;        // paise
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

interface ReserveSeatFormProps {
  programId: string;
  programTitle: string;
  paymentLinkUrl?: string;
  amountInr: number;
}

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function ReserveSeatForm({
  programId,
  programTitle,
  paymentLinkUrl,
  amountInr,
}: ReserveSeatFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paid, setPaid] = useState(false);
  const [reserved, setReserved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submittedRef = useRef(false);

  // Preload the Razorpay script on mount so the modal opens instantly
  // when the buyer submits. Non-blocking — failures are handled at submit.
  useEffect(() => {
    loadRazorpayScript().catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    if (!name.trim() || !email.trim()) {
      setErr('Name and email are required.');
      return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    setErr(null);

    try {
      const res = await fetch('/api/academy/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          buyerName: name.trim(),
          buyerEmail: email.trim(),
          buyerPhone: phone.trim() || undefined,
          buyerCompany: company.trim() || undefined,
          buyerMessage: message.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setErr(json.error || 'Could not reserve seat — please try again.');
        return;
      }

      // Buyer already enrolled (idempotent path returned an existing 'paid' row).
      if (json.data?.status === 'paid') {
        setPaid(true);
        return;
      }

      const rzp = json.razorpay as
        | { orderId: string; amount: number; currency: string; keyId: string }
        | undefined;

      if (rzp?.orderId && rzp.keyId) {
        await openRazorpayModal({
          orderId: rzp.orderId,
          amount: rzp.amount,
          currency: rzp.currency,
          keyId: rzp.keyId,
          programTitle,
          prefill: { name: name.trim(), email: email.trim(), contact: phone.trim() || undefined },
        });
        // openRazorpayModal handles success → setPaid(true) inside.
        return;
      }

      // Fallback to manual payment link if the server couldn't create an order.
      setReserved(true);
      if (paymentLinkUrl) {
        window.open(paymentLinkUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setErr('Network error — please try again.');
    } finally {
      setSubmitting(false);
      submittedRef.current = false;
    }
  };

  async function openRazorpayModal(opts: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    programTitle: string;
    prefill: { name?: string; email?: string; contact?: string };
  }) {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setErr('Could not load the payment widget — please refresh and try again.');
      return;
    }

    const rzp = new window.Razorpay({
      key: opts.keyId,
      amount: opts.amount,
      currency: opts.currency,
      name: 'Freaking Minds',
      description: opts.programTitle,
      order_id: opts.orderId,
      prefill: opts.prefill,
      theme: { color: '#c9325d' },
      handler: () => {
        // Source of truth = webhook. We optimistically show success but the
        // backend will flip 'paid' independently within a few seconds.
        setPaid(true);
      },
      modal: {
        ondismiss: () => {
          // Buyer closed the modal without paying — leave the reservation
          // in place so they can retry, but show the "reserved" state.
          setReserved(true);
        },
      },
    });
    rzp.open();
  }

  if (paid) {
    return (
      <div className="space-y-3" style={{ textAlign: 'center' }}>
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <h4 className="font-semibold text-fm-neutral-900">You&rsquo;re in!</h4>
        <p className="text-sm text-fm-neutral-600">
          Your seat in <strong>{programTitle}</strong> is confirmed.
          A welcome email with the next steps is on its way.
        </p>
      </div>
    );
  }

  if (reserved) {
    return (
      <div className="space-y-3" style={{ textAlign: 'center' }}>
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <h4 className="font-semibold text-fm-neutral-900">Seat reserved</h4>
        <p className="text-sm text-fm-neutral-600">
          We&apos;ve held your spot in <strong>{programTitle}</strong>.
          Complete the payment to confirm your seat — our team will follow up if needed.
        </p>
        {paymentLinkUrl && (
          <a
            href={paymentLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="v2-btn v2-btn-magenta w-full"
            style={{ textAlign: 'center' }}
          >
            Re-open payment page
          </a>
        )}
      </div>
    );
  }

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-fm-neutral-200 bg-white text-fm-neutral-900 text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        className={inputCls}
        placeholder="Your name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoComplete="name"
      />
      <input
        type="email"
        className={inputCls}
        placeholder="Email *"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <input
        type="tel"
        className={inputCls}
        placeholder="Phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
      />
      <input
        type="text"
        className={inputCls}
        placeholder="Company / college (optional)"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        autoComplete="organization"
      />
      <textarea
        className={inputCls}
        rows={2}
        placeholder="Why do you want to join? (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {err && <p className="text-xs text-red-700">{err}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="v2-btn v2-btn-magenta w-full inline-flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Reserve & pay {formatInr(amountInr)}
      </button>

      <p className="text-[11px] text-fm-neutral-500" style={{ textAlign: 'center' }}>
        Secure payment by Razorpay — UPI, cards, netbanking & wallets accepted.
      </p>
    </form>
  );
}

function formatInr(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);
}
