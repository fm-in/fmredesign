/**
 * Reserve Seat form — public-facing CTA on each program detail page.
 *
 * Flow (Phase 2 — Razorpay Checkout):
 *   1. Submit → POST /api/academy/enroll → creates a `reserved` enrollment
 *      row AND a Razorpay order in one call.
 *   2. Response includes `razorpay.{orderId, keyId, amount}`. We load
 *      checkout.js (preloaded on mount) and open the Razorpay modal.
 *   3. Razorpay's `handler` callback runs on success — we flip to the
 *      success state. Source of truth for `paid` status is the webhook at
 *      /api/academy/razorpay-webhook, which auto-flips the row server-side.
 *   4. Razorpay's `ondismiss` runs on cancel — we flip to a cancelled
 *      state showing a retry CTA. (We DO NOT show a green "Seat reserved"
 *      success card on dismiss — that misled buyers into thinking they had
 *      a seat without paying.)
 *
 * Fallback: if the server can't create an order (Razorpay outage, missing
 * keys, etc.) and the program has a manual `paymentLinkUrl`, we open
 * that in a new tab and show the manual flow.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

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
  modal?: { ondismiss?: () => void; escape?: boolean };
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

type Phase =
  | 'idle'              // empty form
  | 'submitting'        // POST in flight
  | 'awaiting_payment'  // Razorpay modal is/was open
  | 'cancelled'         // buyer closed the modal without paying
  | 'paid'              // payment success (client side — webhook confirms)
  | 'manual_fallback';  // Razorpay couldn't open; admin will follow up

interface PendingOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  prefill: { name?: string; email?: string; contact?: string };
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
  const [phase, setPhase] = useState<Phase>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const submittedRef = useRef(false);

  // Preload checkout.js on mount so the modal opens instantly on submit.
  useEffect(() => {
    loadRazorpayScript().catch(() => {});
  }, []);

  const openModal = useCallback((order: PendingOrder) => {
    if (typeof window === 'undefined' || !window.Razorpay) {
      setErr('Could not load the payment widget — refresh and try again.');
      setPhase('cancelled');
      return;
    }
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'Freaking Minds',
      description: programTitle,
      order_id: order.orderId,
      prefill: order.prefill,
      theme: { color: '#c9325d' },
      handler: () => {
        // Client-side success. The webhook is the actual source of truth
        // and will flip the row to `paid` server-side within seconds.
        setPhase('paid');
        setErr(null);
      },
      modal: {
        ondismiss: () => {
          // Buyer closed without paying. Their reservation is held but
          // the seat is NOT confirmed — make that explicit.
          setPhase('cancelled');
        },
      },
    });
    rzp.open();
    setPhase('awaiting_payment');
  }, [programTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    if (!name.trim() || !email.trim()) {
      setErr('Name and email are required.');
      return;
    }
    submittedRef.current = true;
    setPhase('submitting');
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
        setPhase('idle');
        return;
      }

      // Idempotent return: server says this buyer is already paid.
      if (json.data?.status === 'paid') {
        setPhase('paid');
        return;
      }

      const rzp = json.razorpay as
        | { orderId: string; amount: number; currency: string; keyId: string }
        | undefined;

      if (rzp?.orderId && rzp.keyId) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          setErr('Could not load the payment widget — refresh and try again.');
          setPhase('cancelled');
          return;
        }
        const order: PendingOrder = {
          ...rzp,
          prefill: { name: name.trim(), email: email.trim(), contact: phone.trim() || undefined },
        };
        setPendingOrder(order);
        openModal(order);
        return;
      }

      // Server couldn't create the Razorpay order — fall back to manual flow.
      setPhase('manual_fallback');
      if (paymentLinkUrl) {
        window.open(paymentLinkUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setErr('Network error — please try again.');
      setPhase('idle');
    } finally {
      submittedRef.current = false;
    }
  };

  const retryPayment = () => {
    setErr(null);
    if (pendingOrder) {
      openModal(pendingOrder);
    }
  };

  // ── Phase: paid ───────────────────────────────────────────
  if (phase === 'paid') {
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

  // ── Phase: cancelled (modal dismissed) ────────────────────
  if (phase === 'cancelled') {
    return (
      <div className="space-y-3" style={{ textAlign: 'center' }}>
        <XCircle className="w-10 h-10 text-amber-600 mx-auto" />
        <h4 className="font-semibold text-fm-neutral-900">Payment not completed</h4>
        <p className="text-sm text-fm-neutral-600">
          You closed the payment window before finishing. Your seat in{' '}
          <strong>{programTitle}</strong> isn&rsquo;t confirmed yet.
        </p>
        {err && <p className="text-xs text-red-700">{err}</p>}
        {pendingOrder && (
          <button
            type="button"
            onClick={retryPayment}
            className="v2-btn v2-btn-magenta w-full inline-flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Retry payment
          </button>
        )}
        <p className="text-[11px] text-fm-neutral-500">
          Trouble paying? Email us at{' '}
          <a href="mailto:freakingmindsdigital@gmail.com" className="text-fm-magenta-600 hover:underline">
            freakingmindsdigital@gmail.com
          </a>
        </p>
      </div>
    );
  }

  // ── Phase: manual_fallback (server couldn't create order) ──
  if (phase === 'manual_fallback') {
    return (
      <div className="space-y-3" style={{ textAlign: 'center' }}>
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <h4 className="font-semibold text-fm-neutral-900">Reservation received</h4>
        <p className="text-sm text-fm-neutral-600">
          We&rsquo;ve held your interest in <strong>{programTitle}</strong>.
          Our team will email a secure payment link shortly.
        </p>
        {paymentLinkUrl && (
          <a
            href={paymentLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="v2-btn v2-btn-magenta w-full"
            style={{ textAlign: 'center' }}
          >
            Open payment page
          </a>
        )}
      </div>
    );
  }

  // ── Phase: idle / submitting / awaiting_payment (form visible) ──
  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-fm-neutral-200 bg-white text-fm-neutral-900 text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent disabled:opacity-50';
  const formDisabled = phase === 'submitting' || phase === 'awaiting_payment';

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
        disabled={formDisabled}
      />
      <input
        type="email"
        className={inputCls}
        placeholder="Email *"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        disabled={formDisabled}
      />
      <input
        type="tel"
        className={inputCls}
        placeholder="Phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
        disabled={formDisabled}
      />
      <input
        type="text"
        className={inputCls}
        placeholder="Company / college (optional)"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        autoComplete="organization"
        disabled={formDisabled}
      />
      <textarea
        className={inputCls}
        rows={2}
        placeholder="Why do you want to join? (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={formDisabled}
      />

      {err && <p className="text-xs text-red-700">{err}</p>}

      <button
        type="submit"
        disabled={formDisabled}
        className="v2-btn v2-btn-magenta w-full inline-flex items-center justify-center gap-2"
      >
        {phase === 'submitting' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing checkout…
          </>
        )}
        {phase === 'awaiting_payment' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Complete payment in popup…
          </>
        )}
        {(phase === 'idle') && <>Reserve &amp; pay {formatInr(amountInr)}</>}
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
