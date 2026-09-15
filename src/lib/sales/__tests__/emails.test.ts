import { describe, it, expect } from 'vitest';
import { firstNameOf, renderSalesEmail, type SalesEmailContext } from '../emails';

const ctx: SalesEmailContext = {
  firstName: 'Priya',
  ownerName: 'Asha Rao',
  bookingUrl: 'https://cal.com/fm-in/15min?metadata%5BleadId%5D=lead_1',
  whatsappUrl: 'https://wa.me/919833257659?text=Hi',
  unsubscribeUrl: 'https://www.freakingminds.in/unsubscribe?t=abc',
  workUrl: 'https://www.freakingminds.in/work',
  scorecardUrl: 'https://www.freakingminds.in/scorecard',
};

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
