/**
 * The follow-up sequence registry and the rule that recommends a sequence
 * from a lead's source.
 */

import type { LeadRow, SequenceStopReason, TaskType } from '@/lib/sales/types';

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

/** `waitBefore` is relative to the previous step, as an Inngest duration. */
export const SEQUENCES: Readonly<Record<string, readonly SequenceStep[]>> = {
  'brief-v1': [
    { kind: 'email', template: 'brief_intro', waitBefore: '0s' },
    { kind: 'task', taskType: 'call', title: 'Call or WhatsApp about the brief', dueInHours: 4, waitBefore: '2d' },
    { kind: 'email', template: 'brief_questions', waitBefore: '2d' },
    { kind: 'email', template: 'brief_close', waitBefore: '4d' },
  ],
  'enquiry-v1': [
    { kind: 'email', template: 'instant_reply', waitBefore: '0s' },
    { kind: 'email', template: 'follow_up_proof', waitBefore: '2d' },
    { kind: 'task', taskType: 'call', title: 'Call or WhatsApp follow-up', dueInHours: 4, waitBefore: '2d' },
    { kind: 'email', template: 'close_the_loop', waitBefore: '2d' },
  ],
  'ad-lead-v1': [
    { kind: 'email', template: 'ad_intro', waitBefore: '0s' },
    { kind: 'task', taskType: 'call', title: 'Call the ad lead', dueInHours: 4, waitBefore: '1d' },
    { kind: 'email', template: 'ad_proof', waitBefore: '2d' },
    { kind: 'email', template: 'ad_close', waitBefore: '4d' },
  ],
  'scorecard-v1': [
    { kind: 'email', template: 'scorecard_intro', waitBefore: '0s' },
    { kind: 'email', template: 'scorecard_fix', waitBefore: '3d' },
    { kind: 'email', template: 'scorecard_close', waitBefore: '3d' },
  ],
};

export function getSequence(key: string): readonly SequenceStep[] | null {
  return SEQUENCES[key] ?? null;
}

/** Reads `custom_fields.formName` defensively: it is jsonb, so it may be null, a non-object, or missing the key. */
function readFormName(lead: LeadRow): string | undefined {
  const customFields = lead.custom_fields;
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) return undefined;
  const value = (customFields as Record<string, unknown>).formName;
  return typeof value === 'string' ? value : undefined;
}

/**
 * Recommends a sequence key from a lead's source. Pure — no database access.
 * Returns null when no sequence should be recommended, including for a
 * source this function does not recognise (never guess).
 */
export function recommendSequence(lead: LeadRow): string | null {
  if (!lead.email) return null;
  if (lead.tags?.includes('test')) return null;
  if (lead.source === 'cal_booking') return null;

  switch (lead.source) {
    case 'website_form':
      return readFormName(lead) === 'Get started' ? 'brief-v1' : 'enquiry-v1';
    case 'referral':
    case 'partner':
    case 'event':
    case 'social_media':
    case 'other':
      return 'enquiry-v1';
    case 'meta_lead_ads':
    case 'google_lead_form':
    case 'google_ads':
    case 'connector':
      return 'ad-lead-v1';
    case 'scorecard':
      return 'scorecard-v1';
    default:
      return null;
  }
}

export interface SequenceStartCheck {
  suppressed: boolean;
  automationEnabled: boolean;
}

/**
 * Whether a lead can start a follow-up sequence, and the plain-English reason
 * when it cannot. Shared by the start route (which refuses the POST) and the
 * lead detail payload (which disables the panel's button) — one copy so the
 * two can never drift and offer a button the endpoint then refuses.
 *
 * `suppressed` and `automationEnabled` are looked up by the caller (both need
 * a database round trip) and passed in; this function itself is pure.
 */
export function sequenceStartState(
  lead: LeadRow,
  check: SequenceStartCheck
): { canStart: true; blockedReason: null } | { canStart: false; blockedReason: string } {
  if (!lead.email) {
    return { canStart: false, blockedReason: "This lead has no email address, so follow-ups can't be sent." };
  }
  if (check.suppressed) {
    return { canStart: false, blockedReason: "This email address is on the do-not-contact list, so follow-ups can't be sent." };
  }
  if (lead.consent_basis !== 'inbound_request' && lead.consent_basis !== 'consent') {
    return { canStart: false, blockedReason: "This lead hasn't given consent to be emailed, so follow-ups can't be sent." };
  }
  if (lead.sequence_status !== null) {
    return { canStart: false, blockedReason: 'This lead has already had a follow-up sequence — only one ever runs per lead.' };
  }
  if (!check.automationEnabled) {
    return { canStart: false, blockedReason: "Automation is switched off in Settings, so follow-ups can't be sent." };
  }
  return { canStart: true, blockedReason: null };
}

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
