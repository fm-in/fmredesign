/**
 * The inbound follow-up sequence and the rule that decides, before every
 * step, whether it may still run.
 */

import type { SequenceStopReason, TaskType } from '@/lib/sales/types';

export type SalesEmailTemplate =
  | 'instant_reply'
  | 'follow_up_proof'
  | 'close_the_loop'
  | 'brief_intro'
  | 'brief_questions'
  | 'brief_close'
  | 'ad_intro'
  | 'ad_proof'
  | 'ad_close'
  | 'scorecard_intro'
  | 'scorecard_fix'
  | 'scorecard_close';

export type SequenceStep =
  | { kind: 'email'; template: SalesEmailTemplate; waitBefore: string }
  | { kind: 'task'; taskType: TaskType; title: string; dueInHours: number; waitBefore: string };

export const INBOUND_V1_KEY = 'inbound-v1';

/** `waitBefore` is relative to the previous step, as an Inngest duration. */
export const INBOUND_V1: readonly SequenceStep[] = [
  { kind: 'email', template: 'instant_reply', waitBefore: '0s' },
  { kind: 'email', template: 'follow_up_proof', waitBefore: '2d' },
  { kind: 'task', taskType: 'call', title: 'Call or WhatsApp follow-up', dueInHours: 4, waitBefore: '2d' },
  { kind: 'email', template: 'close_the_loop', waitBefore: '2d' },
];

export interface ContinueState {
  automationEnabled: boolean;
  suppressed: boolean;
  hasBookedMeeting: boolean;
  status: string;
  sequenceStatus: string | null;
}

export type ContinueDecision = { ok: true } | { ok: false; reason: SequenceStopReason };

export function shouldContinue(state: ContinueState): ContinueDecision {
  if (state.sequenceStatus !== 'active') return { ok: false, reason: 'manual' };
  if (!state.automationEnabled) return { ok: false, reason: 'automation_off' };
  if (state.suppressed) return { ok: false, reason: 'unsubscribed' };
  if (state.hasBookedMeeting) return { ok: false, reason: 'booked' };
  if (state.status !== 'new' && state.status !== 'contacted') return { ok: false, reason: 'stage_advanced' };
  return { ok: true };
}
