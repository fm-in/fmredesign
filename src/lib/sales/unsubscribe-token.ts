/**
 * Signed unsubscribe links. The token is `base64url(email).hmac`, so a link
 * can only unsubscribe the address it was sent to.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { SITE_URL } from '@/lib/site-url';

const MIN_SECRET_LENGTH = 16;

function secret(): string {
  const value = process.env.SALES_LINK_SECRET;
  if (!value || value.length < MIN_SECRET_LENGTH) {
    throw new Error('SALES_LINK_SECRET must be at least 16 characters');
  }
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function isUnsubscribeConfigured(): boolean {
  const value = process.env.SALES_LINK_SECRET;
  return Boolean(value && value.length >= MIN_SECRET_LENGTH);
}

export function signUnsubscribeToken(email: string): string {
  const payload = Buffer.from(email.trim().toLowerCase(), 'utf8').toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** The email the token was issued for, or null if it is not genuine. */
export function verifyUnsubscribeToken(token: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const email = Buffer.from(payload, 'base64url').toString('utf8');
  return email.includes('@') ? email : null;
}

/** Link shown in the email footer: opens a confirmation page. */
export function unsubscribeUrl(email: string): string {
  return `${SITE_URL}/unsubscribe?t=${encodeURIComponent(signUnsubscribeToken(email))}`;
}

/** Target of the List-Unsubscribe header: mail clients POST to it directly. */
export function oneClickUnsubscribeUrl(email: string): string {
  return `${SITE_URL}/api/sales/unsubscribe?t=${encodeURIComponent(signUnsubscribeToken(email))}`;
}
