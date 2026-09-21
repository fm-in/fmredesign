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
      // Off-white by one unit: Outlook's dark mode inverts pure #ffffff most
      // reliably, and the difference is invisible on screen.
      expect(html).toMatch(/<body[^>]*background-color:#fffffe/);
      expect(html).not.toMatch(/background-color:#ffffff\b/);
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


  it('paints all the chrome that sits on the client canvas', () => {
    // Not what turned the mail black on a phone — that was a client
    // rewriting the colours, and the mail renders white even with <html>,
    // <head> and <body> stripped. This is the cheaper insurance: a client
    // that does invert inverts an evenly-painted email evenly, rather than
    // leaving patches. Cells inside the card sit on paint already.
    for (const html of samples()) {
      expect(html).toMatch(/<html\b[^>]*bgcolor=/);
      expect(html).toMatch(/<body\b[^>]*bgcolor=/);

      // The masthead, the card and the copyright line.
      const columns = html.match(/<table\b[^>]*width="600"[^>]*>/g) ?? [];
      expect(columns).toHaveLength(3);
      for (const t of columns) expect(t).toMatch(/bgcolor=/);

      // Both spellings everywhere: Outlook's Word engine reads the
      // attribute, everything modern reads the CSS, and clients drop one or
      // the other.
      for (const t of columns) expect(t).toMatch(/background-color:#/);
    }
  });

  it('asks for light only, in the spelling each mechanism actually takes', () => {
    // `supported-color-schemes` takes scheme names; `only` is not one, and
    // an unknown token there is how the directive silently stopped working.
    for (const html of samples()) {
      expect(html).toContain('<meta name="color-scheme" content="only light">');
      expect(html).toContain('<meta name="supported-color-schemes" content="light">');
      // Some clients keep <style> and drop the meta, so say it both ways.
      expect(html).toMatch(/:root\{color-scheme:only light/);
    }
  });

  it('keeps the button fill at the accent that never lightens', () => {
    // --site-accent-solid. White on #c9325d is 5.12:1; the dark-mode text
    // accent would drop the CTA under AA.
    expect(newLeadEmail({ name: 'R', email: 'r@a.in', company: 'A' }).html).toContain('#c9325d');
  });
});
