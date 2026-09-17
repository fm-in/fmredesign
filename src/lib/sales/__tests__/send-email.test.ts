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
import { SEQUENCES } from '../sequence';
import { RECOMMENDATIONS } from '@/lib/scorecard/questions';

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
    expect(whatsappPrefill(payload.text)).toBe(`Hi, this is Priya. ${line}`);
  });

  it.each(['asha.mehta', '+919833257659', 'Unknown'])('leaves the name out of the WhatsApp message for a lead named "%s"', async (name) => {
    await sendSalesEmail({ lead: leadRow({ name }), template: 'instant_reply', settings, ownerName: 'Asha' });

    const payload = mocks.send.mock.calls[0]?.[0] as { text: string };
    expect(whatsappPrefill(payload.text)).toBe('Hi, I sent an enquiry on your website');
  });

  describe('nothing after the first word of the lead name reaches any sales email', () => {
    const TEMPLATES = [
      ...new Set(
        Object.values(SEQUENCES)
          .flat()
          .flatMap((step) => (step.kind === 'email' ? [step.template] : []))
      ),
    ];

    /**
     * Subject, html and text, with the Cal.com booking link's `name` parameter
     * set aside: that one deliberately prefills the booking form with the name
     * on the lead, and is asserted separately.
     */
    function withoutBookingName(email: { subject: string; html: string; text: string }): string {
      return [email.subject, email.html, email.text].join('\n').replace(/(https:\/\/cal\.com\/[^\s"<]*?[?&;]name=)[^&\s"<]*/g, '$1NAME');
    }

    it('covers every template in the sequence registry', () => {
      expect(TEMPLATES).toHaveLength(12);
    });

    it.each([
      'Priya Shah',
      'Priya visit https://cheap-followers.example today',
      'Priya <a href="https://phish.example">claim-prize-now</a>',
      'Priya\tFREE\nMONEY',
    ])('lead named "%s"', async (name) => {
      const lead = leadRow({
        name,
        source: 'scorecard',
        primary_challenge: 'Getting Found (50/100)',
        custom_fields: { scorecardScore: 48, scorecardBand: 'patchy' },
      });
      const extraWords = name.split(/\s+/).slice(1).filter((word) => word.length >= 3);
      expect(extraWords.length).toBeGreaterThan(0);

      const withWhatsapp: string[] = [];
      for (const template of TEMPLATES) {
        mocks.send.mockClear();
        await sendSalesEmail({ lead, template, settings, ownerName: 'Asha' });
        const payload = mocks.send.mock.calls[0]?.[0] as { subject: string; html: string; text: string };

        const everything = withoutBookingName(payload);
        const decoded = decodeURIComponent(everything.replace(/%(?![0-9A-F]{2})/gi, '%25'));
        for (const word of extraWords) {
          expect(everything, `${template}: raw`).not.toContain(word);
          expect(everything, `${template}: encoded`).not.toContain(encodeURIComponent(word));
          expect(decoded, `${template}: decoded`).not.toContain(word);
        }
        const prefill = whatsappPrefill(payload.text);
        if (prefill !== undefined) {
          withWhatsapp.push(template);
          // ad_intro's link is followed by the sentence's full stop, which the helper's \S+ picks up.
          expect(prefill.replace(/\.$/, ''), template).toBe('Hi, this is Priya. I took your marketing scorecard');
        }
      }
      // The templates that carry a WhatsApp link really were checked.
      expect(withWhatsapp).toEqual(['brief_intro', 'instant_reply', 'ad_intro']);
    });
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

  it('never takes a campaign from utm_campaign, for any source', () => {
    for (const [source, utmCampaign] of [
      ['google_lead_form', '21498765432'],
      ['meta_lead_ads', 'FM_LeadGen_Sept2026'],
      ['website_form', 'sept_retarget_bhopal'],
      ['connector', 'Growth audit for D2C brands'],
    ] as const) {
      expect(deriveSalesEmailFields(leadRow({ source, utm_campaign: utmCampaign })).campaign).toBeUndefined();
    }
  });

  it("uses a connector lead's explicitly posted campaign, stored in custom_fields.connectorCampaign", () => {
    const lead = leadRow({
      source: 'connector',
      utm_campaign: 'Growth audit for D2C brands',
      custom_fields: { platform: 'quora', connectorCampaign: 'Growth audit for D2C brands' },
    });
    expect(deriveSalesEmailFields(lead).campaign).toBe('Growth audit for D2C brands');
  });

  it('leaves campaign undefined for a connector lead that posted none', () => {
    const lead = leadRow({ source: 'connector', custom_fields: { platform: 'linkedin', connectorCampaign: null } });
    expect(deriveSalesEmailFields(lead).campaign).toBeUndefined();
  });

  it('ignores a connectorCampaign key on any other source, where a form could have supplied it', () => {
    for (const source of ['website_form', 'google_lead_form', 'meta_lead_ads', 'scorecard'] as const) {
      const lead = leadRow({ source, custom_fields: { connectorCampaign: 'Injected campaign' } });
      expect(deriveSalesEmailFields(lead).campaign).toBeUndefined();
    }
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

  it.each([
    ['linkedin_ads', 'LinkedIn Ads'],
    ['indiamart-leads', 'IndiaMART Leads'],
    ['justdial', 'JustDial'],
    ['quora', 'Quora'],
    ['my_zap-source', 'My Zap Source'],
    ['  snapchat__lead--gen ', 'Snapchat Lead Gen'],
  ] as const)('humanises the connector platform %s as "%s"', (platform, expected) => {
    const lead = leadRow({ source: 'connector', custom_fields: { platform } });
    expect(deriveSalesEmailFields(lead).platform).toBe(expected);
  });

  it('leaves connector platform undefined when the posted value is only separators', () => {
    const lead = leadRow({ source: 'connector', custom_fields: { platform: '_-_' }, source_detail: null });
    expect(deriveSalesEmailFields(lead).platform).toBeUndefined();
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

  describe('weakestFix (custom_fields.scorecardFix)', () => {
    const fix = RECOMMENDATIONS.discoverability?.patchy ?? '';
    const scorecardLead = (customFields: unknown, primaryChallenge: string | null = 'Getting Found (50/100)') =>
      leadRow({ source: 'scorecard', primary_challenge: primaryChallenge, custom_fields: customFields as Record<string, unknown> });

    it("reads the scorecard's recommendation for the weakest area", () => {
      expect(fix.length).toBeGreaterThan(20);
      expect(deriveSalesEmailFields(scorecardLead({ scorecardFix: fix })).weakestFix).toBe(fix);
    });

    it.each([
      ['missing', {}],
      ['not a string', { scorecardFix: 42 }],
      ['blank', { scorecardFix: '   ' }],
      ['free text a merged form could have added', { scorecardFix: 'Visit https://spam.example for cheap followers' }],
      ["another area's advice", { scorecardFix: RECOMMENDATIONS.paid?.patchy }],
    ])('is undefined when scorecardFix is %s', (_label, customFields) => {
      expect(deriveSalesEmailFields(scorecardLead(customFields)).weakestFix).toBeUndefined();
    });

    it.each([null, 'a string', ['an', 'array']])('is undefined when custom_fields is %j', (customFields) => {
      expect(deriveSalesEmailFields(scorecardLead(customFields)).weakestFix).toBeUndefined();
    });

    it("is undefined when the weakest area is already strong: the original copy fits better than praise", () => {
      const strongFix = RECOMMENDATIONS.discoverability?.strong ?? '';
      expect(strongFix.length).toBeGreaterThan(20);
      expect(deriveSalesEmailFields(scorecardLead({ scorecardFix: strongFix }, 'Getting Found (83/100)')).weakestFix).toBeUndefined();
    });

    it('is undefined without a weakest area to attach it to', () => {
      expect(deriveSalesEmailFields(scorecardLead({ scorecardFix: fix }, null)).weakestFix).toBeUndefined();
    });
  });
});
