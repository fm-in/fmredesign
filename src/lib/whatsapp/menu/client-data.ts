/**
 * The reads behind the client menu.
 *
 * Every one of these returns a *headline* — a count, a total, a date. None of
 * them returns a document, a line item or a link to a file. A WhatsApp thread
 * is not an authenticated session: it is a number we recorded against a
 * client, which is the same level of trust as the email address we already
 * send invoices to, and no more. Anything past the headline is a link back
 * into the portal, where they have to log in.
 */

import { getSupabaseAdmin } from '@/lib/supabase';

/** Money owed to us: everything that has gone out and is not yet paid. */
const OPEN_INVOICE_STATUSES = ['sent', 'overdue', 'pending'];

export interface InvoicePosition {
  openCount: number;
  total: number;
  currency: string;
  /** The due date of the oldest unpaid invoice, ISO, or null when none. */
  oldestDue: string | null;
  overdueCount: number;
}

export async function invoicePosition(clientId: string): Promise<InvoicePosition | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('invoices')
      .select('total, currency, due_date, status')
      .eq('client_id', clientId)
      .in('status', OPEN_INVOICE_STATUSES);

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as { total: number | null; currency: string | null; due_date: string | null; status: string | null }[];
    if (rows.length === 0) {
      return { openCount: 0, total: 0, currency: 'INR', oldestDue: null, overdueCount: 0 };
    }

    const today = new Date().toISOString().slice(0, 10);
    const dues = rows.map((r) => r.due_date).filter((d): d is string => typeof d === 'string').sort();

    return {
      openCount: rows.length,
      total: rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0),
      // Mixed currencies on one account are rare enough that the first is
      // right in practice, and a wrong symbol is more honest than a summed
      // number that silently added rupees to dollars — which is why the
      // count, not the total, leads the message.
      currency: rows.find((r) => r.currency)?.currency ?? 'INR',
      oldestDue: dues[0] ?? null,
      overdueCount: rows.filter((r) => r.status === 'overdue' || (r.due_date !== null && r.due_date < today)).length,
    };
  } catch (err) {
    console.error('[whatsapp] could not read the invoice position:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Content waiting on them.
 *
 * `review` is the status the portal itself treats as "pending review" — see
 * the approve route, which refuses anything else.
 */
export async function contentAwaitingApproval(clientId: string): Promise<number | null> {
  try {
    const { count, error } = await getSupabaseAdmin()
      .from('content_calendar')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'review');

    if (error) throw new Error(error.message);
    return count ?? 0;
  } catch (err) {
    console.error('[whatsapp] could not count content awaiting approval:', err instanceof Error ? err.message : err);
    return null;
  }
}

const SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', GBP: '£', EUR: '€', AED: 'AED ' };

/** No decimals: these are headline figures in a chat, not an invoice. */
export function money(amount: number, currency: string): string {
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${Math.round(amount).toLocaleString('en-IN')}`;
}

export function readableDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}
