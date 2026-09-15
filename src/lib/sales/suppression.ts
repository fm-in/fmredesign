/**
 * One do-not-contact list for every channel. Checked at send time, never at
 * scheduling time, so an unsubscribe takes effect for messages already queued.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { generateSalesId } from '@/lib/sales/types';
import type { SuppressionReason } from '@/lib/sales/types';

const UNIQUE_VIOLATION = '23505';

export async function isSuppressed(contact: { email?: string | null; phoneE164?: string | null }): Promise<boolean> {
  const email = contact.email?.trim().toLowerCase() || null;
  const phone = contact.phoneE164 || null;
  if (!email && !phone) return false;

  const supabase = getSupabaseAdmin();
  if (email) {
    const { data } = await supabase.from('suppression_list').select('id').eq('email', email).limit(1);
    if (Array.isArray(data) && data.length > 0) return true;
  }
  if (phone) {
    const { data } = await supabase.from('suppression_list').select('id').eq('phone_e164', phone).limit(1);
    if (Array.isArray(data) && data.length > 0) return true;
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
  const email = entry.email?.trim().toLowerCase() || null;
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
    if (error && error.code !== UNIQUE_VIOLATION) throw error;
  }
}
