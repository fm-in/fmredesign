/**
 * Owner-approved copy (2026-09-17), byte-matched. Also the deterministic
 * event id the enroll route and the Inngest function both rely on to agree.
 */

import { describe, it, expect } from 'vitest';
import { checkoutReminderEventId, renderCheckoutReminderEmail } from '../checkout-reminder';
import { SITE_URL } from '@/lib/site-url';
import { TEAM_SIGNATURE } from '@/lib/sales/emails';

describe('checkoutReminderEventId', () => {
  it('is deterministic per enrollment', () => {
    expect(checkoutReminderEventId('enr-1')).toBe('academy-checkout-reminder-enr-1');
    expect(checkoutReminderEventId('enr-1')).toBe(checkoutReminderEventId('enr-1'));
    expect(checkoutReminderEventId('enr-2')).not.toBe(checkoutReminderEventId('enr-1'));
  });
});

describe('renderCheckoutReminderEmail', () => {
  const email = renderCheckoutReminderEmail({
    buyerName: 'Aarav Gupta',
    programTitle: 'Digital Marketing',
    programSlug: 'digital-marketing',
  });

  it('matches the owner-approved subject and preheader', () => {
    expect(email.subject).toBe('Finish booking your seat on Digital Marketing');
    expect(email.html).toContain("Your seat isn&#39;t booked until payment goes through.");
  });

  it('matches the owner-approved paragraphs, greeting the buyer by first name', () => {
    expect(email.text).toContain('Hi Aarav,');
    expect(email.text).toContain(
      "You started booking a seat on Digital Marketing, but the payment didn't go through, so your seat isn't booked yet."
    );
    expect(email.text).toContain("If you'd still like to join, it takes a couple of minutes to finish.");
    expect(email.text).toContain('Questions? Just reply to this email.');
  });

  it('matches the owner-approved CTA: label and the programme page URL', () => {
    const expectedUrl = `${SITE_URL}/academy/digital-marketing`;
    expect(email.text).toContain(`Finish booking: ${expectedUrl}`);
    expect(email.html).toContain(expectedUrl);
    expect(email.html).toMatch(/>Finish booking<\/a>/);
  });

  it('the plain-text part is exactly the approved paragraphs, CTA and shell sign-off — nothing else', () => {
    const expectedUrl = `${SITE_URL}/academy/digital-marketing`;
    expect(email.text).toBe(
      [
        'Hi Aarav,',
        "You started booking a seat on Digital Marketing, but the payment didn't go through, so your seat isn't booked yet.",
        "If you'd still like to join, it takes a couple of minutes to finish.",
        'Questions? Just reply to this email.',
        '',
        `Finish booking: ${expectedUrl}`,
        '',
        TEAM_SIGNATURE,
        'FreakingMinds',
      ].join('\n')
    );
  });

  it('falls back to "Hi there," when the buyer has no usable first name', () => {
    const noName = renderCheckoutReminderEmail({
      buyerName: 'asha.mehta',
      programTitle: 'Digital Marketing',
      programSlug: 'digital-marketing',
    });
    expect(noName.text).toContain('Hi there,');
    expect(noName.text).not.toContain('Hi asha');
  });

  it('carries no unsubscribe link, in either the html or the text', () => {
    expect(email.html.toLowerCase()).not.toContain('unsubscribe');
    expect(email.text.toLowerCase()).not.toContain('unsubscribe');
  });

  it('has no stray "undefined" anywhere in the rendered email', () => {
    expect(email.html).not.toMatch(/undefined/);
    expect(email.text).not.toMatch(/undefined/);
    expect(email.subject).not.toMatch(/undefined/);
  });
});
