import { describe, it, expect } from 'vitest';
import { SEQUENCES, getSequence, recommendSequence, sequenceStartState, shouldContinue, type ContinueState } from '../sequence';
import { SEQUENCE_LABELS } from '../api-types';
import { leadRow } from '@/test-utils/lead-row';
import type { LeadRow } from '@/lib/sales/types';

const DAYS: Record<string, number> = { '0s': 0, '1d': 1, '2d': 2, '3d': 3, '4d': 4 };

function schedule(steps: readonly { waitBefore: string; kind: string; template?: string; taskType?: string }[]) {
  let day = 0;
  return steps.map((step) => {
    day += DAYS[step.waitBefore];
    return `${day}:${step.kind === 'email' ? step.template : step.taskType}`;
  });
}

describe('SEQUENCES', () => {
  it('brief-v1: intro, call, questions, close', () => {
    const steps = SEQUENCES['brief-v1'];
    expect(schedule(steps)).toEqual(['0:brief_intro', '2:call', '4:brief_questions', '8:brief_close']);
    expect(steps[1]).toMatchObject({ kind: 'task', taskType: 'call', title: 'Call or WhatsApp about the brief', dueInHours: 4, waitBefore: '2d' });
  });

  it('enquiry-v1: instant reply, proof, call, close', () => {
    const steps = SEQUENCES['enquiry-v1'];
    expect(schedule(steps)).toEqual(['0:instant_reply', '2:follow_up_proof', '4:call', '6:close_the_loop']);
    expect(steps[2]).toMatchObject({ kind: 'task', taskType: 'call', title: 'Call or WhatsApp follow-up', dueInHours: 4, waitBefore: '2d' });
  });

  it('ad-lead-v1: intro, call, proof, close', () => {
    const steps = SEQUENCES['ad-lead-v1'];
    expect(schedule(steps)).toEqual(['0:ad_intro', '1:call', '3:ad_proof', '7:ad_close']);
    expect(steps[1]).toMatchObject({ kind: 'task', taskType: 'call', title: 'Call the ad lead', dueInHours: 4, waitBefore: '1d' });
  });

  it('scorecard-v1: intro, fix, close', () => {
    const steps = SEQUENCES['scorecard-v1'];
    expect(schedule(steps)).toEqual(['0:scorecard_intro', '3:scorecard_fix', '6:scorecard_close']);
  });

  it('has exactly the four documented keys', () => {
    expect(Object.keys(SEQUENCES).sort()).toEqual(['ad-lead-v1', 'brief-v1', 'enquiry-v1', 'scorecard-v1']);
  });

  it('has a human label for exactly the registry keys, in the same order', () => {
    // SEQUENCE_LABELS lives in the client-safe api-types; this server-side test keeps it from drifting.
    expect(Object.keys(SEQUENCE_LABELS)).toEqual(Object.keys(SEQUENCES));
  });
});

describe('getSequence', () => {
  it('returns the steps for a known key', () => {
    expect(getSequence('brief-v1')).toBe(SEQUENCES['brief-v1']);
  });

  it('returns null for an unknown key', () => {
    expect(getSequence('inbound-v1')).toBeNull();
    expect(getSequence('nonsense')).toBeNull();
  });

  it('returns null for object prototype members', () => {
    expect(getSequence('constructor')).toBeNull();
    expect(getSequence('toString')).toBeNull();
    expect(getSequence('__proto__')).toBeNull();
    expect(getSequence('hasOwnProperty')).toBeNull();
  });
});

describe('recommendSequence', () => {
  it.each([
    ['website_form (get-started)', { source: 'website_form', custom_fields: { formName: 'Get started' } }, 'brief-v1'],
    ['website_form (contact page)', { source: 'website_form', custom_fields: { formName: 'Contact' } }, 'enquiry-v1'],
    ['website_form (no formName)', { source: 'website_form', custom_fields: {} }, 'enquiry-v1'],
    ['referral', { source: 'referral' }, 'enquiry-v1'],
    ['partner', { source: 'partner' }, 'enquiry-v1'],
    ['event', { source: 'event' }, 'enquiry-v1'],
    ['social_media', { source: 'social_media' }, 'enquiry-v1'],
    ['other', { source: 'other' }, 'enquiry-v1'],
    ['meta_lead_ads', { source: 'meta_lead_ads' }, 'ad-lead-v1'],
    ['google_lead_form', { source: 'google_lead_form' }, 'ad-lead-v1'],
    ['google_ads', { source: 'google_ads' }, 'ad-lead-v1'],
    ['connector', { source: 'connector' }, 'ad-lead-v1'],
    ['scorecard', { source: 'scorecard' }, 'scorecard-v1'],
    ['cal_booking', { source: 'cal_booking' }, null],
  ] as const)('%s -> %s', (_label, overrides, expected) => {
    expect(recommendSequence(leadRow(overrides as Partial<LeadRow>))).toBe(expected);
  });

  it('returns null when the lead has no email', () => {
    expect(recommendSequence(leadRow({ email: null, source: 'website_form' }))).toBeNull();
  });

  it('returns null when tags include "test", regardless of source', () => {
    expect(recommendSequence(leadRow({ tags: ['test'], source: 'meta_lead_ads' }))).toBeNull();
  });

  it('returns null for cal_booking even with an email and no test tag', () => {
    expect(recommendSequence(leadRow({ source: 'cal_booking', tags: [] }))).toBeNull();
  });

  it('returns null for a source it does not recognise', () => {
    expect(recommendSequence(leadRow({ source: 'cold_outreach' }))).toBeNull();
  });

  it('returns null for an unmapped/unknown string source', () => {
    expect(recommendSequence(leadRow({ source: 'totally-unknown-source' }))).toBeNull();
  });

  it('returns null when source is null', () => {
    expect(recommendSequence(leadRow({ source: null }))).toBeNull();
  });

  it('treats null custom_fields as no formName (falls through to enquiry-v1)', () => {
    expect(recommendSequence(leadRow({ source: 'website_form', custom_fields: null }))).toBe('enquiry-v1');
  });

  it('treats a non-object custom_fields (string) defensively', () => {
    const lead = leadRow({ source: 'website_form', custom_fields: 'not-an-object' as unknown as Record<string, unknown> | null });
    expect(recommendSequence(lead)).toBe('enquiry-v1');
  });

  it('treats a non-object custom_fields (array) defensively', () => {
    const lead = leadRow({ source: 'website_form', custom_fields: ['Get started'] as unknown as Record<string, unknown> | null });
    expect(recommendSequence(lead)).toBe('enquiry-v1');
  });

  it('requires an exact "Get started" formName match, not a loose one', () => {
    const lead = leadRow({ source: 'website_form', custom_fields: { formName: 'get started' } });
    expect(recommendSequence(lead)).toBe('enquiry-v1');
  });

  it('ignores formName on non website_form sources', () => {
    const lead = leadRow({ source: 'referral', custom_fields: { formName: 'Get started' } });
    expect(recommendSequence(lead)).toBe('enquiry-v1');
  });
});

describe('sequenceStartState', () => {
  const check = { suppressed: false, automationEnabled: true };

  it('can start when the lead has an email, consent, no prior sequence, and automation is on', () => {
    const lead = leadRow({ email: 'priya@example.com', consent_basis: 'inbound_request', sequence_status: null });
    expect(sequenceStartState(lead, check)).toEqual({ canStart: true, blockedReason: null });
  });

  it('blocks a lead with no email address', () => {
    const lead = leadRow({ email: null });
    const result = sequenceStartState(lead, check);
    expect(result.canStart).toBe(false);
    expect(result.blockedReason).toMatch(/no email address/i);
  });

  it('blocks a suppressed address', () => {
    const lead = leadRow({ email: 'priya@example.com' });
    const result = sequenceStartState(lead, { ...check, suppressed: true });
    expect(result.canStart).toBe(false);
    expect(result.blockedReason).toMatch(/do-not-contact/i);
  });

  it('blocks a lead with no consent basis', () => {
    const lead = leadRow({ email: 'priya@example.com', consent_basis: 'none' });
    const result = sequenceStartState(lead, check);
    expect(result.canStart).toBe(false);
    expect(result.blockedReason).toMatch(/consent/i);
  });

  it('blocks a lead that already had a sequence, even a stopped one', () => {
    const lead = leadRow({ email: 'priya@example.com', sequence_status: 'stopped' });
    const result = sequenceStartState(lead, check);
    expect(result.canStart).toBe(false);
    expect(result.blockedReason).toMatch(/already had a follow-up sequence/i);
  });

  it('blocks when automation is switched off', () => {
    const lead = leadRow({ email: 'priya@example.com' });
    const result = sequenceStartState(lead, { ...check, automationEnabled: false });
    expect(result.canStart).toBe(false);
    expect(result.blockedReason).toMatch(/automation is switched off/i);
  });

  it('blocks an ad-platform test lead', () => {
    const lead = leadRow({ email: 'priya@example.com', source: 'google_lead_form', tags: ['test'] });
    expect(sequenceStartState(lead, check)).toEqual({
      canStart: false,
      blockedReason: 'This is a test lead from an ad platform, so follow-ups are switched off for it.',
    });
  });

  it('blocks a lead that booked a call directly', () => {
    const lead = leadRow({ email: 'priya@example.com', source: 'cal_booking' });
    expect(sequenceStartState(lead, check)).toEqual({
      canStart: false,
      blockedReason: "This lead booked a call directly, so there's no follow-up sequence to run.",
    });
  });

  it('keeps the five existing refusal messages verbatim', () => {
    expect(sequenceStartState(leadRow({ email: null }), check).blockedReason).toBe(
      "This lead has no email address, so follow-ups can't be sent."
    );
    expect(sequenceStartState(leadRow(), { ...check, suppressed: true }).blockedReason).toBe(
      "This email address is on the do-not-contact list, so follow-ups can't be sent."
    );
    expect(sequenceStartState(leadRow({ consent_basis: 'none' }), check).blockedReason).toBe(
      "This lead hasn't given consent to be emailed, so follow-ups can't be sent."
    );
    expect(sequenceStartState(leadRow({ sequence_status: 'completed' }), check).blockedReason).toBe(
      'This lead has already had a follow-up sequence — only one ever runs per lead.'
    );
    expect(sequenceStartState(leadRow(), { ...check, automationEnabled: false }).blockedReason).toBe(
      "Automation is switched off in Settings, so follow-ups can't be sent."
    );
  });

  it('checks in order: email, test lead, booking, suppression, consent, prior sequence, automation', () => {
    // Start from a lead failing all seven checks, then clear them one at a time:
    // each time the next check in the order must be the one reported.
    let lead: Partial<LeadRow> = { email: null, tags: ['test'], source: 'cal_booking', consent_basis: 'none', sequence_status: 'stopped' };
    let current = { suppressed: true, automationEnabled: false };
    expect(sequenceStartState(leadRow(lead), current).blockedReason).toMatch(/no email address/i);

    const fixes: Array<{ lead?: Partial<LeadRow>; check?: Partial<typeof current>; next: RegExp | null }> = [
      { lead: { email: 'priya@example.com' }, next: /test lead from an ad platform/i },
      { lead: { tags: [] }, next: /booked a call directly/i },
      { lead: { source: 'website_form' }, next: /do-not-contact/i },
      { check: { suppressed: false }, next: /consent/i },
      { lead: { consent_basis: 'inbound_request' }, next: /already had a follow-up sequence/i },
      { lead: { sequence_status: null }, next: /automation is switched off/i },
      { check: { automationEnabled: true }, next: null },
    ];
    for (const fix of fixes) {
      lead = { ...lead, ...fix.lead };
      current = { ...current, ...fix.check };
      const result = sequenceStartState(leadRow(lead), current);
      if (fix.next) expect(result.blockedReason).toMatch(fix.next);
      else expect(result).toEqual({ canStart: true, blockedReason: null });
    }
  });
});

describe('shouldContinue', () => {
  const base: ContinueState = {
    automationEnabled: true,
    suppressed: false,
    hasBookedMeeting: false,
    status: 'contacted',
    sequenceStatus: 'active',
  };

  it('continues for an active, untouched lead', () => {
    expect(shouldContinue(base)).toEqual({ ok: true });
  });

  it.each([
    [{ sequenceStatus: 'stopped' }, 'manual'],
    [{ automationEnabled: false }, 'automation_off'],
    [{ suppressed: true }, 'unsubscribed'],
    [{ hasBookedMeeting: true }, 'booked'],
    [{ status: 'qualified' }, 'stage_advanced'],
  ] as const)('stops when %o', (override, reason) => {
    expect(shouldContinue({ ...base, ...override })).toEqual({ ok: false, reason });
  });
});
