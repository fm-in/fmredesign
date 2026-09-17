/**
 * Renders sales emails from what intake actually stores — never from invented
 * values. Each lead here is written by the real mapper (Google, Meta,
 * connector), the real scorecard conversion route or the real get-started
 * field mapping, through the real `ingestLead`; the row it inserts is the row
 * the email is rendered from. Invented fixtures ("Diwali Sale", "developing")
 * are what let internal ids and slugs reach customers before.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fake, payloadOf } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';
import type { LeadRow, SalesSettings } from '@/lib/sales/types';
import type { SalesEmailTemplate } from '@/lib/sales/sequence';
import type { AnswerMap, Band } from '@/lib/scorecard/types';

const mocks = vi.hoisted(() => ({
  send: vi.fn<(payload: unknown, options?: unknown) => Promise<{ data: { id: string }; error: null }>>(async () => ({
    data: { id: 'resend_123' },
    error: null,
  })),
  submission: { current: null as Record<string, unknown> | null },
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/email/resend', () => ({ getResend: () => ({ emails: { send: mocks.send } }) }));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn(async () => undefined) } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));
vi.mock('@/lib/admin-auth-middleware', () => ({
  requirePermission: vi.fn(async () => ({
    user: { id: 'u-admin', name: 'Asha', role: 'admin', permissions: ['sales.read', 'sales.write'] },
  })),
}));

import { POST as convertScorecard } from '@/app/api/admin/scorecard/route';
import { mapConnectorLead } from '@/lib/sales/intake/adapters/connector';
import { mapGoogleLead } from '@/lib/sales/intake/adapters/google';
import { ingestLead } from '@/lib/sales/intake/ingest';
import { mapMetaLead } from '@/lib/sales/intake/meta-graph';
import { QUESTIONS } from '@/lib/scorecard/questions';
import { scoreScorecard } from '@/lib/scorecard/scoring';
import { sendSalesEmail } from '../send-email';

const settings: SalesSettings = { automationEnabled: true, bookingLink: 'fm-in/15min', bookingLinkLong: 'fm-in/30min' };
const NOW = new Date('2026-09-16T05:30:00.000Z');

interface SentEmail {
  subject: string;
  html: string;
  text: string;
}

beforeEach(() => {
  fake.reset();
  mocks.send.mockClear();
  mocks.submission.current = null;
  process.env.SALES_REPLY_TO = 'replies@reply.freakingminds.in';
  process.env.SALES_LINK_SECRET = 'test-secret-with-enough-length';
  fake.respond((call) => {
    if (call.table === 'scorecard_submissions' && call.op === 'select') return { data: mocks.submission.current, error: null };
    if (call.table === 'leads' && call.op === 'select') return { data: [], error: null };
    return { data: null, error: null };
  });
});

afterEach(() => {
  delete process.env.SALES_REPLY_TO;
  delete process.env.SALES_LINK_SECRET;
});

/** The row `ingestLead` inserted into `leads`, as the sequence runner would load it. */
function storedLead(): LeadRow {
  const insert = fake.callsTo('leads', 'insert').at(-1);
  if (!insert) throw new Error('intake wrote no lead');
  return { ...leadRow(), ...payloadOf(insert) } as LeadRow;
}

/** Sends through the real `sendSalesEmail` (derive → render) and returns what Resend was given. */
async function emailFor(lead: LeadRow, template: SalesEmailTemplate): Promise<SentEmail> {
  mocks.send.mockClear();
  const outcome = await sendSalesEmail({ lead, template, settings, ownerName: 'Asha Rao' });
  expect(outcome.sent).toBe(true);
  const payload = mocks.send.mock.calls[0]?.[0] as SentEmail;
  return { subject: payload.subject, html: payload.html, text: payload.text };
}

/** Everything a reader sees, with links removed (links legitimately carry ids and tokens). */
function readableWords(email: SentEmail): string {
  const visibleHtml = email.html.replace(/<\/?a\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ');
  return [email.subject, email.text, visibleHtml].join('\n').replace(/https?:\/\/[^\s.,;:!?)]+(?:[.,;:!?)]+[^\s.,;:!?)]+)*/g, 'LINK');
}

function expectNoInternalValues(email: SentEmail): void {
  const words = readableWords(email);
  expect(words).not.toMatch(/\d{6,}/);
  expect(words.toLowerCase()).not.toContain('lead form');
  expect(words.toLowerCase()).not.toContain('lead ad');
  expect(words).not.toContain('·');
  expect(words).not.toContain('undefined');
  expect(words).not.toMatch(/\b[a-z0-9]+_[a-z0-9_]+\b/i);
  expect(words).not.toMatch(/ \.|\.\./);
}

describe('ad_intro from a real Google lead form delivery', () => {
  const payload = {
    lead_id: 'CjwKCAjwxOvEBhBh-lead-7f3a2c',
    api_version: '1.0',
    form_id: 184467440737,
    campaign_id: 21498765432,
    adgroup_id: 163456789012,
    creative_id: 701234567890,
    google_key: 'secret-key',
    is_test: false,
    gcl_id: 'Cj0KCQjw-gclid',
    user_column_data: [
      { column_id: 'FULL_NAME', string_value: 'Asha Mehta', column_name: 'Full Name' },
      { column_id: 'EMAIL', string_value: 'asha.mehta@example.com', column_name: 'User Email' },
      { column_id: 'PHONE_NUMBER', string_value: '+919812345678', column_name: 'User Phone' },
    ],
  };

  it('never shows the numeric campaign id or the form label, and reads the approved fallback', async () => {
    await ingestLead(mapGoogleLead(payload, NOW));
    const lead = storedLead();
    // The fixture really does carry the internal values that must not leak.
    expect(lead.utm_campaign).toBe('21498765432');
    expect(lead.source_detail).toBe('Google lead form 184467440737');

    const email = await emailFor(lead, 'ad_intro');
    expect(email.subject).toBe('About your enquiry');
    expect(email.text).toContain('You filled in one of our forms on Google — thanks for that.');
    expectNoInternalValues(email);
  });
});

describe('ad_intro from a real Meta lead (Graph API response)', () => {
  function graphLead(platform: 'ig' | 'fb') {
    return {
      id: '1029384756102938',
      created_time: '2026-09-16T05:12:44+0000',
      ad_id: '120210000000000001',
      ad_name: 'Lead ad | Sept retarget | 120210000000000001',
      adset_name: 'Bhopal 25-45 | Lead ads',
      campaign_name: 'FM_LeadGen_Sept2026_Bhopal',
      form_id: '987654321098765',
      platform,
      is_organic: false,
      field_data: [
        { name: 'full_name', values: ['Rahul Verma'] },
        { name: 'email', values: ['rahul.verma@example.com'] },
        { name: 'phone_number', values: ['+919876543210'] },
      ],
    };
  }

  it.each([
    ['ig', 'Instagram'],
    ['fb', 'Facebook'],
  ] as const)('platform %s: names %s, never the ad or campaign name', async (platform, expected) => {
    await ingestLead(mapMetaLead(graphLead(platform), '112233445566', NOW));
    const lead = storedLead();
    expect(lead.source_detail).toBe('Lead ad | Sept retarget | 120210000000000001');
    expect(lead.utm_campaign).toBe('FM_LeadGen_Sept2026_Bhopal');

    const email = await emailFor(lead, 'ad_intro');
    expect(email.subject).toBe('About your enquiry');
    expect(email.text).toContain(`You filled in one of our forms on ${expected} — thanks for that.`);
    expectNoInternalValues(email);
  });
});

describe('ad_intro from a real Zapier/Make connector post', () => {
  it('without an explicit campaign: never shows the form name, reads the approved fallback', async () => {
    await ingestLead(
      mapConnectorLead(
        {
          platform: 'linkedin',
          externalId: '6821234567',
          name: 'Neha Kapoor',
          email: 'neha.kapoor@example.com',
          formName: 'CXO lead form 2026-09',
          consentText: 'I agree to be contacted by FreakingMinds.',
        },
        NOW
      )
    );
    const lead = storedLead();
    expect(lead.source_detail).toBe('linkedin · CXO lead form 2026-09');

    const email = await emailFor(lead, 'ad_intro');
    expect(email.subject).toBe('About your enquiry');
    expect(email.text).toContain('You filled in one of our forms on LinkedIn — thanks for that.');
    expectNoInternalValues(email);
  });

  it("with an explicit campaign: uses the connector's campaign field, never the form name", async () => {
    await ingestLead(
      mapConnectorLead(
        {
          platform: 'quora',
          name: 'Vikram Singh',
          email: 'vikram@example.com',
          formName: 'Quora lead form Q3',
          campaign: 'Growth audit for D2C brands',
        },
        NOW
      )
    );
    const email = await emailFor(storedLead(), 'ad_intro');
    expect(email.subject).toBe('About your enquiry from Growth audit for D2C brands');
    expect(email.text).toContain('You filled in our form on Quora about Growth audit for D2C brands — thanks for that.');
    expectNoInternalValues(email);
  });
});

describe('scorecard emails from a real converted scorecard submission', () => {
  /** Every question answered with the option worth `pick(index)` points. */
  function answersAt(pick: (index: number) => number): AnswerMap {
    return Object.fromEntries(
      QUESTIONS.map((question, index) => [question.id, question.options.find((o) => o.score === pick(index))?.value ?? ''])
    );
  }

  const ANSWERS_BY_BAND: Record<Band, AnswerMap> = {
    strong: answersAt(() => 3),
    solid: answersAt(() => 2),
    patchy: answersAt((index) => (index % 2 === 0 ? 1 : 2)),
    at_risk: answersAt(() => 1),
  };

  const PHRASE_BY_BAND: Record<Band, string> = {
    strong: 'strong',
    solid: 'solid',
    patchy: 'patchy',
    at_risk: 'needs-attention',
  };

  /** The row `POST /api/scorecard` stores, built from the same scoring it uses. */
  function submissionFor(answers: AnswerMap): { row: Record<string, unknown>; overall: number; band: Band } {
    const result = scoreScorecard(answers);
    return {
      overall: result.overall,
      band: result.band,
      row: {
        id: 'sc_mfk2a9_x1y2z',
        name: 'Karan Mehta',
        email: 'karan@mehtafoods.example',
        company: 'Mehta Foods',
        phone: null,
        answers,
        overall_score: result.overall,
        band: result.band,
        dimension_scores: result.dimensions,
        status: 'new',
        lead_id: null,
        ip_address: null,
        user_agent: null,
        created_at: '2026-09-15T04:00:00.000Z',
      },
    };
  }

  async function convert(answers: AnswerMap): Promise<{ lead: LeadRow; overall: number; band: Band }> {
    const submission = submissionFor(answers);
    mocks.submission.current = submission.row;
    const res = await convertScorecard(
      new NextRequest('http://localhost/api/admin/scorecard', {
        method: 'POST',
        body: JSON.stringify({ action: 'convert', id: 'sc_mfk2a9_x1y2z' }),
      })
    );
    expect(res.status).toBe(200);
    return { lead: storedLead(), overall: submission.overall, band: submission.band };
  }

  it.each(['strong', 'solid', 'patchy', 'at_risk'] as const)('band %s renders as a phrase, never a slug', async (band) => {
    const { lead, overall, band: scored } = await convert(ANSWERS_BY_BAND[band]);
    expect(scored).toBe(band);
    expect(lead.custom_fields).toMatchObject({ scorecardBand: band });

    const email = await emailFor(lead, 'scorecard_intro');
    expect(email.subject).toBe(`Your scorecard: ${overall}/100`);
    expect(email.text).toContain(
      `Here's where your marketing landed: ${overall}/100, which puts you in the ${PHRASE_BY_BAND[band]} range.`
    );
    expect(email.text).toMatch(/The weakest area is [A-Z][A-Za-z -]+ at \d{1,3}\/100\./);
    expectNoInternalValues(email);
  });

  it.each(['scorecard_fix', 'scorecard_close'] as const)('%s carries no internal values', async (template) => {
    const { lead } = await convert(ANSWERS_BY_BAND.at_risk);
    expectNoInternalValues(await emailFor(lead, template));
  });
});

describe('brief emails from the real get-started field values', () => {
  /** The IntakeLead `POST /api/leads` builds for a get-started submission, with values the form offers. */
  async function getStarted(projectType: string, timeline: string, name = 'Meera Iyer'): Promise<LeadRow> {
    await ingestLead({
      name,
      email: 'meera@example.com',
      phone: '+919900112233',
      company: 'Iyer Studio',
      message: 'We need a new site before the festive season.',
      source: 'website_form',
      sourceDetail: 'Get started',
      consent: { basis: 'inbound_request', evidence: { formName: 'Get started' }, capturedAt: NOW.toISOString() },
      projectType,
      budgetRange: '50k_100k',
      timeline,
      companySize: 'small_business',
      primaryChallenge: 'Our site does not convert',
    });
    return storedLead();
  }

  it.each([
    ['website_design', 'website design'],
    ['ecommerce', 'e-commerce'],
    ['web_app', 'web app'],
    ['mobile_app', 'mobile app'],
    ['branding', 'branding'],
    ['digital_marketing', 'digital marketing'],
    ['full_service', 'full-service marketing'],
    ['consultation', 'strategy'],
  ] as const)('project type %s reads as "%s"', async (projectType, phrase) => {
    const lead = await getStarted(projectType, '1_month');
    const intro = await emailFor(lead, 'brief_intro');
    expect(intro.subject).toBe('Your project brief, Meera');
    expect(intro.text).toContain(
      `Thanks for sending the details through — I've read your brief on ${phrase}, and the timeline you mentioned is workable.`
    );
    expectNoInternalValues(intro);

    const questions = await emailFor(lead, 'brief_questions');
    expect(questions.text).toContain(`Before I put numbers against your ${phrase} project, two questions`);
    expectNoInternalValues(questions);
  });

  it('an unknown project type falls back to "your project"', async () => {
    const lead = await getStarted('other', '2_3_months');
    const intro = await emailFor(lead, 'brief_intro');
    expect(intro.text).toContain("I've read your brief on your project, and the timeline you mentioned is workable.");
    expectNoInternalValues(intro);
  });

  it('"Timeline is flexible" is treated as no timeline', async () => {
    const lead = await getStarted('website_design', 'flexible');
    const intro = await emailFor(lead, 'brief_intro');
    expect(intro.text).toContain("Thanks for sending the details through — I've read your brief on website design.");
    expect(intro.text).not.toContain('the timeline you mentioned');
    expectNoInternalValues(intro);
  });

  it('with no real first name the subject is "Your project brief"', async () => {
    const lead = await getStarted('website_design', 'asap', '+919900112233');
    const intro = await emailFor(lead, 'brief_intro');
    expect(intro.subject).toBe('Your project brief');
    expectNoInternalValues(intro);
  });
});
