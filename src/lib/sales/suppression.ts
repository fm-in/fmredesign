/**
 * One do-not-contact list for every channel. Checked at send time, never at
 * scheduling time, so an unsubscribe takes effect for messages already queued.
 */

import { likeLiteral } from '@/lib/postgrest';
import { safeErrorLog } from '@/lib/safe-log';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateSalesId } from '@/lib/sales/types';
import type { SuppressionReason } from '@/lib/sales/types';

const UNIQUE_VIOLATION = '23505';

/**
 * Stored addresses are not normalised: a row entered by hand can read
 * "Priya.Shah@Gmail.com", and the unique index is on lower(email). Every email
 * lookup therefore matches case-insensitively, with `ilike` on the address
 * escaped so it matches only itself (`likeLiteral`). Phones are stored in E.164
 * and matched exactly.
 */
function normaliseEmail(email: string | null | undefined): string | null {
  return email?.trim().toLowerCase() || null;
}

export async function isSuppressed(contact: { email?: string | null; phoneE164?: string | null }): Promise<boolean> {
  const email = normaliseEmail(contact.email);
  const phone = contact.phoneE164 || null;
  if (!email && !phone) return false;

  const supabase = getSupabaseAdmin();
  if (email) {
    const { data } = await supabase.from('suppression_list').select('id').ilike('email', likeLiteral(email)).limit(1);
    if (Array.isArray(data) && data.length > 0) return true;
  }
  if (phone) {
    const { data } = await supabase.from('suppression_list').select('id').eq('phone_e164', phone).limit(1);
    if (Array.isArray(data) && data.length > 0) return true;
  }
  return false;
}

/** The one reason that still lets a confirmation receipt through: it opts out of sales email only. */
const RECEIPT_ALLOWED_REASON: SuppressionReason = 'unsubscribed';

/** PostgREST (PGRST205) and Postgres (42P01) codes for a table that does not exist. */
const MISSING_TABLE_CODES: ReadonlySet<string> = new Set(['PGRST205', '42P01']);

/**
 * True when a confirmation receipt must not go to this person. A receipt is
 * sent only when neither the address nor the phone is on the do-not-contact
 * list, or each is on it solely because it unsubscribed — that opts out of
 * sales email, not out of a reply to a form the person has just submitted
 * again. Bounced, complaint, manual (an owner's do-not-contact) and
 * deletion_request all block it, as does any reason not recognised here, so a
 * phone-only deletion request stops a receipt to the address submitted with it.
 *
 * Before the sales migration the table does not exist, so there is no list and
 * nothing blocks. Any other lookup failure blocks: the list cannot be ruled out.
 */
export async function blocksReceipts(contact: { email?: string | null; phoneE164?: string | null }): Promise<boolean> {
  const email = normaliseEmail(contact.email);
  const phone = contact.phoneE164 || null;
  const supabase = getSupabaseAdmin();

  const lookups = [
    email ? () => supabase.from('suppression_list').select('reason').ilike('email', likeLiteral(email)).limit(5) : null,
    phone ? () => supabase.from('suppression_list').select('reason').eq('phone_e164', phone).limit(5) : null,
  ];

  for (const lookup of lookups) {
    if (!lookup) continue;
    const { data, error } = await lookup();
    if (error) {
      if (error.code && MISSING_TABLE_CODES.has(error.code)) return false;
      console.error('[sales] suppression lookup failed:', safeErrorLog(error));
      return true;
    }
    if (Array.isArray(data) && data.some((row: { reason?: unknown }) => row.reason !== RECEIPT_ALLOWED_REASON)) return true;
  }
  return false;
}

/** One row per contact method, so an existing phone entry cannot block the email entry. */
export async function addSuppression(entry: {
  email?: string | null;
  phoneE164?: string | null;
  reason: SuppressionReason;
  leadId?: string | null;
}): Promise<void> {
  const email = normaliseEmail(entry.email);
  const phone = entry.phoneE164 || null;
  const candidates: Array<{ email: string; phone_e164: null } | { email: null; phone_e164: string } | null> = [
    email ? { email, phone_e164: null } : null,
    phone ? { email: null, phone_e164: phone } : null,
  ];
  const rows = candidates.filter(
    (row): row is { email: string; phone_e164: null } | { email: null; phone_e164: string } => row !== null
  );

  const supabase = getSupabaseAdmin();
  for (const row of rows) {
    const { error } = await supabase.from('suppression_list').insert({
      id: generateSalesId('sup'),
      ...row,
      reason: entry.reason,
      lead_id: entry.leadId ?? null,
    });
    if (!error) continue;
    if (error.code !== UNIQUE_VIOLATION) throw error;

    // Already listed. The index allows one row per address, so without this a
    // bounce, complaint or deletion request arriving after an unsubscribe would
    // be dropped — and an unsubscribe still lets confirmation receipts through.
    if (entry.reason !== RECEIPT_ALLOWED_REASON) {
      const update = supabase.from('suppression_list').update({ reason: entry.reason });
      const scoped = row.email !== null ? update.ilike('email', likeLiteral(row.email)) : update.eq('phone_e164', row.phone_e164);
      const { error: updateError } = await scoped.eq('reason', RECEIPT_ALLOWED_REASON);
      if (updateError) throw updateError;
    }
  }
}
