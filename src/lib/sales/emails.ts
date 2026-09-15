/**
 * Follow-up emails to people who contacted FreakingMinds. Deliberately plain:
 * short, from a named person, one link to act on — they should read like a
 * reply, not a newsletter.
 */

import type { SalesEmailTemplate } from '@/lib/sales/sequence';

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
  paragraphs: string[];
  cta: { label: string; url: string };
}

const URL_RE = /(https?:\/\/[^\s<]+)/g;

/** Signature used when a lead has no owner yet. */
export const TEAM_SIGNATURE = 'The FreakingMinds team';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paragraphHtml(text: string): string {
  const linked = escapeHtml(text).replace(URL_RE, (url) => `<a href="${url}" style="color:#a82548">${url}</a>`);
  return `<p style="margin:0 0 16px">${linked}</p>`;
}

function copyFor(template: SalesEmailTemplate, ctx: SalesEmailContext): Copy {
  switch (template) {
    case 'instant_reply':
      return {
        subject: `Got your message, ${ctx.firstName}`,
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

  const html = [
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#ffffff;',
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#2d2d2d\">",
    '<div style="max-width:560px">',
    copy.paragraphs.map(paragraphHtml).join(''),
    `<p style="margin:24px 0"><a href="${escapeHtml(copy.cta.url)}" style="display:inline-block;background:#a82548;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(copy.cta.label)}</a></p>`,
    `<p style="margin:0 0 4px">${escapeHtml(ctx.ownerName)}</p>`,
    '<p style="margin:0 0 24px;color:#666666">FreakingMinds</p>',
    `<p style="margin:0;font-size:12px;color:#888888">You are receiving this because you contacted FreakingMinds. <a href="${escapeHtml(ctx.unsubscribeUrl)}" style="color:#888888">Unsubscribe</a></p>`,
    '</div></body></html>',
  ].join('');

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
