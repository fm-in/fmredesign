/**
 * Spam heuristics for public, unauthenticated forms.
 *
 * WHY: `/api/academy/enroll` collected 6 bot submissions between 2026-07-03
 * and 2026-08-06 — every one of them a Gmail address using dot-obfuscation
 * (Gmail ignores dots in the local part, so `a.b.c@gmail.com` and
 * `abc@gmail.com` deliver to the same inbox — a bot can mint unlimited
 * "unique" addresses from a single mailbox).
 *
 * The checks here are deliberately narrow. A false positive on a paid
 * enrollment form costs a real customer, so we only reject on signals with
 * effectively zero legitimate overlap. Weaker signals (random-looking names,
 * gibberish message bodies) are NOT rejected — they are reported via
 * `suspicions` so the caller can log them without blocking the submission.
 *
 * Validated against production data: the 3-dot threshold caught 6/6 known
 * bot rows with 0 false positives across all 10 genuine addresses on file
 * (the highest legitimate value was 1 dot).
 *
 * Server-only. Client components import the honeypot field name from
 * `@/lib/spam-guard-field` instead, so these heuristics stay out of the
 * browser bundle.
 */

export { HONEYPOT_FIELD } from './spam-guard-field';

export interface SpamVerdict {
  /** True when the submission should be rejected outright. */
  isSpam: boolean;
  /** Machine-readable reason for the rejection, for logs. */
  reason?: 'honeypot' | 'email_dot_abuse' | 'email_plus_abuse';
  /** Non-blocking signals worth logging alongside an accepted submission. */
  suspicions: string[];
}

/** Providers that treat dots in the local part as insignificant. */
const DOT_INSENSITIVE_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
]);

/** Max dots we tolerate in a dot-insensitive local part before calling it abuse. */
const MAX_LOCAL_DOTS = 3;

/**
 * Evaluate a public form submission.
 *
 * @param fields.honeypot  Value of the hidden honeypot input, if present.
 * @param fields.email     Submitted email address.
 * @param fields.name      Submitted name, used only for soft signals.
 */
export function checkSpam(fields: {
  honeypot?: unknown;
  email?: string;
  name?: string;
}): SpamVerdict {
  const suspicions: string[] = [];

  // 1. Honeypot — a hidden field. Any value at all means a bot filled the form.
  if (typeof fields.honeypot === 'string' && fields.honeypot.trim() !== '') {
    return { isSpam: true, reason: 'honeypot', suspicions };
  }

  const email = (fields.email || '').trim().toLowerCase();
  const atIndex = email.lastIndexOf('@');
  if (atIndex > 0) {
    const local = email.slice(0, atIndex);
    const domain = email.slice(atIndex + 1);

    if (DOT_INSENSITIVE_DOMAINS.has(domain)) {
      // 2. Dot-obfuscation — the observed bot signature.
      const dotCount = (local.match(/\./g) || []).length;
      if (dotCount >= MAX_LOCAL_DOTS) {
        return { isSpam: true, reason: 'email_dot_abuse', suspicions };
      }

      // 3. Plus-addressing at volume is the same trick by another route.
      //    A single `+tag` is legitimate and common; several is not.
      const plusCount = (local.match(/\+/g) || []).length;
      if (plusCount >= 2) {
        return { isSpam: true, reason: 'email_plus_abuse', suspicions };
      }
    }
  }

  // ── Soft signals below: recorded, never blocking ──

  const name = (fields.name || '').trim();
  if (name && !/[aeiouAEIOU]/.test(name.replace(/\s/g, ''))) {
    suspicions.push('name_has_no_vowels');
  }
  // Bots in the observed sample used long unbroken mixed-case strings.
  if (/^[A-Za-z]{15,}$/.test(name) && /[a-z]/.test(name) && /[A-Z]/.test(name)) {
    suspicions.push('name_looks_random');
  }

  return { isSpam: false, suspicions };
}
