/**
 * Confirmation receipts rendered from what the public forms really post. The
 * submissions below are built the way src/app/contact/page.tsx,
 * src/app/get-started/page.tsx and ReserveSeatForm.tsx build theirs, and the
 * programme rows use the shape and values of scripts/seed-creator-program.ts.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLeadSchema } from '@/lib/validations/schemas';
import { contactPageBody as contactPagePost, getStartedBody as getStartedPost } from '@/test-utils/public-form-bodies';
import type { RenderedEmail } from '../emails';
import { CONTACT_SERVICE_PHRASES, renderAcademyReserved, renderEnquiryReceipt, type AcademyReservation } from '../receipts';

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn(async () => undefined) } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));

const WHATSAPP_PREFIX = 'https://wa.me/919833257659?text=';

/** A posted body as `POST /api/leads` hands it on: parsed by the route's own schema. */
function accepted(body: unknown) {
  return createLeadSchema.parse(body);
}

function contactPageBody(form: Parameters<typeof contactPagePost>[0]) {
  return accepted(contactPagePost(form));
}

function getStartedBody(form: Parameters<typeof getStartedPost>[0]) {
  return accepted(getStartedPost(form));
}

/** The services the contact page offers, read from the page itself so the map cannot drift. */
function contactPageServices(): string[] {
  const source = readFileSync(path.resolve(process.cwd(), 'src/app/contact/page.tsx'), 'utf8');
  const block = /const services = \[([\s\S]*?)\];/.exec(source)?.[1];
  if (!block) throw new Error('services list not found in the contact page');
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1] ?? '');
}

/** Everything a reader sees, with link targets removed (links legitimately carry ids and slugs). */
function readableWords(email: RenderedEmail): string {
  const visibleHtml = email.html.replace(/<\/?a\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ');
  return [email.subject, email.text, visibleHtml].join('\n').replace(/https?:\/\/\S+/g, 'LINK');
}

function expectCleanReceipt(email: RenderedEmail): void {
  const words = readableWords(email);
  expect(words).not.toContain('undefined');
  expect(words).not.toContain('null');
  expect(words).not.toMatch(/\b[a-z0-9]+_[a-z0-9_]+\b/i);
  expect(words).not.toMatch(/\b(?:lead|enr|prog)[-_][a-z0-9-]+/i);
  expect(words).not.toMatch(/ \.|\.\.| ,|about \.|on \.|starting \./);
  expect(email.html).not.toMatch(/<p[^>]*>\s*<\/p>/);
  expect(email.text).not.toMatch(/\n\n\n/);
  // Transactional: no unsubscribe link, line or header text anywhere.
  expect(`${email.html}\n${email.text}`).not.toMatch(/unsubscribe/i);
}

describe('enquiry_receipt', () => {
  it('renders the approved copy for a contact-page enquiry, naming the service chosen', () => {
    const email = renderEnquiryReceipt(contactPageBody({ name: 'Priya Shah', email: 'priya@example.com', service: 'Social Media Marketing' }));

    expect(email.subject).toBe("We've got your enquiry");
    expect(email.html).toContain('Someone from the team will reply within 24 hours.</div>');
    const whatsapp = `${WHATSAPP_PREFIX}${encodeURIComponent('Hi, this is Priya Shah. I sent an enquiry on your website')}`;
    expect(email.text).toBe(
      [
        'Hi Priya,',
        "Thanks for getting in touch with FreakingMinds — we've received your enquiry about social media marketing.",
        `Someone from the team will reply within 24 hours. If it's urgent, message us on WhatsApp: ${whatsapp}`,
        '',
        `Message us on WhatsApp: ${whatsapp}`,
        '',
        'The FreakingMinds team',
        'FreakingMinds',
      ].join('\n')
    );
    expectCleanReceipt(email);
  });

  it.each(contactPageServices().filter((service) => service !== 'Other'))(
    'the contact page service "%s" reads naturally mid-sentence',
    (service) => {
      const email = renderEnquiryReceipt(contactPageBody({ name: 'Priya Shah', email: 'priya@example.com', service }));
      const phrase = CONTACT_SERVICE_PHRASES[service];
      expect(phrase).toBeDefined();
      expect(email.text).toContain(`we've received your enquiry about ${phrase}.`);
      expectCleanReceipt(email);
    }
  );

  it.each([
    ['no service chosen', ''],
    ['"Other"', 'Other'],
  ])('falls back to "we\'ve received your enquiry." with %s', (_label, service) => {
    const email = renderEnquiryReceipt(contactPageBody({ name: 'Priya Shah', email: 'priya@example.com', service }));
    expect(email.text).toContain("Thanks for getting in touch with FreakingMinds — we've received your enquiry.\n");
    expect(email.text).not.toContain('about');
    expectCleanReceipt(email);
  });

  it('never repeats a service value the page does not offer', () => {
    const body = contactPageBody({ name: 'Priya Shah', email: 'priya@example.com', service: 'Social Media Marketing' });
    const email = renderEnquiryReceipt({ ...body, customFields: { ...body.customFields, service: 'cheap followers at https://spam.example' } });
    expect(email.text).toContain("we've received your enquiry.\n");
    expect(email.text).not.toContain('spam');
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
  ] as const)('a get-started brief for %s reads "about %s"', (projectType, phrase) => {
    const email = renderEnquiryReceipt(getStartedBody({ name: 'Meera Iyer', email: 'meera@example.com', projectType }));
    expect(email.text.startsWith('Hi Meera,\n')).toBe(true);
    expect(email.text).toContain(`Thanks for getting in touch with FreakingMinds — we've received your enquiry about ${phrase}.`);
    expectCleanReceipt(email);
  });

  it.each(['priya.shah@example.com', 'priya@examplemail', 'rahul123', 'Unknown'])(
    'greets "%s" as "Hi there," and leaves the name out of the WhatsApp message',
    (name) => {
      const email = renderEnquiryReceipt(getStartedBody({ name, email: 'priya@example.com', projectType: 'branding' }));
      expect(email.text.startsWith('Hi there,\n')).toBe(true);
      expect(email.text).toContain(`${WHATSAPP_PREFIX}${encodeURIComponent('Hi, I sent an enquiry on your website')}`);
      expectCleanReceipt(email);
    }
  );

  it('escapes markup in a submitted name', () => {
    const email = renderEnquiryReceipt(contactPageBody({ name: 'Priya <b>Shah</b>', email: 'priya@example.com', service: '' }));
    expect(email.text.startsWith('Hi Priya,\n')).toBe(true);
    expect(email.html).not.toContain('<b>');
  });
});

describe('academy_reserved', () => {
  const SEEDED_START = new Date('2026-06-05T15:30:00+05:30').toISOString();

  /** A programme row as the enrol route loads it, with the seed script's values. */
  function reservation(overrides: Partial<AcademyReservation['program']> = {}, buyerName = 'Aarav Gupta'): AcademyReservation {
    return {
      buyerName,
      program: { title: 'Digital Marketing', slug: 'digital-marketing', startsAt: SEEDED_START, ...overrides },
    };
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-17T06:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the approved copy with an upcoming start date formatted for India', () => {
    // 9 PM IST on 12 October is still 12 October in India, though it is 15:30 UTC.
    const email = renderAcademyReserved(reservation({ startsAt: new Date('2026-10-12T21:00:00+05:30').toISOString() }));

    expect(email.subject).toBe('Your seat on Digital Marketing is reserved');
    expect(email.html).toContain('We&#39;ll send your payment link shortly.</div>');
    expect(email.text).toBe(
      [
        'Hi Aarav,',
        'Your seat on Digital Marketing is reserved, starting 12 October 2026.',
        "We'll send your payment link shortly — your seat is confirmed once payment is complete.",
        'Questions? Just reply to this email.',
        '',
        'View the programme: https://www.freakingminds.in/academy/digital-marketing',
        '',
        'The FreakingMinds team',
        'FreakingMinds',
      ].join('\n')
    );
    expectCleanReceipt(email);
  });

  it('formats the date in India time, not the server clock', () => {
    // 1 AM IST on 1 November is still 31 October in UTC.
    const email = renderAcademyReserved(reservation({ startsAt: '2026-10-31T19:30:00.000Z' }));
    expect(email.text).toContain('is reserved, starting 1 November 2026.');
  });

  it('drops ", starting …" without a start date', () => {
    const email = renderAcademyReserved(reservation({ startsAt: null }));
    expect(email.text).toContain('Your seat on Digital Marketing is reserved.\n');
    expect(email.text).not.toContain('starting');
    expectCleanReceipt(email);
  });

  it("drops a start date that has already passed (the seeded 5 June batch), rather than claim it", () => {
    const email = renderAcademyReserved(reservation());
    expect(email.text).toContain('Your seat on Digital Marketing is reserved.\n');
    expect(email.text).not.toContain('June');
    expectCleanReceipt(email);
  });

  it('links the public programme page', () => {
    const email = renderAcademyReserved(reservation({ slug: 'creator-program-full', title: 'Freaking Minds Creator Program — Full Bundle' }));
    expect(email.subject).toBe('Your seat on Freaking Minds Creator Program — Full Bundle is reserved');
    expect(email.html).toMatch(/<a href="https:\/\/www\.freakingminds\.in\/academy\/creator-program-full"[^>]*>View the programme<\/a>/);
    expectCleanReceipt(email);
  });

  it('never claims a hold period or a deadline', () => {
    const email = renderAcademyReserved(reservation({ startsAt: '2026-10-12T15:30:00.000Z' }));
    expect(readableWords(email)).not.toMatch(/\bhold\b|held for|deadline|expires?|within \d|hours?\b|days?\b/i);
  });

  it('reads naturally with a nameless buyer and an untitled programme', () => {
    const email = renderAcademyReserved(reservation({ title: '  ', startsAt: null }, 'aarav.gupta@example.com'));
    expect(email.subject).toBe('Your seat is reserved');
    expect(email.text.startsWith('Hi there,\nYour seat is reserved.\n')).toBe(true);
    expectCleanReceipt(email);
  });
});
