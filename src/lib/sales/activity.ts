/**
 * The lead timeline and stage changes. `changeStage` is the only code path
 * that should change `leads.status`, so history, sequence stopping and the
 * platform event can never be skipped.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { emitEvent } from '@/lib/events/emitter';
import { sendSalesEvent } from '@/lib/sales/events';
import { generateSalesId, STAGES_BEYOND_CONTACTED, SYSTEM_ACTOR } from '@/lib/sales/types';
import type { ActivityType, Actor, SequenceStopReason } from '@/lib/sales/types';
import type { LeadStatus } from '@/lib/admin/lead-types';

const MAX_BODY = 20_000;

export interface ActivityInput {
  leadId: string;
  type: ActivityType;
  channel?: string | null;
  direction?: 'in' | 'out' | null;
  subject?: string | null;
  body?: string | null;
  metadata?: Record<string, unknown>;
  providerMessageId?: string | null;
  actor?: Actor;
  occurredAt?: string;
}

/**
 * Append one entry to a lead's timeline and bump `last_activity_at`.
 * Never throws — a failed timeline write must not undo the action it records.
 */
export async function recordActivity(input: ActivityInput): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const id = generateSalesId('act');
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const actor = input.actor ?? SYSTEM_ACTOR;

  const { error } = await supabase.from('lead_activities').insert({
    id,
    lead_id: input.leadId,
    type: input.type,
    channel: input.channel ?? null,
    direction: input.direction ?? null,
    subject: input.subject ?? null,
    body: input.body ? input.body.slice(0, MAX_BODY) : null,
    metadata: input.metadata ?? {},
    provider_message_id: input.providerMessageId ?? null,
    actor_id: actor.id,
    actor_name: actor.name,
    occurred_at: occurredAt,
  });

  if (error) {
    console.error('[sales] recordActivity failed:', error);
    return null;
  }

  await supabase.from('leads').update({ last_activity_at: occurredAt }).eq('id', input.leadId);
  return id;
}

/** Stop the lead's active sequence. Returns false (and sends nothing) if none was active. */
export async function stopSequence(
  leadId: string,
  reason: SequenceStopReason,
  actor: Actor = SYSTEM_ACTOR
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('leads')
    .update({ sequence_status: 'stopped', sequence_stop_reason: reason })
    .eq('id', leadId)
    .eq('sequence_status', 'active')
    .select('id');

  if (error) {
    console.error('[sales] stopSequence failed:', error);
    return false;
  }
  if (!Array.isArray(data) || data.length === 0) return false;

  await recordActivity({ leadId, type: 'sequence_stopped', actor, metadata: { reason } });
  await sendSalesEvent({ name: 'sales/sequence.stop', data: { leadId, reason } });
  return true;
}

export interface StageChangeResult {
  from: LeadStatus;
  to: LeadStatus;
  changed: boolean;
}

export async function changeStage(
  leadId: string,
  to: LeadStatus,
  actor: Actor,
  options: { reason?: string; lostReason?: string } = {}
): Promise<StageChangeResult> {
  const supabase = getSupabaseAdmin();

  const { data: current, error: readError } = await supabase.from('leads').select('status').eq('id', leadId).maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error(`Lead ${leadId} not found`);

  const from: LeadStatus = current.status;
  if (from === to) return { from, to, changed: false };

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { status: to, stage_changed_at: now, updated_at: now };
  if (to === 'lost') updates.lost_reason = options.lostReason ?? null;
  if (to === 'discovery_scheduled') updates.discovery_scheduled = true;
  if (to === 'discovery_completed') updates.discovery_completed_at = now;
  if (to === 'proposal_sent') updates.proposal_sent_at = now;

  const { error } = await supabase.from('leads').update(updates).eq('id', leadId);
  if (error) throw error;

  await recordActivity({
    leadId,
    type: 'stage_changed',
    actor,
    metadata: { from, to, reason: options.reason ?? null, lostReason: options.lostReason ?? null },
  });

  if (STAGES_BEYOND_CONTACTED.includes(to)) {
    await stopSequence(leadId, 'stage_advanced', actor);
  }

  await emitEvent('lead.status_changed', {
    entityId: leadId,
    actor,
    timestamp: now,
    data: { previousStatus: from, newStatus: to },
  });

  return { from, to, changed: true };
}
