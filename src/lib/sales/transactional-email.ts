/**
 * Transactional email: a receipt for something the person has just done —
 * sent an enquiry, reserved an Academy seat. It is not sales email: it belongs
 * to no sequence, is sent whatever `automationEnabled` says, and carries no
 * unsubscribe link or List-Unsubscribe header. It never reaches an address on
 * the do-not-contact list for any reason but an unsubscribe (`blocksReceipts`).
 *
 * Nothing here throws. A receipt that fails must never fail, change or delay
 * the submission it confirms, so failures are logged — by message only, never
 * an address or a body — and the caller carries on.
 */

import { after } from 'next/server';
import { getResend } from '@/lib/email/resend';
import type { RenderedEmail } from '@/lib/sales/emails';
import { SALES_FROM_DEFAULT } from '@/lib/sales/send-email';
import { blocksReceipts } from '@/lib/sales/suppression';

export type TransactionalTemplate = 'enquiry_receipt' | 'academy_reserved';

export interface TransactionalEmail {
  /** The address the person submitted. Nothing is sent without one. */
  to: string | null | undefined;
  template: TransactionalTemplate;
  email: RenderedEmail;
}

export type TransactionalOutcome =
  | { sent: true; messageId: string }
  | { sent: false; reason: 'no_email' | 'not_configured' | 'suppressed' | 'failed' };

const ADDRESS_PATTERN = /[^\s@<>"'`(),;:]+@[^\s@<>"'`(),;:]+/g;

/** An error's message with any email address blanked, safe to log. */
export function safeErrorMessage(error: unknown): string {
  let message = 'unknown error';
  if (typeof error === 'string') message = error;
  else if (error instanceof Error) message = error.message;
  else if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    message = error.message;
  }
  return message.replace(ADDRESS_PATTERN, '[address]');
}

export async function sendTransactionalEmail({ to, template, email }: TransactionalEmail): Promise<TransactionalOutcome> {
  try {
    const address = to?.trim();
    if (!address) return { sent: false, reason: 'no_email' };

    const resend = getResend();
    if (!resend) return { sent: false, reason: 'not_configured' };

    // Silently: only an address that is not on the do-not-contact list, or is on
    // it solely for unsubscribing, gets a receipt.
    if (await blocksReceipts(address)) return { sent: false, reason: 'suppressed' };

    const { data, error } = await resend.emails.send({
      from: process.env.SALES_FROM_EMAIL || SALES_FROM_DEFAULT,
      to: address,
      replyTo: process.env.SALES_REPLY_TO || process.env.NOTIFICATION_EMAIL || undefined,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [{ name: 'template', value: template }],
    });

    if (error || !data) {
      console.error(`[receipts] ${template} send failed:`, safeErrorMessage(error ?? 'no response from Resend'));
      return { sent: false, reason: 'failed' };
    }
    return { sent: true, messageId: data.id };
  } catch (err) {
    console.error(`[receipts] ${template} send failed:`, safeErrorMessage(err));
    return { sent: false, reason: 'failed' };
  }
}

/**
 * Runs `task` after the response has been sent — Next's `after()`, which the
 * platform keeps alive past the response — so a receipt adds no latency to the
 * form. Where `after()` is unavailable (outside a request) the task runs
 * detached instead. Either way a failing task is logged and never rethrown.
 */
export function afterResponse(label: string, task: () => Promise<unknown>): void {
  const guarded = async (): Promise<void> => {
    try {
      await task();
    } catch (err) {
      console.error(`[receipts] ${label} failed:`, safeErrorMessage(err));
    }
  };

  try {
    after(guarded);
  } catch {
    void guarded();
  }
}
