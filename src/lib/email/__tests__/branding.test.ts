import { describe, it, expect } from 'vitest';
import { newLeadEmail, talentApplicationReceivedEmail, scorecardReportEmail } from '../send';

/**
 * Every transactional email shares one wrapper, so a colour edited in the
 * wrong place changes all of them at once and nobody notices until a
 * customer sees it. These pin the handful of values that make the mail look
 * like the site rather than like the old V2 theme.
 */
const samples = () => [
  newLeadEmail({ name: 'Rohit', email: 'r@acme.in', company: 'Acme' }).html,
  talentApplicationReceivedEmail({
    fullName: 'Priya', email: 'p@example.com', category: 'Photographer',
  }).html,
  scorecardReportEmail({
    name: 'Rohit', overall: 62, bandLabel: 'Patchy',
    dimensions: [{ label: 'Paid', score: 48, band: 'patchy', recommendation: 'Cut the losers.' }],
  } as never).html,
];

describe('the transactional email shell', () => {
  it('paints every surface white, not the old pink-grey and not the site bone', () => {
    // Bone works on the site because it fills the viewport. In a 600px
    // column inside a client's white chrome it reads as a grey panel.
    for (const html of samples()) {
      expect(html).not.toContain('#f4f1f2'); // the old V2 ground
      expect(html).not.toContain('#f7f4ef'); // --site-ground
      expect(html).not.toContain('#fffdfa'); // --site-raised
      expect(html).toMatch(/<body[^>]*background-color:#ffffff/);
    }
  });

  it('uses no gradients anywhere', () => {
    // The redesign has none. The old shell had a 135deg accent bar, and a
    // gradient is the single easiest thing to reintroduce by copy-paste.
    for (const html of samples()) expect(html).not.toMatch(/gradient/i);
  });

  it('ships no HTML comments', () => {
    // They are delivered to the recipient and shown by view-source, so
    // reasoning about the design belongs in the module, not in the markup.
    for (const html of samples()) expect(html).not.toContain('<!--');
  });

  it('sets the heading in the serif the site falls back to', () => {
    for (const html of samples()) expect(html).toMatch(/<h1[^>]*font-family:Georgia/);
  });

  it('describes the company the way the WhatsApp profile does, and names no city', () => {
    for (const html of samples()) {
      expect(html).toContain('The marketing and digital partner for brands that intend to grow.');
      expect(html).not.toMatch(/Digital Marketing Agency/i);
      expect(html).not.toMatch(/Bhopal|Mumbai/);
    }
  });

  it('keeps the button fill at the accent that never lightens', () => {
    // --site-accent-solid. White on #c9325d is 5.12:1; the dark-mode text
    // accent would drop the CTA under AA.
    expect(newLeadEmail({ name: 'R', email: 'r@a.in', company: 'A' }).html).toContain('#c9325d');
  });
});
