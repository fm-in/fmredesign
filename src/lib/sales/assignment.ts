/** Give a new lead an owner from the sales rotation, and tell them. */

import { getSupabaseAdmin } from '@/lib/supabase';
import { createNotification, notifyAdmins } from '@/lib/notifications';
import { recordActivity } from '@/lib/sales/activity';
import { pickOwner, type RotationCandidate } from '@/lib/sales/routing';

export async function loadRotation(): Promise<RotationCandidate[]> {
  const supabase = getSupabaseAdmin();
  const { data: users, error } = await supabase
    .from('authorized_users')
    .select('id, name, email')
    .eq('in_sales_rotation', true)
    .eq('status', 'active');
  if (error) throw error;

  const candidates: RotationCandidate[] = [];
  for (const user of users ?? []) {
    const { data: latest } = await supabase
      .from('leads')
      .select('created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    candidates.push({
      id: user.id,
      name: user.name,
      email: user.email ?? null,
      lastAssignedAt: Array.isArray(latest) && latest.length > 0 ? latest[0].created_at : null,
    });
  }
  return candidates;
}

/** Assign an unowned lead. Null when it already had an owner or nobody is in the rotation. */
export async function assignOwner(leadId: string): Promise<RotationCandidate | null> {
  const supabase = getSupabaseAdmin();
  const { data: lead, error } = await supabase.from('leads').select('id, name, company, owner_id').eq('id', leadId).maybeSingle();
  if (error) throw error;
  if (!lead || lead.owner_id) return null;

  const label = `${lead.name}${lead.company ? ` — ${lead.company}` : ''}`;
  const owner = pickOwner(await loadRotation());

  if (!owner) {
    await notifyAdmins({
      type: 'general',
      title: 'New lead needs an owner',
      message: `${label}. Nobody is in the sales rotation.`,
      priority: 'high',
      actionUrl: `/admin/leads/${leadId}`,
    });
    return null;
  }

  // `is('owner_id', null)` makes this safe if someone assigned the lead meanwhile.
  const { data: claimed, error: updateError } = await supabase
    .from('leads')
    .update({ owner_id: owner.id, assigned_to: owner.name })
    .eq('id', leadId)
    .is('owner_id', null)
    .select('id');
  if (updateError) throw updateError;
  if (!Array.isArray(claimed) || claimed.length === 0) return null;

  await recordActivity({
    leadId,
    type: 'owner_changed',
    metadata: { from: null, to: owner.id, toName: owner.name, rule: 'rotation' },
  });
  await createNotification({
    recipientType: 'admin',
    recipientId: owner.id,
    type: 'general',
    title: 'New lead assigned to you',
    message: label,
    priority: 'high',
    actionUrl: `/admin/leads/${leadId}`,
  });
  return owner;
}
