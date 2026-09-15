/** Stop contacting an address everywhere: suppress it and stop every sequence it is in. */

import { getSupabaseAdmin } from '@/lib/supabase';
import { recordActivity, stopSequence } from '@/lib/sales/activity';
import { addSuppression } from '@/lib/sales/suppression';

export async function unsubscribeEmail(email: string, via: 'link' | 'reply'): Promise<void> {
  const address = email.trim().toLowerCase();
  const { data } = await getSupabaseAdmin().from('leads').select('id').eq('email', address);
  const leadIds = Array.isArray(data) ? data.map((row) => String(row.id)) : [];

  await addSuppression({ email: address, reason: 'unsubscribed', leadId: leadIds[0] ?? null });

  for (const leadId of leadIds) {
    await recordActivity({ leadId, type: 'unsubscribed', metadata: { via } });
    await stopSequence(leadId, 'unsubscribed');
  }
}
