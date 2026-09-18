/**
 * Unsubscribe links. The token is the recipient's address encrypted with
 * AES-256-GCM, so a link can only unsubscribe the address it was sent to, and
 * an analytics tool that records page URLs learns nothing from it.
 *
 * Token = base64url(iv ‖ authTag ‖ ciphertext).
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { SITE_URL } from '@/lib/site-url';

const MIN_SECRET_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function secret(): string {
  const value = process.env.SALES_LINK_SECRET;
  if (!value || value.length < MIN_SECRET_LENGTH) {
    throw new Error('SALES_LINK_SECRET must be at least 16 characters');
  }
  return value;
}

function encryptionKey(): Buffer {
  return createHash('sha256').update(`unsubscribe:${secret()}`).digest();
}

export function isUnsubscribeConfigured(): boolean {
  const value = process.env.SALES_LINK_SECRET;
  return Boolean(value && value.length >= MIN_SECRET_LENGTH);
}

export function signUnsubscribeToken(email: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv, { authTagLength: TAG_BYTES });
  const ciphertext = Buffer.concat([cipher.update(email.trim().toLowerCase(), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

/** The email the token was issued for, or null if it is not genuine. */
export function verifyUnsubscribeToken(token: string): string | null {
  if (!isUnsubscribeConfigured() || !BASE64URL.test(token)) return null;
  const bytes = Buffer.from(token, 'base64url');
  if (bytes.length <= IV_BYTES + TAG_BYTES) return null;

  try {
    const decipher = createDecipheriv(ALGORITHM, encryptionKey(), bytes.subarray(0, IV_BYTES), {
      authTagLength: TAG_BYTES,
    });
    decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const email = Buffer.concat([decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString('utf8');
    return email.includes('@') ? email : null;
  } catch {
    return null;
  }
}

/** Link shown in the email footer: opens a confirmation page. */
export function unsubscribeUrl(email: string): string {
  return `${SITE_URL}/unsubscribe?t=${encodeURIComponent(signUnsubscribeToken(email))}`;
}

/** Target of the List-Unsubscribe header: mail clients POST to it directly. */
export function oneClickUnsubscribeUrl(email: string): string {
  return `${SITE_URL}/api/sales/unsubscribe?t=${encodeURIComponent(signUnsubscribeToken(email))}`;
}
