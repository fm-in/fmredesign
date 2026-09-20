/**
 * Booking and WhatsApp links. Client-safe: used by emails, task cards and
 * the public booking button.
 */

import { COMPANY_WHATSAPP_NUMBER } from '@/lib/company';

/** Re-exported so existing importers keep working. */
export { COMPANY_WHATSAPP_NUMBER };

export const DEFAULT_BOOKING_LINK = 'fm-in/15min';
export const DEFAULT_BOOKING_LINK_LONG = 'fm-in/30min';

export interface BookingPrefill {
  leadId?: string;
  name?: string;
  email?: string;
}

export function bookingUrl(bookingLink: string, prefill: BookingPrefill = {}): string {
  const path = (bookingLink || DEFAULT_BOOKING_LINK).replace(/^\/+|\/+$/g, '');
  const params = new URLSearchParams();
  if (prefill.name) params.set('name', prefill.name);
  if (prefill.email) params.set('email', prefill.email);
  if (prefill.leadId) params.set('metadata[leadId]', prefill.leadId);
  const query = params.toString();
  return `https://cal.com/${path}${query ? `?${query}` : ''}`;
}

/** A wa.me link that opens a chat with the text filled in, or null without a full number. */
export function whatsappUrl(phoneE164: string | null | undefined, text: string): string | null {
  const digits = (phoneE164 ?? '').replace(/\D/g, '');
  if (digits.length < 11) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function companyWhatsappUrl(text: string): string {
  return `https://wa.me/${COMPANY_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
