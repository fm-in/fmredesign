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
