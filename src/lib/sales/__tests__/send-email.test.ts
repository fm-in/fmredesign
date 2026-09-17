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
    const lead = leadRow({ project_type: 'web_app', timeline: '3_6_months' });
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

  /** The decoded `text=` of the company WhatsApp link in the plain-text email. */
  function whatsappPrefill(text: string): string | undefined {
    const match = /https:\/\/wa\.me\/\d+\?text=(\S+)/.exec(text);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  }

  it.each([
    ['website_form', 'I sent an enquiry on your website'],
    ['meta_lead_ads', 'I filled in your form'],
    ['google_lead_form', 'I filled in your form'],
    ['google_ads', 'I filled in your form'],
    ['connector', 'I filled in your form'],
    ['scorecard', 'I took your marketing scorecard'],
    ['referral', 'I got in touch'],
    ['cal_booking', 'I got in touch'],
    ['other', 'I got in touch'],
  ] as const)('prefills the WhatsApp message for a %s lead with "%s"', async (source, line) => {
    await sendSalesEmail({ lead: leadRow({ source }), template: 'instant_reply', settings, ownerName: 'Asha' });

    const payload = mocks.send.mock.calls[0]?.[0] as { text: string };
    expect(whatsappPrefill(payload.text)).toBe(`Hi, this is Priya Shah. ${line}`);
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
    expect(deriveSalesEmailFields(leadRow({ timeline: 'asap' })).timeline).toBe('asap');
    expect(deriveSalesEmailFields(leadRow({ timeline: null })).timeline).toBeUndefined();
    expect(deriveSalesEmailFields(leadRow({ timeline: '   ' })).timeline).toBeUndefined();
  });

  it('treats a "flexible" timeline as no timeline', () => {
    expect(deriveSalesEmailFields(leadRow({ timeline: 'flexible' })).timeline).toBeUndefined();
    expect(deriveSalesEmailFields(leadRow({ timeline: ' Flexible ' })).timeline).toBeUndefined();
  });

  it.each([
    ['website_design', 'website design'],
    ['ecommerce', 'e-commerce'],
    ['web_app', 'web app'],
    ['mobile_app', 'mobile app'],
    ['branding', 'branding'],
    ['digital_marketing', 'digital marketing'],
    ['full_service', 'full-service marketing'],
    ['consultation', 'strategy'],
  ] as const)('labels the project type %s as "%s"', (projectType, label) => {
    expect(deriveSalesEmailFields(leadRow({ project_type: projectType })).projectType).toBe(label);
  });

  it('leaves an unknown or missing project type undefined, so the "your project" fallback applies', () => {
    for (const value of ['other', 'maintenance', 'landing-page', 'Website Redesign', '', null] as const) {
      expect(deriveSalesEmailFields(leadRow({ project_type: value })).projectType).toBeUndefined();
    }
  });

  it('never takes a campaign from source_detail', () => {
    for (const source of ['website_form', 'connector', 'meta_lead_ads', 'google_lead_form', 'referral'] as const) {
      const lead = leadRow({ source, utm_campaign: null, source_detail: 'linkedin · CXO lead form' });
      expect(deriveSalesEmailFields(lead).campaign).toBeUndefined();
    }
  });

  it('leaves campaign undefined for Google and Meta leads, whose stored campaign is an id or an internal name', () => {
    expect(deriveSalesEmailFields(leadRow({ source: 'google_lead_form', utm_campaign: '21498765432' })).campaign).toBeUndefined();
    expect(deriveSalesEmailFields(leadRow({ source: 'meta_lead_ads', utm_campaign: 'FM_LeadGen_Sept2026' })).campaign).toBeUndefined();
  });

  it("uses a connector lead's explicit campaign field", () => {
    const lead = leadRow({ source: 'connector', utm_campaign: 'Growth audit for D2C brands', source_detail: 'quora · Growth audit for D2C brands' });
    expect(deriveSalesEmailFields(lead).campaign).toBe('Growth audit for D2C brands');
  });

  it('leaves campaign undefined for a website lead, whose utm_campaign is an internal tracking value', () => {
    expect(deriveSalesEmailFields(leadRow({ source: 'website_form', utm_campaign: 'sept_retarget_bhopal' })).campaign).toBeUndefined();
  });

  it.each([
    ['instagram', 'Instagram'],
    ['facebook', 'Facebook'],
    [null, 'Meta'],
    ['meta', 'Meta'],
  ] as const)('derives a Meta platform from utm_source %s as %s', (utmSource, expected) => {
    expect(deriveSalesEmailFields(leadRow({ source: 'meta_lead_ads', utm_source: utmSource })).platform).toBe(expected);
  });

  it.each([
    ['google_lead_form', 'Google'],
    ['google_ads', 'Google'],
  ] as const)('derives platform for %s as %s', (source, expected) => {
    expect(deriveSalesEmailFields(leadRow({ source })).platform).toBe(expected);
  });

  it('leaves platform undefined for a source with no ad platform mapping', () => {
    expect(deriveSalesEmailFields(leadRow({ source: 'referral' })).platform).toBeUndefined();
    expect(deriveSalesEmailFields(leadRow({ source: 'website_form' })).platform).toBeUndefined();
  });

  it('derives a connector platform from custom_fields.platform first, with the brand spelling', () => {
    const lead = leadRow({ source: 'connector', custom_fields: { platform: 'linkedin' }, source_detail: 'linkedin · Lead Gen' });
    expect(deriveSalesEmailFields(lead).platform).toBe('LinkedIn');
  });

  it('falls back to source_detail for a connector platform when custom_fields lacks it', () => {
    const lead = leadRow({ source: 'connector', custom_fields: {}, source_detail: 'quora · Ask a question' });
    expect(deriveSalesEmailFields(lead).platform).toBe('Quora');
  });

  it('leaves connector platform undefined when neither custom_fields nor source_detail has it', () => {
    const lead = leadRow({ source: 'connector', custom_fields: null, source_detail: null });
    expect(deriveSalesEmailFields(lead).platform).toBeUndefined();
  });

  it.each([
    ['strong', 'strong'],
    ['solid', 'solid'],
    ['patchy', 'patchy'],
    ['at_risk', 'needs-attention'],
  ] as const)('reads the scorecard band %s as the phrase "%s"', (band, phrase) => {
    const lead = leadRow({ custom_fields: { scorecardScore: 62, scorecardBand: band } });
    const fields = deriveSalesEmailFields(lead);
    expect(fields.score).toBe(62);
    expect(fields.band).toBe(phrase);
  });

  it('leaves an unknown band undefined, so the range clause is dropped', () => {
    for (const band of ['average', 'Needs attention', 'constructor', 'toString', '']) {
      expect(deriveSalesEmailFields(leadRow({ custom_fields: { scorecardBand: band } })).band).toBeUndefined();
    }
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
