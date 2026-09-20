import { describe, it, expect } from 'vitest';
import { DIMENSIONS, RECOMMENDATIONS } from '@/lib/scorecard/questions';
import { firstNameOf, renderSalesEmail, TEAM_SIGNATURE, whatsappPrefillText, type SalesEmailContext } from '../emails';
import type { SalesEmailTemplate } from '../sequence';

const ctx: SalesEmailContext = {
  firstName: 'Priya',
  ownerName: 'Asha Rao',
  bookingUrl: 'https://cal.com/fm-in/15min?metadata%5BleadId%5D=lead_1',
  whatsappUrl: 'https://wa.me/919833257659?text=Hi',
  unsubscribeUrl: 'https://www.freakingminds.in/unsubscribe?t=abc',
  workUrl: 'https://www.freakingminds.in/work',
  scorecardUrl: 'https://www.freakingminds.in/scorecard',
};

// Full context for the eight new templates — every new optional field populated.
const richCtx: SalesEmailContext = {
  ...ctx,
  timeline: '2_3_months',
  projectType: 'website design',
  campaign: 'Diwali Sale',
  platform: 'Instagram',
  band: 'patchy',
  weakestArea: 'landing pages',
  score: 62,
  weakestScore: 40,
  bookingUrlLong: 'https://cal.com/fm-in/30min?metadata%5BleadId%5D=lead_1',
};

const ALL_TEMPLATES: SalesEmailTemplate[] = [
  'instant_reply',
  'follow_up_proof',
  'close_the_loop',
  'brief_intro',
  'brief_questions',
  'brief_close',
  'ad_intro',
  'ad_proof',
  'ad_close',
  'scorecard_intro',
  'scorecard_fix',
  'scorecard_close',
];

const BRIEF_TEMPLATES: SalesEmailTemplate[] = ['brief_intro', 'brief_questions', 'brief_close'];

/** `richCtx` with the given optional field(s) removed — for exercising fallback paths. */
function without<K extends keyof SalesEmailContext>(...keys: K[]): SalesEmailContext {
  const clone: SalesEmailContext = { ...richCtx };
  for (const key of keys) delete clone[key];
  return clone;
}

// follow_up_proof and close_the_loop: captured from the pre-shell implementation.
// instant_reply: the owner-approved revision of 2026-09-17 (the receipt now says
// "we've received it", so day 0 leads with the call). The branded HTML shell must
// never change these — only the html output changes.
const EXPECTED_TEXT: Record<'instant_reply' | 'follow_up_proof' | 'close_the_loop', string> = {
  instant_reply:
    "Hi Priya,\nI'm Asha Rao, and I'll be looking after your enquiry.\nThe quickest way forward is a 15-minute call: you tell us where growth is stuck, we tell you honestly whether we can help. Pick a time below.\nPrefer WhatsApp? Message us here: https://wa.me/919833257659?text=Hi\n\nBook a 15-minute call: https://cal.com/fm-in/15min?metadata%5BleadId%5D=lead_1\n\nAsha Rao\nFreakingMinds\n\nUnsubscribe: https://www.freakingminds.in/unsubscribe?t=abc",
  follow_up_proof:
    'Hi Priya,\nWhile you think it over, here is some of the work we have done for brands like yours: https://www.freakingminds.in/work\nIf you would rather start with a quick self-check, our marketing scorecard shows where the biggest gaps are: https://www.freakingminds.in/scorecard\nHappy to walk you through either on a short call.\n\nPick a time: https://cal.com/fm-in/15min?metadata%5BleadId%5D=lead_1\n\nAsha Rao\nFreakingMinds\n\nUnsubscribe: https://www.freakingminds.in/unsubscribe?t=abc',
  close_the_loop:
    "Hi Priya,\nI haven't heard back, so I'll assume the timing isn't right and stop following up.\nIf things change, reply to this email or book a call whenever it suits you.\n\nBook a call: https://cal.com/fm-in/15min?metadata%5BleadId%5D=lead_1\n\nAsha Rao\nFreakingMinds\n\nUnsubscribe: https://www.freakingminds.in/unsubscribe?t=abc",
};

const EXPECTED_TEAM_SIGNATURE_TEXT =
  "Hi Priya,\nWe'll be looking after your enquiry personally.\nThe quickest way forward is a 15-minute call: you tell us where growth is stuck, we tell you honestly whether we can help. Pick a time below.\nPrefer WhatsApp? Message us here: https://wa.me/919833257659?text=Hi\n\nBook a 15-minute call: https://cal.com/fm-in/15min?metadata%5BleadId%5D=lead_1\n\nThe FreakingMinds team\nFreakingMinds\n\nUnsubscribe: https://www.freakingminds.in/unsubscribe?t=abc";

describe('renderSalesEmail', () => {
  it.each(ALL_TEMPLATES)('%s carries the booking and unsubscribe links', (template) => {
    const email = renderSalesEmail(template, ctx);
    expect(email.subject.length).toBeGreaterThan(5);
    expect(email.html).toContain('Unsubscribe');
    expect(email.html).toContain(`<a href="${ctx.unsubscribeUrl}"`);
    expect(email.text).toContain(`Unsubscribe: ${ctx.unsubscribeUrl}`);
    expect(email.text).toContain(ctx.bookingUrl);
  });

  it('uses a different subject for each step', () => {
    const subjects = new Set((['instant_reply', 'follow_up_proof', 'close_the_loop'] as const).map((t) => renderSalesEmail(t, ctx).subject));
    expect(subjects.size).toBe(3);
  });

  it('instant_reply renders the approved 2026-09-17 subject and preheader', () => {
    const email = renderSalesEmail('instant_reply', ctx);
    expect(email.subject).toBe('A quick call about your enquiry, Priya');
    expect(email.html).toContain('15 minutes, and an honest answer on whether we can help.</div>');
  });

  it('instant_reply no longer repeats what the confirmation receipt already said', () => {
    for (const ownerName of ['Asha Rao', TEAM_SIGNATURE]) {
      const email = renderSalesEmail('instant_reply', { ...ctx, ownerName });
      expect(email.text).not.toMatch(/received|thanks for getting in touch|got your message/i);
    }
  });

  it('escapes HTML in names', () => {
    const email = renderSalesEmail('instant_reply', { ...ctx, firstName: '<script>alert(1)</script>' });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });
});

describe('renderSalesEmail plain-text output (exact)', () => {
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

describe('whatsappPrefillText', () => {
  it.each([
    ['Priya Shah', 'Hi, this is Priya. I got in touch'],
    ['priya visit https://spam.example', 'Hi, this is Priya. I got in touch'],
    ['asha.mehta', 'Hi, I got in touch'],
    ['Unknown', 'Hi, I got in touch'],
    ['', 'Hi, I got in touch'],
  ])('%j → %j', (name, expected) => {
    expect(whatsappPrefillText(name, 'I got in touch')).toBe(expected);
  });
});

describe('firstNameOf', () => {
  it.each([
    ['priya shah', 'Priya'],
    ['  Rahul  ', 'Rahul'],
    ['Unknown', 'there'],
    ['+919833257659', 'there'],
    ['asha.mehta', 'there'],
    ['rahul123', 'there'],
    ['sam_k', 'there'],
    ['priya@examplemail', 'there'],
    ['Priya Shah', 'Priya'],
    ["D'Souza Anil", "D'Souza"],
    ['Anne-Marie Rao', 'Anne-Marie'],
    ['', 'there'],
  ])('%s → %s', (input, expected) => {
    expect(firstNameOf(input)).toBe(expected);
  });
});

describe('brief-v1 templates', () => {
  it('brief_intro renders subject, preheader and the distinctive body line', () => {
    const email = renderSalesEmail('brief_intro', richCtx);
    expect(email.subject).toBe('Your project brief, Priya');
    expect(email.html).toContain("I&#39;ve read it — here&#39;s what happens next.");
    expect(email.text).toContain(
      "Thanks for sending the details through — I've read your brief on website design, and the timeline you mentioned is workable."
    );
    expect(email.text).toContain(`Book a 30-minute call: ${richCtx.bookingUrlLong}`);
  });

  it('brief_intro falls back to "your project" when projectType is missing', () => {
    const missing = without('projectType');
    const email = renderSalesEmail('brief_intro', missing);
    expect(email.text).toContain(
      "I've read your brief on your project, and the timeline you mentioned is workable."
    );
    expect(email.text).not.toContain('undefined');
  });

  it('brief_intro falls back to bookingUrl when bookingUrlLong is missing', () => {
    const missing = without('bookingUrlLong');
    const email = renderSalesEmail('brief_intro', missing);
    expect(email.text).toContain(`Book a 30-minute call: ${ctx.bookingUrl}`);
  });

  it('brief_intro drops the timeline clause entirely when timeline is missing', () => {
    const missing = without('timeline');
    const email = renderSalesEmail('brief_intro', missing);
    expect(email.text).toContain("Thanks for sending the details through — I've read your brief on website design.");
    expect(email.text).not.toContain('the timeline you mentioned is workable');
    expect(email.text).not.toContain('undefined');
  });

  it('brief_intro includes the timeline clause when a timeline is present', () => {
    const email = renderSalesEmail('brief_intro', richCtx);
    expect(email.text).toContain(
      "Thanks for sending the details through — I've read your brief on website design, and the timeline you mentioned is workable."
    );
  });

  it('brief_questions renders subject, preheader and the distinctive body line', () => {
    const email = renderSalesEmail('brief_questions', richCtx);
    expect(email.subject).toBe('Two things that shape the proposal');
    expect(email.html).toContain('Both change the answer quite a lot.');
    expect(email.text).toContain(
      "Before I put numbers against your website design project, two questions that change the answer quite a lot:"
    );
    expect(email.text).toContain("1. What's driving the timeline — a launch, a campaign, a funding round, or something else?");
    expect(email.text).toContain('2. Besides you, who needs to be happy with this decision?');
    expect(email.text).toContain(`Book a call: ${richCtx.bookingUrlLong}`);
  });

  it('brief_questions drops the project type word when missing', () => {
    const missing = without('projectType');
    const email = renderSalesEmail('brief_questions', missing);
    expect(email.text).toContain('Before I put numbers against your project, two questions that change the answer quite a lot:');
    expect(email.text).not.toContain('undefined');
  });

  it('brief_close renders subject, preheader and the distinctive body line', () => {
    const email = renderSalesEmail('brief_close', richCtx);
    expect(email.subject).toBe('Should I close this off?');
    expect(email.html).toContain("No reply, so I&#39;ll stop here.");
    expect(email.text).toContain('Your brief stays on file, so we won\'t start from scratch.');
    expect(email.text).toContain(`Book a call: ${richCtx.bookingUrlLong}`);
  });
});

describe('ad-lead-v1 templates', () => {
  it('ad_intro renders subject, preheader and the distinctive body line', () => {
    const email = renderSalesEmail('ad_intro', richCtx);
    expect(email.subject).toBe('About your enquiry from Diwali Sale');
    expect(email.html).toContain("One question, then I&#39;ll get out of your way.");
    expect(email.text).toContain('You filled in our form on Instagram about Diwali Sale — thanks for that.');
    expect(email.text).toContain(`Book a 15-minute call: ${ctx.bookingUrl}`);
  });

  it('ad_intro falls back when campaign is missing', () => {
    const missing = without('campaign');
    const email = renderSalesEmail('ad_intro', missing);
    expect(email.subject).toBe('About your enquiry');
    expect(email.text).toContain('You filled in one of our forms on Instagram — thanks for that.');
    expect(email.text).not.toContain('undefined');
  });

  it('ad_intro falls back when platform is missing', () => {
    const missing = without('platform');
    const email = renderSalesEmail('ad_intro', missing);
    expect(email.text).toContain('You filled in our form on one of our ads about Diwali Sale — thanks for that.');
    expect(email.text).not.toContain('undefined');
  });

  it('ad_intro falls back when both campaign and platform are missing', () => {
    const missing = without('campaign', 'platform');
    const email = renderSalesEmail('ad_intro', missing);
    expect(email.subject).toBe('About your enquiry');
    expect(email.text).toContain('You filled in one of our forms on one of our ads — thanks for that.');
    expect(email.text).not.toContain('undefined');
  });

  it('ad_proof renders subject, preheader and the distinctive body line', () => {
    const email = renderSalesEmail('ad_proof', richCtx);
    expect(email.subject).toBe("Work we've done for brands like yours");
    expect(email.html).toContain('A few examples, in case it helps.');
    expect(email.text).toContain(`In case it's useful, here's a sample of our work: ${ctx.workUrl}`);
    expect(email.text).toContain(`Book a 15-minute call: ${ctx.bookingUrl}`);
  });

  it('ad_close renders subject, preheader and the distinctive body line', () => {
    const email = renderSalesEmail('ad_close', richCtx);
    expect(email.subject).toBe('Closing the loop');
    expect(email.html).toContain('Last one from me.');
    expect(email.text).toContain("No reply, so I'll leave it here and stop emailing.");
    expect(email.text).toContain(`Book a call: ${ctx.bookingUrl}`);
  });
});

describe('scorecard-v1 templates', () => {
  it('scorecard_intro renders subject, preheader and the distinctive body line', () => {
    const email = renderSalesEmail('scorecard_intro', richCtx);
    expect(email.subject).toBe('Your scorecard: 62/100');
    expect(email.html).toContain("And the one area I&#39;d fix first.");
    expect(email.text).toContain("Here's where your marketing landed: 62/100, which puts you in the patchy range.");
    expect(email.text).toContain("The weakest area is landing pages at 40/100. That's where I'd start, because it's usually what holds the rest back.");
    expect(email.text).toContain(`Book the walkthrough: ${ctx.bookingUrl}`);
  });

  it('scorecard_intro drops the score paragraph and changes subject when score is missing', () => {
    const missing = without('score');
    const email = renderSalesEmail('scorecard_intro', missing);
    expect(email.subject).toBe('Your marketing scorecard');
    expect(email.text).not.toContain("Here's where your marketing landed");
    expect(email.text).not.toContain('undefined');
  });

  it('scorecard_intro drops the range clause when band is missing', () => {
    const missing = without('band');
    const email = renderSalesEmail('scorecard_intro', missing);
    expect(email.text).toContain("Here's where your marketing landed: 62/100.");
    expect(email.text).not.toContain('which puts you in the');
    expect(email.text).not.toContain('undefined');
  });

  it('scorecard_intro drops the weakest-area paragraph when weakestArea is missing', () => {
    const missing = without('weakestArea');
    const email = renderSalesEmail('scorecard_intro', missing);
    expect(email.text).not.toContain('The weakest area is');
    expect(email.text).not.toContain('undefined');
  });

  describe("scorecard_fix quoting the scorecard's own advice", () => {
    const measurement = DIMENSIONS.find((dimension) => dimension.id === 'measurement');
    const fixCtx: SalesEmailContext = {
      ...ctx,
      weakestArea: measurement?.label ?? '',
      weakestScore: 17,
      weakestFix: RECOMMENDATIONS.measurement?.at_risk ?? '',
    };

    it('renders the approved 2026-09-17 copy, quoting the recommendation as its own paragraph', () => {
      expect(fixCtx.weakestArea).toBe('Measurement');
      const email = renderSalesEmail('scorecard_fix', fixCtx);

      expect(email.subject).toBe("The one fix I'd start with");
      expect(email.html).toContain('For Measurement, specifically.</div>');
      expect(email.text).toBe(
        [
          'Hi Priya,',
          "Your scorecard's weakest area was Measurement. Here's where I'd start:",
          RECOMMENDATIONS.measurement?.at_risk,
          "Happy to look at yours specifically and tell you what I'd do.",
          '',
          `Book a call: ${ctx.bookingUrl}`,
          '',
          'Asha Rao',
          'FreakingMinds',
          '',
          `Unsubscribe: ${ctx.unsubscribeUrl}`,
        ].join('\n')
      );
      expect(email.html).toContain(`<p style="margin:0 0 16px;padding:0;">${RECOMMENDATIONS.measurement?.at_risk}</p>`);
    });

    it.each([
      ['weakestFix', { ...fixCtx, weakestFix: undefined }],
      ['weakestArea', { ...fixCtx, weakestArea: undefined }],
    ] as const)('falls back to the original approved copy when %s is missing', (_missing, context) => {
      const email = renderSalesEmail('scorecard_fix', context);
      expect(email.html).toContain('Usually the simplest one, not more budget.</div>');
      expect(email.text).not.toContain("Here's where I'd start:");
      expect(email.text).not.toContain('undefined');
      expect(email.text).toContain('the fix that usually moves the needle first is the simplest one');
    });
  });

  it('scorecard_fix renders subject, preheader and the distinctive body line', () => {
    const email = renderSalesEmail('scorecard_fix', richCtx);
    expect(email.subject).toBe("The one fix I'd start with");
    expect(email.html).toContain('Usually the simplest one, not more budget.');
    expect(email.text).toContain(
      "On landing pages, the fix that usually moves the needle first is the simplest one — and it's rarely more budget."
    );
    expect(email.text).toContain(`Book a call: ${ctx.bookingUrl}`);
  });

  it('scorecard_fix falls back when weakestArea is missing', () => {
    const missing = without('weakestArea');
    const email = renderSalesEmail('scorecard_fix', missing);
    expect(email.text).toContain(
      "On the weakest area in your scorecard, the fix that usually moves the needle first is the simplest one — and it's rarely more budget."
    );
    expect(email.text).not.toContain('undefined');
  });

  it('scorecard_close renders subject, preheader and the distinctive body line', () => {
    const email = renderSalesEmail('scorecard_close', richCtx);
    expect(email.subject).toBe('Should I close your scorecard?');
    expect(email.html).toContain('Your results stay on file either way.');
    expect(email.text).toContain("I'll stop following up on your scorecard now.");
    expect(email.text).toContain(`Book a call: ${ctx.bookingUrl}`);
  });
});

describe('names taken from an email address', () => {
  it.each(['asha.mehta', 'rahul123', 'sam_k'])('%s greets with "Hi there," and a name-free subject', (name) => {
    const email = renderSalesEmail('brief_intro', { ...ctx, firstName: firstNameOf(name) });
    expect(email.subject).toBe('Your project brief');
    expect(email.text.startsWith('Hi there,\n')).toBe(true);
  });
});

describe('subjects without a real first name', () => {
  const nameless: SalesEmailContext = { ...richCtx, firstName: firstNameOf('Unknown') };

  it.each([
    ['brief_intro', 'Your project brief'],
    ['instant_reply', 'A quick call about your enquiry'],
    ['follow_up_proof', 'What this could look like for you'],
  ] as const)('%s drops the name instead of saying "there"', (template, subject) => {
    const email = renderSalesEmail(template, nameless);
    expect(email.subject).toBe(subject);
    expect(email.text).toContain('Hi there,');
  });

  it.each(ALL_TEMPLATES)('%s never ends a subject with ", there"', (template) => {
    expect(renderSalesEmail(template, nameless).subject).not.toMatch(/,\s*there$/i);
  });

  it('keeps the name in the subject when there is one', () => {
    expect(renderSalesEmail('brief_intro', richCtx).subject).toBe('Your project brief, Priya');
    expect(renderSalesEmail('instant_reply', richCtx).subject).toBe('A quick call about your enquiry, Priya');
    expect(renderSalesEmail('follow_up_proof', richCtx).subject).toBe('What this could look like for you, Priya');
  });
});

describe('new templates never render "undefined" with a bare context', () => {
  const bareCtx: SalesEmailContext = { ...ctx };

  it.each(ALL_TEMPLATES)('%s', (template) => {
    const email = renderSalesEmail(template, bareCtx);
    expect(email.html).not.toContain('undefined');
    expect(email.text).not.toContain('undefined');
    expect(email.subject).not.toContain('undefined');
  });
});

describe('CTA URL routing', () => {
  it.each(BRIEF_TEMPLATES)('%s uses bookingUrlLong for its CTA', (template) => {
    const email = renderSalesEmail(template, richCtx);
    expect(email.text).toContain(richCtx.bookingUrlLong as string);
    expect(email.text).not.toContain(ctx.bookingUrl);
  });

  it.each(ALL_TEMPLATES.filter((t) => !BRIEF_TEMPLATES.includes(t)))('%s uses bookingUrl for its CTA', (template) => {
    const email = renderSalesEmail(template, richCtx);
    expect(email.text).toContain(ctx.bookingUrl);
    expect(email.text).not.toContain(richCtx.bookingUrlLong as string);
  });
});
