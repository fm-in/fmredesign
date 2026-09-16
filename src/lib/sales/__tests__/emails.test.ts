import { describe, it, expect } from 'vitest';
import { firstNameOf, renderSalesEmail, TEAM_SIGNATURE, type SalesEmailContext } from '../emails';

const ctx: SalesEmailContext = {
  firstName: 'Priya',
  ownerName: 'Asha Rao',
  bookingUrl: 'https://cal.com/fm-in/15min?metadata%5BleadId%5D=lead_1',
  whatsappUrl: 'https://wa.me/919833257659?text=Hi',
  unsubscribeUrl: 'https://www.freakingminds.in/unsubscribe?t=abc',
  workUrl: 'https://www.freakingminds.in/work',
  scorecardUrl: 'https://www.freakingminds.in/scorecard',
};

// Captured from the pre-shell implementation. The branded HTML shell must
// never change this — only the html output changes.
const EXPECTED_TEXT: Record<'instant_reply' | 'follow_up_proof' | 'close_the_loop', string> = {
  instant_reply:
    "Hi Priya,\nThanks for getting in touch with FreakingMinds. I'm Asha Rao, and I'll be looking after your enquiry.\nThe quickest way forward is a 15-minute call. You tell us where growth is stuck, and we tell you honestly whether we can help. Pick a time that suits you below.\nPrefer WhatsApp? Message us here and we'll pick it up: https://wa.me/919833257659?text=Hi\n\nBook a 15-minute call: https://cal.com/fm-in/15min?metadata%5BleadId%5D=lead_1\n\nAsha Rao\nFreakingMinds\n\nUnsubscribe: https://www.freakingminds.in/unsubscribe?t=abc",
  follow_up_proof:
    'Hi Priya,\nWhile you think it over, here is some of the work we have done for brands like yours: https://www.freakingminds.in/work\nIf you would rather start with a quick self-check, our marketing scorecard shows where the biggest gaps are: https://www.freakingminds.in/scorecard\nHappy to walk you through either on a short call.\n\nPick a time: https://cal.com/fm-in/15min?metadata%5BleadId%5D=lead_1\n\nAsha Rao\nFreakingMinds\n\nUnsubscribe: https://www.freakingminds.in/unsubscribe?t=abc',
  close_the_loop:
    "Hi Priya,\nI haven't heard back, so I'll assume the timing isn't right and stop following up.\nIf things change, reply to this email or book a call whenever it suits you.\n\nBook a call: https://cal.com/fm-in/15min?metadata%5BleadId%5D=lead_1\n\nAsha Rao\nFreakingMinds\n\nUnsubscribe: https://www.freakingminds.in/unsubscribe?t=abc",
};

const EXPECTED_TEAM_SIGNATURE_TEXT =
  "Hi Priya,\nThanks for getting in touch with FreakingMinds. We'll be looking after your enquiry personally.\nThe quickest way forward is a 15-minute call. You tell us where growth is stuck, and we tell you honestly whether we can help. Pick a time that suits you below.\nPrefer WhatsApp? Message us here and we'll pick it up: https://wa.me/919833257659?text=Hi\n\nBook a 15-minute call: https://cal.com/fm-in/15min?metadata%5BleadId%5D=lead_1\n\nThe FreakingMinds team\nFreakingMinds\n\nUnsubscribe: https://www.freakingminds.in/unsubscribe?t=abc";

describe('renderSalesEmail', () => {
  it.each(['instant_reply', 'follow_up_proof', 'close_the_loop'] as const)('%s carries the booking and unsubscribe links', (template) => {
    const email = renderSalesEmail(template, ctx);
    expect(email.subject.length).toBeGreaterThan(5);
    expect(email.html).toContain('Unsubscribe');
    expect(email.text).toContain(ctx.unsubscribeUrl);
    expect(email.text).toContain(ctx.bookingUrl);
  });

  it('uses a different subject for each step', () => {
    const subjects = new Set((['instant_reply', 'follow_up_proof', 'close_the_loop'] as const).map((t) => renderSalesEmail(t, ctx).subject));
    expect(subjects.size).toBe(3);
  });

  it('escapes HTML in names', () => {
    const email = renderSalesEmail('instant_reply', { ...ctx, firstName: '<script>alert(1)</script>' });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });
});

describe('renderSalesEmail plain-text output (must stay byte-identical to the pre-shell implementation)', () => {
  it.each(['instant_reply', 'follow_up_proof', 'close_the_loop'] as const)('%s', (template) => {
    const email = renderSalesEmail(template, ctx);
    expect(email.text).toBe(EXPECTED_TEXT[template]);
  });

  it('team-signature variant', () => {
    const email = renderSalesEmail('instant_reply', { ...ctx, ownerName: TEAM_SIGNATURE });
    expect(email.text).toBe(EXPECTED_TEAM_SIGNATURE_TEXT);
  });
});

describe('renderSalesEmail html (branded shell)', () => {
  it.each(['instant_reply', 'follow_up_proof', 'close_the_loop'] as const)('%s renders through the branded shell', (template) => {
    const email = renderSalesEmail(template, ctx);
    expect(email.html).toContain('bgcolor="#a82548"');
    expect(email.html).toContain('https://www.freakingminds.in/email/logo.png');
    expect(email.html).toContain('alt="FreakingMinds"');
    expect(email.html).toMatch(/<table[^>]*width="600"/);
  });

  it('gives each template a distinct, non-empty hidden preheader', () => {
    const preheaders = (['instant_reply', 'follow_up_proof', 'close_the_loop'] as const).map((t) => {
      const html = renderSalesEmail(t, ctx).html;
      const match = html.match(/opacity:0;overflow:hidden;mso-hide:all;">([^<]*)<\/div>/);
      return match?.[1] ?? '';
    });
    preheaders.forEach((p) => expect(p.length).toBeGreaterThan(10));
    expect(new Set(preheaders).size).toBe(3);
  });

  it('carries the company address in the footer when COMPANY_ADDRESS is set, and omits it cleanly otherwise', () => {
    process.env.COMPANY_ADDRESS = '123 Example Street, Bhopal';
    try {
      const withAddress = renderSalesEmail('instant_reply', ctx).html;
      expect(withAddress).toContain('123 Example Street, Bhopal');
    } finally {
      delete process.env.COMPANY_ADDRESS;
    }

    const withoutAddress = renderSalesEmail('instant_reply', ctx).html;
    expect(withoutAddress).not.toContain('undefined');
  });
});

describe('firstNameOf', () => {
  it.each([
    ['priya shah', 'Priya'],
    ['  Rahul  ', 'Rahul'],
    ['Unknown', 'there'],
    ['+919833257659', 'there'],
    ['', 'there'],
  ])('%s → %s', (input, expected) => {
    expect(firstNameOf(input)).toBe(expected);
  });
});
