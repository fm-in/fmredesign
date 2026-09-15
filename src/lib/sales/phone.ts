/**
 * Normalise a phone number to E.164 (`+<country><number>`).
 *
 * Numbers arrive from forms, ad platforms and booking tools in every shape:
 * "98332 57659", "+91-98332-57659", "0091 9833257659", "09833257659".
 * Numbers without a country code are treated as Indian. Anything that cannot
 * be a real number returns null, so callers never store a guess.
 */

const MAX_DIGITS = 15;

export function toE164(raw: string | null | undefined, defaultCountryCode = '91'): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (trimmed.startsWith('+')) return withCountryCode(digits);
  if (digits.startsWith('00')) return withCountryCode(digits.slice(2));
  if (digits.length === 11 && digits.startsWith('0')) return `+${defaultCountryCode}${digits.slice(1)}`;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  return withCountryCode(digits);
}

/** Digits that already include a country code: 11 to 15 of them. */
function withCountryCode(digits: string): string | null {
  return digits.length >= 11 && digits.length <= MAX_DIGITS ? `+${digits}` : null;
}
