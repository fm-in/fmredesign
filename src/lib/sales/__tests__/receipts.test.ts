/**
 * Confirmation receipts rendered from what the public forms really post. The
 * submissions below are built the way src/app/contact/page.tsx and
 * src/app/get-started/page.tsx build theirs, then parsed by the route's schema.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { createLeadSchema } from '@/lib/validations/schemas';
import { contactPageBody as contactPagePost, getStartedBody as getStartedPost } from '@/test-utils/public-form-bodies';
import type { RenderedEmail } from '../emails';
import { CONTACT_SERVICE_PHRASES, renderEnquiryReceipt } from '../receipts';
import { COMPANY_WHATSAPP_NUMBER } from '@/lib/company';

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn(async () => undefined) } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));

const WHATSAPP_PREFIX = `https://wa.me/${COMPANY_WHATSAPP_NUMBER}?text=`;

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
  expect(words).not.toMatch(/\b(?:lead|sup|act)[-_][a-z0-9-]+/i);
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
    const whatsapp = `${WHATSAPP_PREFIX}${encodeURIComponent('Hi, this is Priya. I sent an enquiry on your website')}`;
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

  it.each([
    'Priya Shah',
    'Priya visit https://cheap-followers.example today',
    'Priya <a href="https://phish.example">claim-prize-now</a>',
    'Priya\tFREE\nMONEY',
  ])('uses nothing after the first word of the name "%s", in the copy or the WhatsApp link', (name) => {
    const email = renderEnquiryReceipt(contactPageBody({ name, email: 'priya@example.com', service: '' }));
    const everything = [email.subject, email.html, email.text].join('\n');
    // Decode twice over: once for HTML entities' raw text, once for the URL-encoded prefill.
    const decoded = decodeURIComponent(everything.replace(/%(?![0-9A-F]{2})/gi, '%25'));

    expect(email.text.startsWith('Hi Priya,\n')).toBe(true);
    expect(decoded).toContain('Hi, this is Priya. I sent an enquiry on your website');
    for (const word of name.split(/\s+/).slice(1)) {
      if (word.length < 3) continue;
      expect(everything).not.toContain(word);
      expect(decoded).not.toContain(word);
      expect(everything).not.toContain(encodeURIComponent(word));
    }
  });

  it('escapes markup in a submitted name', () => {
    const email = renderEnquiryReceipt(contactPageBody({ name: 'Priya <b>Shah</b>', email: 'priya@example.com', service: '' }));
    expect(email.text.startsWith('Hi Priya,\n')).toBe(true);
    expect(email.html).not.toContain('<b>');
  });
});
