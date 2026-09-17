/** Small read helpers shared by the sales automation. */

import { getSupabaseAdmin } from '@/lib/supabase';
import type { LeadRow } from '@/lib/sales/types';

export interface OwnerRecord {
  id: string;
  name: string;
  email: string | null;
}

export async function loadLead(leadId: string): Promise<LeadRow | null> {
  const { data, error } = await getSupabaseAdmin().from('leads').select('*').eq('id', leadId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function loadOwner(ownerId: string | null): Promise<OwnerRecord | null> {
  if (!ownerId) return null;
  const { data } = await getSupabaseAdmin().from('authorized_users').select('id, name, email').eq('id', ownerId).maybeSingle();
  return data ? { id: data.id, name: data.name, email: data.email ?? null } : null;
}

/** `occurred_at` of the lead's newest `sequence_started` activity, or null if it was never started. */
export async function loadLatestSequenceStartAt(leadId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('lead_activities')
    .select('occurred_at')
    .eq('lead_id', leadId)
    .eq('type', 'sequence_started')
    .order('occurred_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const row: unknown = Array.isArray(data) ? data[0] : undefined;
  return typeof row === 'object' && row !== null && 'occurred_at' in row && typeof row.occurred_at === 'string'
    ? row.occurred_at
    : null;
}
