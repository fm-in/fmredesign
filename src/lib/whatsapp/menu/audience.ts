/**
 * Deciding whether the number that just messaged us belongs to a client.
 *
 * One lookup against `clients.phone_e164`, added in
 * migrations/2026-09-21-client-whatsapp.sql. Everything else is a lead.
 */

import { getSupabaseAdmin } from '@/lib/supabase';

export interface ClientMatch {
  id: string;
  slug: string;
  name: string;
}

/**
 * The client this number belongs to, or null.
 *
 * Two deliberate refusals:
 *
 * - **A missing column is not a match.** The migration is applied by hand in
 *   the Supabase editor, so a deploy can run ahead of it. Until it does, this
 *   returns null and everyone gets the lead menu, which is the safe way round.
 * - **An ambiguous number is not a match.** If two client records carry the
 *   same E.164 — a shared office line, a duplicate record, a person who runs
 *   two of our accounts — there is no way to tell which one is asking, and
 *   guessing shows one client the other's invoice position. Two rows means
 *   no match, and the conversation goes to a human instead.
 */
export async function findClientByPhone(phoneE164: string): Promise<ClientMatch | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('clients')
      .select('id, slug, name')
      .eq('phone_e164', phoneE164)
      .limit(2);

    if (error) {
      // 42703 is "column does not exist" — the pre-migration case.
      if (error.code !== '42703') {
        console.error('[whatsapp] client lookup failed:', error.message);
      }
      return null;
    }

    const rows = (data ?? []) as ClientMatch[];
    if (rows.length !== 1) {
      if (rows.length > 1) {
        console.warn(`[whatsapp] ${rows.length} clients share a number; treating as unknown`);
      }
      return null;
    }
    return rows[0];
  } catch (err) {
    console.error('[whatsapp] client lookup threw:', err instanceof Error ? err.message : err);
    return null;
  }
}
