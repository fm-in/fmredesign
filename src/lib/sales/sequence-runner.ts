/**
 * Executes the follow-up sequence one step at a time. Every function re-reads
 * the lead, so a step never acts on stale state from an earlier Inngest step.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { changeStage, stopSequence } from '@/lib/sales/activity';
import { fallbackFollowUpDraft } from '@/lib/sales/brief';
import { TEAM_SIGNATURE } from '@/lib/sales/emails';
import { loadLead, loadOwner } from '@/lib/sales/lead-store';
import { sendSalesEmail } from '@/lib/sales/send-email';
import { shouldContinue, type ContinueDecision, type SequenceStep } from '@/lib/sales/sequence';
import { getSalesSettings } from '@/lib/sales/settings';
import { isSuppressed } from '@/lib/sales/suppression';
import { createTask } from '@/lib/sales/tasks';
import { SYSTEM_ACTOR } from '@/lib/sales/types';

export type StepResult = { done: true } | { done: false; stopped: string };

/** Enrol a lead. False if it is, or ever was, in a sequence — so none runs twice. */
export async function markSequenceActive(leadId: string, key: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('leads')
    .update({ sequence_key: key, sequence_status: 'active', sequence_step: 0, sequence_stop_reason: null })
    .eq('id', leadId)
    .is('sequence_status', null)
    .select('id');
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

export async function markSequenceCompleted(leadId: string): Promise<void> {
  await getSupabaseAdmin()
    .from('leads')
    .update({ sequence_status: 'completed' })
    .eq('id', leadId)
    .eq('sequence_status', 'active');
}

export async function hasBookedMeeting(leadId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin().from('meetings').select('id').eq('lead_id', leadId).eq('status', 'booked').limit(1);
  return Array.isArray(data) && data.length > 0;
}

/** Decide whether the next step may run; stop the sequence if it may not. */
export async function evaluateContinue(leadId: string): Promise<ContinueDecision> {
  const lead = await loadLead(leadId);
  if (!lead) return { ok: false, reason: 'manual' };

  const [settings, suppressed, booked] = await Promise.all([
    getSalesSettings(),
    isSuppressed({ email: lead.email, phoneE164: lead.phone_e164 }),
    hasBookedMeeting(leadId),
  ]);

  const decision = shouldContinue({
    automationEnabled: settings.automationEnabled,
    suppressed,
    hasBookedMeeting: booked,
    status: lead.status,
    sequenceStatus: lead.sequence_status,
  });

  if (!decision.ok && lead.sequence_status === 'active') {
    await stopSequence(leadId, decision.reason);
  }
  return decision;
}

/**
 * Perform one step's side effect only: create the task, or send the email.
 * No bookkeeping (no `first_response_at`/`status`/`sequence_step` writes) —
 * that happens afterwards in `recordStepProgress`, in its own Inngest step,
 * so a retried side effect never repeats a real send.
 */
export async function runSequenceStep(leadId: string, step: SequenceStep, index: number): Promise<StepResult> {
  const lead = await loadLead(leadId);
  if (!lead) return { done: false, stopped: 'lead_missing' };

  const owner = await loadOwner(lead.owner_id);
  const ownerName = owner?.name ?? TEAM_SIGNATURE;

  if (step.kind === 'task') {
    await createTask({
      leadId,
      ownerId: lead.owner_id,
      type: step.taskType,
      title: step.title,
      draftBody: fallbackFollowUpDraft(lead, ownerName),
      dueAt: new Date(Date.now() + step.dueInHours * 60 * 60_000).toISOString(),
    });
  } else {
    const outcome = await sendSalesEmail({ lead, template: step.template, settings: await getSalesSettings(), ownerName });
    if (!outcome.sent) {
      const reason = outcome.reason === 'suppressed' ? 'unsubscribed' : outcome.reason;
      await stopSequence(leadId, reason);
      return { done: false, stopped: reason };
    }
  }

  return { done: true };
}

/**
 * Record the bookkeeping for a step that already ran successfully. Runs in
 * its own Inngest step (after `runSequenceStep`'s), so a retry here never
 * re-sends anything — every write is idempotent and safe to repeat.
 */
export async function recordStepProgress(leadId: string, step: SequenceStep, index: number): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (step.kind === 'email' && index === 0) {
    const { error: stampError } = await supabase
      .from('leads')
      .update({ first_response_at: new Date().toISOString() })
      .eq('id', leadId)
      .is('first_response_at', null);
    if (stampError) throw stampError;

    // Re-read fresh — never reuse a lead loaded by an earlier step.
    const { data: current, error: statusError } = await supabase
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .maybeSingle();
    if (statusError) throw statusError;
    if (!current) return;

    if (current.status === 'new') {
      await changeStage(leadId, 'contacted', SYSTEM_ACTOR, { reason: 'Instant reply sent' });
    }
  }

  const { error: stepError } = await supabase.from('leads').update({ sequence_step: index + 1 }).eq('id', leadId);
  if (stepError) throw stepError;
}
