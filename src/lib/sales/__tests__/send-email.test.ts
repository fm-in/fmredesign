import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fake, payloadOf } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';

const mocks = vi.hoisted(() => ({
  send: vi.fn<(payload: unknown, options?: unknown) => Promise<{ data: { id: string }; error: null }>>(async () => ({
    data: { id: 'resend_123' },
    error: null,
  })),
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/email/resend', () => ({ getResend: () => ({ emails: { send: mocks.send } }) }));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn(async () => undefined) } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));

import { sendSalesEmail, deriveSalesEmailFields, parseWeakestChallenge } from '../send-email';

const settings = { automationEnabled: true, bookingLink: 'fm-in/15min', bookingLinkLong: 'fm-in/30min' };

beforeEach(() => {
  fake.reset();
  mocks.send.mockClear();
  process.env.SALES_REPLY_TO = 'replies@reply.freakingminds.in';
  process.env.SALES_LINK_SECRET = 'test-secret-with-enough-length';
});

afterEach(() => {
  delete process.env.SALES_REPLY_TO;
  delete process.env.SALES_LINK_SECRET;
});

describe('sendSalesEmail', () => {
  it('refuses a lead without consent', async () => {
    const outcome = await sendSalesEmail({ lead: leadRow({ consent_basis: 'none' }), template: 'instant_reply', settings, ownerName: 'Asha' });
    expect(outcome).toEqual({ sent: false, reason: 'no_consent' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('refuses a suppressed address', async () => {
    fake.respond((call) => (call.table === 'suppression_list' ? { data: [{ id: 'sup_1' }], error: null } : { data: null, error: null }));
    const outcome = await sendSalesEmail({ lead: leadRow(), template: 'instant_reply', settings, ownerName: 'Asha' });
    expect(outcome).toEqual({ sent: false, reason: 'suppressed' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('reports not_configured without a reply-to address', async () => {
    delete process.env.SALES_REPLY_TO;
    const outcome = await sendSalesEmail({ lead: leadRow(), template: 'instant_reply', settings, ownerName: 'Asha' });
    expect(outcome).toEqual({ sent: false, reason: 'not_configured' });
  });

  it('sends with unsubscribe headers and records the email on the timeline', async () => {
    const outcome = await sendSalesEmail({ lead: leadRow(), template: 'instant_reply', settings, ownerName: 'Asha' });

    expect(outcome).toEqual({ sent: true, messageId: 'resend_123' });
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'priya@example.com',
        replyTo: 'replies@reply.freakingminds.in',
        headers: expect.objectContaining({ 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }),
      }),
      expect.anything()
    );
    const activity = fake.callsTo('lead_activities', 'insert').map(payloadOf).find((p) => p.type === 'email_sent');
    expect(activity).toMatchObject({ provider_message_id: 'resend_123', direction: 'out' });
  });

  it('sends with an idempotency key, so a retried step never sends the same email twice', async () => {
    await sendSalesEmail({ lead: leadRow(), template: 'instant_reply', settings, ownerName: 'Asha' });

    expect(mocks.send.mock.calls[0]?.[1]).toEqual({ idempotencyKey: 'sales:lead_1:instant_reply' });
  });

  it('threads the new context fields (project type, timeline, long booking link) through to the rendered email', async () => {
    const lead = leadRow({ project_type: 'web_app', timeline: 'Next quarter' });
    await sendSalesEmail({ lead, template: 'brief_intro', settings, ownerName: 'Asha' });

    const payload = mocks.send.mock.calls[0]?.[0] as { text: string };
    expect(payload.text).toContain("I've read your brief on web app, and the timeline you mentioned is workable.");
    expect(payload.text).toContain('https://cal.com/fm-in/30min');
  });

  it('fills bookingUrlLong from settings.bookingLinkLong for every send, even when the template does not use it', async () => {
    await sendSalesEmail({ lead: leadRow(), template: 'instant_reply', settings, ownerName: 'Asha' });

    const payload = mocks.send.mock.calls[0]?.[0] as { text: string };
    expect(payload.text).toContain('https://cal.com/fm-in/15min');
  });
});

describe('parseWeakestChallenge', () => {
  it('parses a well-formed "{label} ({score}/100)" value', () => {
    expect(parseWeakestChallenge('Landing pages (42/100)')).toEqual({ area: 'Landing pages', score: 42 });
    expect(parseWeakestChallenge('SEO (100/100)')).toEqual({ area: 'SEO', score: 100 });
  });

  it('returns undefined for a malformed value', () => {
    expect(parseWeakestChallenge('Landing pages')).toBeUndefined();
    expect(parseWeakestChallenge('(42/100)')).toBeUndefined();
    expect(parseWeakestChallenge('Landing pages (abc/100)')).toBeUndefined();
    expect(parseWeakestChallenge('Landing pages (42/200)')).toBeUndefined();
  });

  it('returns undefined when missing', () => {
    expect(parseWeakestChallenge(null)).toBeUndefined();
    expect(parseWeakestChallenge(undefined)).toBeUndefined();
    expect(parseWeakestChallenge('')).toBeUndefined();
  });
});

describe('deriveSalesEmailFields', () => {
  it('reads timeline directly off the lead row, undefined when blank or absent', () => {
    expect(deriveSalesEmailFields(leadRow({ timeline: 'ASAP' })).timeline).toBe('ASAP');
    expect(deriveSalesEmailFields(leadRow({ timeline: null })).timeline).toBeUndefined();
    expect(deriveSalesEmailFields(leadRow({ timeline: '   ' })).timeline).toBeUndefined();
  });

  it('humanises a slug-shaped project type but leaves a natural-language one alone', () => {
    expect(deriveSalesEmailFields(leadRow({ project_type: 'web_app' })).projectType).toBe('web app');
    expect(deriveSalesEmailFields(leadRow({ project_type: 'landing-page' })).projectType).toBe('landing page');
    expect(deriveSalesEmailFields(leadRow({ project_type: 'Website Redesign' })).projectType).toBe('Website Redesign');
    expect(deriveSalesEmailFields(leadRow({ project_type: null })).projectType).toBeUndefined();
  });

  it('campaign prefers utm_campaign, falls back to source_detail, then undefined', () => {
    expect(deriveSalesEmailFields(leadRow({ utm_campaign: 'Diwali Sale', source_detail: 'other' })).campaign).toBe('Diwali Sale');
    expect(deriveSalesEmailFields(leadRow({ utm_campaign: null, source_detail: 'Referral: Acme' })).campaign).toBe('Referral: Acme');
    expect(deriveSalesEmailFields(leadRow({ utm_campaign: null, source_detail: null })).campaign).toBeUndefined();
  });

  it.each([
    ['meta_lead_ads', 'Meta'],
    ['google_lead_form', 'Google'],
    ['google_ads', 'Google'],
  ] as const)('derives platform for %s as %s', (source, expected) => {
    expect(deriveSalesEmailFields(leadRow({ source })).platform).toBe(expected);
  });

  it('leaves platform undefined for a source with no ad platform mapping', () => {
    expect(deriveSalesEmailFields(leadRow({ source: 'referral' })).platform).toBeUndefined();
    expect(deriveSalesEmailFields(leadRow({ source: 'website_form' })).platform).toBeUndefined();
  });

  it('derives a connector platform from custom_fields.platform first', () => {
    const lead = leadRow({ source: 'connector', custom_fields: { platform: 'linkedin' }, source_detail: 'linkedin · Lead Gen' });
    expect(deriveSalesEmailFields(lead).platform).toBe('Linkedin');
  });

  it('falls back to source_detail for a connector platform when custom_fields lacks it', () => {
    const lead = leadRow({ source: 'connector', custom_fields: {}, source_detail: 'quora · Ask a question' });
    expect(deriveSalesEmailFields(lead).platform).toBe('Quora');
  });

  it('leaves connector platform undefined when neither custom_fields nor source_detail has it', () => {
    const lead = leadRow({ source: 'connector', custom_fields: null, source_detail: null });
    expect(deriveSalesEmailFields(lead).platform).toBeUndefined();
  });

  it('reads the scorecard score and band from custom_fields', () => {
    const lead = leadRow({ custom_fields: { scorecardScore: 62, scorecardBand: 'developing' } });
    const fields = deriveSalesEmailFields(lead);
    expect(fields.score).toBe(62);
    expect(fields.band).toBe('developing');
  });

  it('leaves score/band undefined for custom_fields that is null, a string, or an array', () => {
    for (const cf of [null, 'not-an-object', ['a']] as const) {
      const lead = leadRow({ custom_fields: cf as unknown as Record<string, unknown> | null });
      const fields = deriveSalesEmailFields(lead);
      expect(fields.score).toBeUndefined();
      expect(fields.band).toBeUndefined();
    }
  });

  it('ignores wrongly-typed scorecard values instead of coercing them', () => {
    const lead = leadRow({ custom_fields: { scorecardScore: '62', scorecardBand: 42 } });
    const fields = deriveSalesEmailFields(lead);
    expect(fields.score).toBeUndefined();
    expect(fields.band).toBeUndefined();
  });

  it('parses weakestArea/weakestScore out of a well-formed primary_challenge', () => {
    const lead = leadRow({ primary_challenge: 'Landing pages (42/100)' });
    const fields = deriveSalesEmailFields(lead);
    expect(fields.weakestArea).toBe('Landing pages');
    expect(fields.weakestScore).toBe(42);
  });

  it('leaves weakestArea/weakestScore undefined for a malformed or missing primary_challenge', () => {
    for (const value of ['Landing pages', null] as const) {
      const lead = leadRow({ primary_challenge: value });
      const fields = deriveSalesEmailFields(lead);
      expect(fields.weakestArea).toBeUndefined();
      expect(fields.weakestScore).toBeUndefined();
    }
  });
});
