/**
 * Contact-detail-free logging for errors that may quote a person's data.
 *
 * A database error can repeat what was written — Postgres `details` quotes the
 * failing row, PostgREST echoes filter values — and a provider error can name
 * the recipient. Log `safeErrorLog(error)` or `safeErrorMessage(error)`, never
 * the raw object: they keep the code and message and blank every email address
 * and phone number.
 *
 * Server-only by use: it has no dependencies, but nothing in the browser needs it.
 */

/** Anything shaped like an address: no whitespace, quotes, brackets or list punctuation around the "@". */
const EMAIL_PATTERN = /[^\s@<>"'`(),;:[\]]+@[^\s@<>"'`(),;:[\]]+/g;

/**
 * Ten or more digits, optionally led by "+" and split by spaces, dots, dashes
 * or brackets — "+91 98332 57659", "(022) 2345-6789". Error codes, counts,
 * amounts and ISO timestamps are shorter or broken by other characters.
 */
const PHONE_PATTERN = /\+?\d(?:[\s().-]*\d){9,}/g;

export function blankContactDetails(text: string): string {
  return text.replace(EMAIL_PATTERN, '[address]').replace(PHONE_PATTERN, '[phone]');
}

/** An error's message — from an Error, a PostgREST/Resend error object or a string — with contact details blanked. */
export function safeErrorMessage(error: unknown): string {
  let message = 'unknown error';
  if (typeof error === 'string') message = error;
  else if (error instanceof Error) message = error.message;
  else if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    message = error.message;
  }
  return blankContactDetails(message);
}

/** The error's code (when it has one) and its blanked message. `details` and `hint` are never included. */
export function safeErrorLog(error: unknown): { code?: string; message: string } {
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
  return code ? { code, message: safeErrorMessage(error) } : { message: safeErrorMessage(error) };
}
