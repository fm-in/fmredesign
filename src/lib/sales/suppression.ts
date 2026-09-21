/**
 * The do-not-contact list. Checked at send time, never at scheduling time, so
 * an unsubscribe takes effect for messages already queued.
 *
 * A row with `channel = null` suppresses every channel; that is what an email
 * unsubscribe, a bounce or a deletion request writes, and it is what every
 * pre-existing row means. A row with a channel suppresses only that one.
 *
 * The distinction exists because a single list silently overreaches once there
 * is more than one channel: `sendSalesEmail` asks about both the email address
 * and the phone number, so a WhatsApp "STOP" stored against the phone would
 * also stop that person's email. Asking us to stop messaging on WhatsApp is
 * not asking us to stop sending an invoice.
 */

import { likeLiteral } from '@/lib/postgrest';
import { safeErrorLog, safeErrorMessage } from '@/lib/safe-log';
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

export type SuppressionChannel = 'email' | 'whatsapp';

/**
 * `channel` narrows the question to "may we reach them HERE". Omitting it asks
 * the broader "are they listed at all", which is what the admin screens want.
 * Every sender passes its own channel.
 */
export async function isSuppressed(
  contact: { email?: string | null; phoneE164?: string | null },
  channel?: SuppressionChannel
): Promise<boolean> {
  const email = normaliseEmail(contact.email);
  const phone = contact.phoneE164 || null;
  if (!email && !phone) return false;

  const supabase = getSupabaseAdmin();
  // A channel-scoped question matches the all-channel rows plus its own.
  const scope = <T extends { or: (filter: string) => T }>(query: T): T =>
    channel ? query.or(`channel.is.null,channel.eq.${channel}`) : query;

  if (email) {
    const { data } = await scope(
      supabase.from('suppression_list').select('id').ilike('email', likeLiteral(email))
    ).limit(1);
    if (Array.isArray(data) && data.length > 0) return true;
  }
  if (phone) {
    const { data } = await scope(
      supabase.from('suppression_list').select('id').eq('phone_e164', phone)
    ).limit(1);
    if (Array.isArray(data) && data.length > 0) return true;
  }
  return false;
}

/** The one reason that still lets a confirmation receipt through: it opts out of sales email only. */
const RECEIPT_ALLOWED_REASON: SuppressionReason = 'unsubscribed';

/** PostgREST (PGRST205) and Postgres (42P01) codes for a table that does not exist. */
const MISSING_TABLE_CODES: ReadonlySet<string> = new Set(['PGRST205', '42P01']);

/**
 * Like `isSuppressed`, but fails closed on a lookup error: throws instead of
 * treating an error as "not suppressed". `isSuppressed` itself stays as it
 * is for its other callers — this is for a caller inside a durable job
 * (Inngest), where throwing lets the platform retry rather than risk a
 * message reaching someone who asked not to be contacted during a DB blip.
 * A missing `suppression_list` table (before the sales migration is
 * applied) is not an error here — there is no list yet, so nothing blocks.
 */
export async function isSuppressedOrThrow(contact: { email?: string | null; phoneE164?: string | null }): Promise<boolean> {
  const email = normaliseEmail(contact.email);
  const phone = contact.phoneE164 || null;
  if (!email && !phone) return false;

  const supabase = getSupabaseAdmin();
  const lookups = [
    email ? () => supabase.from('suppression_list').select('id').ilike('email', likeLiteral(email)).limit(1) : null,
    phone ? () => supabase.from('suppression_list').select('id').eq('phone_e164', phone).limit(1) : null,
  ];

  for (const lookup of lookups) {
    if (!lookup) continue;
    const { data, error } = await lookup();
    if (error) {
      if (error.code && MISSING_TABLE_CODES.has(error.code)) continue;
      throw new Error(`suppression lookup failed: ${safeErrorMessage(error)}`);
    }
    if (Array.isArray(data) && data.length > 0) return true;
  }
  return false;
}

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
  /** Omit to suppress every channel — what an email unsubscribe or a bounce means. */
  channel?: SuppressionChannel | null;
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
      channel: entry.channel ?? null,
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
      const channelScoped = entry.channel ? scoped.eq('channel', entry.channel) : scoped.is('channel', null);
      const { error: updateError } = await channelScoped.eq('reason', RECEIPT_ALLOWED_REASON);
      if (updateError) throw updateError;
    }
  }
}
