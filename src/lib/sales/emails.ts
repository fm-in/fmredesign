/**
 * Follow-up emails to people who contacted FreakingMinds. Deliberately plain:
 * short, from a named person, one link to act on — they should read like a
 * reply, not a newsletter.
 */

import { escapeHtml, renderShell } from '@/lib/sales/email-shell';
import type { SalesEmailTemplate } from '@/lib/sales/sequence';

export { escapeHtml };

export interface SalesEmailContext {
  firstName: string;
  ownerName: string;
  bookingUrl: string;
  whatsappUrl: string;
  unsubscribeUrl: string;
  workUrl: string;
  scorecardUrl: string;
  /** A longer booking link (30-minute slot) used by the brief-v1 sequence. Falls back to `bookingUrl`. */
  bookingUrlLong?: string;
  /** The lead's stated timeline. Only its presence is used: it gates a clause in `brief_intro`, never its literal text. */
  timeline?: string;
  /** What the get-started brief describes the project as, e.g. "a website rebuild". */
  projectType?: string;
  /** The ad campaign name the lead came from. */
  campaign?: string;
  /** The ad platform the lead came from, e.g. "Instagram". */
  platform?: string;
  /** The scorecard's overall band, e.g. "developing". */
  band?: string;
  /** The scorecard's lowest-scoring area, e.g. "landing pages". */
  weakestArea?: string;
  /** The scorecard's overall score out of 100. */
  score?: number;
  /** The score of the weakest area out of 100. */
  weakestScore?: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface Copy {
  subject: string;
  preheader: string;
  paragraphs: string[];
  cta: { label: string; url: string };
}

/** Signature used when a lead has no owner yet. */
export const TEAM_SIGNATURE = 'The FreakingMinds team';

function copyFor(template: SalesEmailTemplate, ctx: SalesEmailContext): Copy {
  switch (template) {
    case 'instant_reply':
      return {
        subject: `Got your message, ${ctx.firstName}`,
        preheader: "Thanks for reaching out — here's the quickest way to talk.",
        paragraphs: [
          `Hi ${ctx.firstName},`,
          ctx.ownerName === TEAM_SIGNATURE
            ? "Thanks for getting in touch with FreakingMinds. We'll be looking after your enquiry personally."
            : `Thanks for getting in touch with FreakingMinds. I'm ${ctx.ownerName}, and I'll be looking after your enquiry.`,
          'The quickest way forward is a 15-minute call. You tell us where growth is stuck, and we tell you honestly whether we can help. Pick a time that suits you below.',
          `Prefer WhatsApp? Message us here and we'll pick it up: ${ctx.whatsappUrl}`,
        ],
        cta: { label: 'Book a 15-minute call', url: ctx.bookingUrl },
      };
    case 'follow_up_proof':
      return {
        subject: `What this could look like for you, ${ctx.firstName}`,
        preheader: 'A bit of proof, in case it helps you decide.',
        paragraphs: [
          `Hi ${ctx.firstName},`,
          `While you think it over, here is some of the work we have done for brands like yours: ${ctx.workUrl}`,
          `If you would rather start with a quick self-check, our marketing scorecard shows where the biggest gaps are: ${ctx.scorecardUrl}`,
          'Happy to walk you through either on a short call.',
        ],
        cta: { label: 'Pick a time', url: ctx.bookingUrl },
      };
    case 'close_the_loop':
      return {
        subject: 'Should I close your enquiry?',
        preheader: 'Following up once more before I close this out.',
        paragraphs: [
          `Hi ${ctx.firstName},`,
          "I haven't heard back, so I'll assume the timing isn't right and stop following up.",
          'If things change, reply to this email or book a call whenever it suits you.',
        ],
        cta: { label: 'Book a call', url: ctx.bookingUrl },
      };

    // --- brief-v1: the get-started form ---

    case 'brief_intro': {
      // Fallback rule (approved-copy.md): when the timeline is unknown, drop the
      // clause after the comma entirely — never claim a timeline that was never given.
      const timelineClause = ctx.timeline ? ', and the timeline you mentioned is workable' : '';
      return {
        subject: `Your project brief, ${ctx.firstName}`,
        preheader: "I've read it — here's what happens next.",
        paragraphs: [
          `Hi ${ctx.firstName},`,
          `Thanks for sending the details through — I've read your brief on ${ctx.projectType ?? 'your project'}${timelineClause}.`,
          "Here's what happens next. I'll put together an approach based on what you've described. The fastest way to make that useful is a 30-minute call where you tell me what success looks like, and I tell you honestly whether we're the right people for it.",
          `Prefer WhatsApp? Message us here: ${ctx.whatsappUrl}`,
        ],
        cta: { label: 'Book a 30-minute call', url: ctx.bookingUrlLong ?? ctx.bookingUrl },
      };
    }
    case 'brief_questions': {
      const projectPhrase = ctx.projectType ? `${ctx.projectType} ` : '';
      return {
        subject: 'Two things that shape the proposal',
        preheader: 'Both change the answer quite a lot.',
        paragraphs: [
          `Hi ${ctx.firstName},`,
          `Before I put numbers against your ${projectPhrase}project, two questions that change the answer quite a lot:`,
          "1. What's driving the timeline — a launch, a campaign, a funding round, or something else?",
          '2. Besides you, who needs to be happy with this decision?',
          "Reply here, or take ten minutes on a call and we'll cover both.",
        ],
        cta: { label: 'Book a call', url: ctx.bookingUrlLong ?? ctx.bookingUrl },
      };
    }
    case 'brief_close':
      return {
        subject: 'Should I close this off?',
        preheader: "No reply, so I'll stop here.",
        paragraphs: [
          `Hi ${ctx.firstName},`,
          "I haven't heard back, so I'll assume the timing isn't right and stop following up.",
          "If things change, reply to this or book whenever it suits. Your brief stays on file, so we won't start from scratch.",
        ],
        cta: { label: 'Book a call', url: ctx.bookingUrlLong ?? ctx.bookingUrl },
      };

    // --- ad-lead-v1: Meta, Google lead forms, Zapier/Make ---

    case 'ad_intro': {
      const formPhrase = ctx.campaign ? 'our form' : 'one of our forms';
      const platformPhrase = ctx.platform ?? 'one of our ads';
      const aboutClause = ctx.campaign ? ` about ${ctx.campaign}` : '';
      return {
        subject: ctx.campaign ? `About your enquiry from ${ctx.campaign}` : 'About your enquiry',
        preheader: "One question, then I'll get out of your way.",
        paragraphs: [
          `Hi ${ctx.firstName},`,
          `You filled in ${formPhrase} on ${platformPhrase}${aboutClause} — thanks for that.`,
          "One question so I don't waste your time: what's the main thing you're trying to fix right now?",
          `Reply here, or message us on WhatsApp: ${ctx.whatsappUrl}. If it's easier to talk, grab 15 minutes below.`,
        ],
        cta: { label: 'Book a 15-minute call', url: ctx.bookingUrl },
      };
    }
    case 'ad_proof':
      return {
        subject: "Work we've done for brands like yours",
        preheader: 'A few examples, in case it helps.',
        paragraphs: [
          `Hi ${ctx.firstName},`,
          `In case it's useful, here's a sample of our work: ${ctx.workUrl}`,
          "If any of it looks like the problem you're solving, fifteen minutes is enough to find out whether we can help.",
        ],
        cta: { label: 'Book a 15-minute call', url: ctx.bookingUrl },
      };
    case 'ad_close':
      return {
        subject: 'Closing the loop',
        preheader: 'Last one from me.',
        paragraphs: [
          `Hi ${ctx.firstName},`,
          "No reply, so I'll leave it here and stop emailing.",
          "If the timing improves, we're a message away.",
        ],
        cta: { label: 'Book a call', url: ctx.bookingUrl },
      };

    // --- scorecard-v1: converted scorecard submissions ---

    case 'scorecard_intro': {
      const paragraphs = [`Hi ${ctx.firstName},`];
      if (ctx.score !== undefined) {
        const bandClause = ctx.band ? `, which puts you in the ${ctx.band} range` : '';
        paragraphs.push(`Here's where your marketing landed: ${ctx.score}/100${bandClause}.`);
      }
      if (ctx.weakestArea) {
        const scoreClause = ctx.weakestScore !== undefined ? ` at ${ctx.weakestScore}/100` : '';
        paragraphs.push(
          `The weakest area is ${ctx.weakestArea}${scoreClause}. That's where I'd start, because it's usually what holds the rest back.`
        );
      }
      paragraphs.push('Want me to walk you through the full breakdown? Fifteen minutes, no pitch.');
      return {
        subject: ctx.score !== undefined ? `Your scorecard: ${ctx.score}/100` : 'Your marketing scorecard',
        preheader: "And the one area I'd fix first.",
        paragraphs,
        cta: { label: 'Book the walkthrough', url: ctx.bookingUrl },
      };
    }
    case 'scorecard_fix': {
      const weakestAreaPhrase = ctx.weakestArea ?? 'the weakest area in your scorecard';
      return {
        subject: "The one fix I'd start with",
        preheader: 'Usually the simplest one, not more budget.',
        paragraphs: [
          `Hi ${ctx.firstName},`,
          `On ${weakestAreaPhrase}, the fix that usually moves the needle first is the simplest one — and it's rarely more budget.`,
          "Most businesses see movement within a month of sorting it. Happy to look at yours specifically and tell you what I'd do.",
        ],
        cta: { label: 'Book a call', url: ctx.bookingUrl },
      };
    }
    case 'scorecard_close':
      return {
        subject: 'Should I close your scorecard?',
        preheader: 'Your results stay on file either way.',
        paragraphs: [
          `Hi ${ctx.firstName},`,
          "I'll stop following up on your scorecard now.",
          'Your results stay on file, so if you want to talk it through later, just reply.',
        ],
        cta: { label: 'Book a call', url: ctx.bookingUrl },
      };
  }
}

export function renderSalesEmail(template: SalesEmailTemplate, ctx: SalesEmailContext): RenderedEmail {
  const copy = copyFor(template, ctx);

  const html = renderShell({
    preheader: copy.preheader,
    paragraphs: copy.paragraphs,
    cta: copy.cta,
    ownerName: ctx.ownerName,
    unsubscribeUrl: ctx.unsubscribeUrl,
  });

  const text = [
    ...copy.paragraphs,
    '',
    `${copy.cta.label}: ${copy.cta.url}`,
    '',
    ctx.ownerName,
    'FreakingMinds',
    '',
    `Unsubscribe: ${ctx.unsubscribeUrl}`,
  ].join('\n');

  return { subject: copy.subject, html, text };
}

/** "priya shah" → "Priya". Falls back to "there" when the name is not a name. */
export function firstNameOf(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? '';
  if (!first || first === 'Unknown' || !/^\p{L}/u.test(first)) return 'there';
  return first.charAt(0).toUpperCase() + first.slice(1);
}
