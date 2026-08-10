/**
 * Duplicate detection for client records.
 *
 * WHY: On 2026-08-05 the same client was entered twice, 44 minutes apart —
 * once with a mistyped email (`...@gmsil.com`) and once correctly. Both rows
 * went live. An email-only check would not have caught it, because the whole
 * point was that the email differed; the phone number was identical on both.
 *
 * So we match on either signal:
 *   - email, compared case-insensitively and trimmed
 *   - phone, reduced to its last 10 digits so "+91 93015 32235",
 *     "93015 32235" and "09301532235" all compare equal
 */

export interface ClientLike {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface DuplicateMatch {
  client: ClientLike;
  matchedOn: 'email' | 'phone';
}

/**
 * Reduce a phone number to a comparable key: digits only, last 10.
 * Returns '' when there aren't enough digits to be meaningful, which callers
 * treat as "no phone to compare".
 */
export function phoneKey(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

/** Reduce an email to a comparable key. */
export function emailKey(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Find the first existing client that collides with the candidate.
 *
 * @param candidate  The client about to be created.
 * @param existing   Current client rows to compare against.
 * @param excludeId  Skip this id — used when updating an existing record.
 */
export function findDuplicateClient(
  candidate: { email?: string | null; phone?: string | null },
  existing: ClientLike[],
  excludeId?: string
): DuplicateMatch | null {
  const candEmail = emailKey(candidate.email);
  const candPhone = phoneKey(candidate.phone);

  for (const row of existing) {
    if (excludeId && row.id === excludeId) continue;

    if (candEmail && emailKey(row.email) === candEmail) {
      return { client: row, matchedOn: 'email' };
    }
    if (candPhone && phoneKey(row.phone) === candPhone) {
      return { client: row, matchedOn: 'phone' };
    }
  }

  return null;
}
