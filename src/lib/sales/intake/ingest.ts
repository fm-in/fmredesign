/**
 * The single way a lead enters the system. Normalises what the source sent,
 * merges a returning person into their existing lead, scores new leads,
 * records the submission on the timeline, and emits the event that starts
 * automation.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { recordActivity } from '@/lib/sales/activity';
import { IntakeError } from '@/lib/sales/errors';
import { sendSalesEvent } from '@/lib/sales/events';
import { scoreLead } from '@/lib/sales/scoring';
import { emitEvent } from '@/lib/events/emitter';
import { generateSalesId, SYSTEM_ACTOR } from '@/lib/sales/types';
import type { IntakeLead, LeadRow } from '@/lib/sales/types';
import {
  hasContact,
  matchKeys,
  mergeEmptyFields,
  normaliseIntake,
  toLeadRecord,
  type MatchKey,
  type NormalisedIntake,
} from './normalise';

export interface IngestResult {
  leadId: string;
  created: boolean;
}

const UNIQUE_VIOLATION = '23505';

async function findByKey(key: MatchKey): Promise<LeadRow | null> {
  let query = getSupabaseAdmin().from('leads').select('*').neq('status', 'archived');
  if (key.kind === 'external') query = query.eq('source', key.source).eq('external_source_id', key.value);
  if (key.kind === 'email') query = query.eq('email', key.value);
  if (key.kind === 'phone') query = query.eq('phone_e164', key.value);

  const { data, error } = await query.order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function findExistingLead(lead: NormalisedIntake): Promise<LeadRow | null> {
  for (const key of matchKeys(lead)) {
    const found = await findByKey(key);
    if (found) return found;
  }
  return null;
}

async function recordSubmission(leadId: string, lead: NormalisedIntake, resubmitted: boolean): Promise<void> {
  await recordActivity({
    leadId,
    type: 'form_submitted',
    channel: lead.source,
    direction: 'in',
    subject: lead.sourceDetail ?? null,
    body: lead.message ?? null,
    metadata: {
      source: lead.source,
      sourceDetail: lead.sourceDetail ?? null,
      resubmitted,
      customFields: lead.customFields ?? {},
    },
  });
}

async function mergeIntoExisting(existing: LeadRow, lead: NormalisedIntake, nowIso: string): Promise<IngestResult> {
  const updates = mergeEmptyFields(existing, toLeadRecord(lead, existing.id, nowIso));
  const { error } = await getSupabaseAdmin()
    .from('leads')
    .update({ ...updates, last_activity_at: nowIso })
    .eq('id', existing.id);
  if (error) throw error;

  await recordSubmission(existing.id, lead, true);
  await sendSalesEvent({ name: 'sales/lead.resubmitted', data: { leadId: existing.id, source: lead.source } });
  return { leadId: existing.id, created: false };
}

export async function ingestLead(input: IntakeLead): Promise<IngestResult> {
  const lead = normaliseIntake(input);
  if (!hasContact(lead)) throw new IntakeError('A lead needs an email address or a phone number');

  const nowIso = new Date().toISOString();
  const existing = await findExistingLead(lead);
  if (existing) return mergeIntoExisting(existing, lead, nowIso);

  const id = generateSalesId('lead');
  const { leadScore, priority } = scoreLead({
    source: lead.source,
    budgetRange: lead.budgetRange,
    timeline: lead.timeline,
    companySize: lead.companySize,
    industry: lead.industry,
    primaryChallenge: lead.primaryChallenge,
    customFields: lead.customFields,
  });

  const { error } = await getSupabaseAdmin()
    .from('leads')
    .insert({ ...toLeadRecord(lead, id, nowIso), lead_score: leadScore, priority });

  if (error) {
    // A retried webhook can race its first delivery past findExistingLead.
    if (error.code === UNIQUE_VIOLATION) {
      const winner = await findExistingLead(lead);
      if (winner) return mergeIntoExisting(winner, lead, nowIso);
    }
    throw error;
  }

  await recordSubmission(id, lead, false);
  await sendSalesEvent({ name: 'sales/lead.created', data: { leadId: id, source: lead.source } });
  // Platform event for outgoing webhooks: lead.created was declared but never emitted before.
  await emitEvent('lead.created', { entityId: id, actor: SYSTEM_ACTOR, timestamp: nowIso, data: { source: lead.source } });
  return { leadId: id, created: true };
}
