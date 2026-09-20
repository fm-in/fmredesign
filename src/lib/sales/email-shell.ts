/**
 * Branded table-based HTML shell for sales emails. Table layout, inline
 * styles only, explicit background colours everywhere — Outlook, Gmail
 * dark mode and images-blocked clients are all primitive in their own way,
 * and this has to read correctly in every one of them.
 *
 * `escapeHtml` lives here (re-exported from `@/lib/sales/emails` for
 * existing callers) so this module has no dependency back on emails.ts.
 */

import { SITE_URL } from '@/lib/site-url';
import {
  BRAND_MAGENTA, HEADING_COLOR, TEXT_COLOR, MUTED_COLOR, FAINT_COLOR,
  LIGHT_BG, CARD_BG, BORDER_COLOR, HAIRLINE,
  SANS, COMPANY_ABOUT, LIGHT_ONLY_HEAD, LOGO_URL,
} from '@/lib/email/brand';

const BODY_TEXT = TEXT_COLOR;
const FOOTER_TEXT = MUTED_COLOR;
const MUTED_TEXT = FAINT_COLOR;
const FONT_STACK = SANS;

/** A bare URL. It never ends in sentence punctuation, so "see https://x.in/work." links only the URL. */
const URL_RE = /(https?:\/\/[^\s<]*[^\s<.,;:!?)])/g;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapes, then linkifies bare URLs. Same behaviour as the previous plain renderer. */
function paragraphHtml(text: string): string {
  const linked = escapeHtml(text).replace(URL_RE, (url) => `<a href="${url}" style="color:${BRAND_MAGENTA}">${url}</a>`);
  return `<p style="margin:0 0 16px;padding:0;">${linked}</p>`;
}

export interface ShellInput {
  preheader: string;
  paragraphs: string[];
  cta: { label: string; url: string };
  ownerName: string;
  /**
   * Sales email always passes one. Transactional mail (confirmation receipts)
   * leaves it out, and the footer then carries no unsubscribe line at all.
   */
  unsubscribeUrl?: string;
}

interface FooterLine {
  html: string;
  color: string;
  /** Bottom margin in px. The last line always gets 0, so nothing trails it. */
  gap: number;
}

function footerHtml(lines: FooterLine[]): string {
  return lines
    .map((line, index) => {
      const margin = index === lines.length - 1 ? '0' : `0 0 ${line.gap}px`;
      return `<p style="margin:${margin};padding:0;color:${line.color};">${line.html}</p>`;
    })
    .join('');
}

export function renderShell(input: ShellInput): string {
  const address = process.env.COMPANY_ADDRESS;
  const footerLines: FooterLine[] = [
    { html: escapeHtml(input.ownerName), color: HEADING_COLOR, gap: 4 },
    { html: 'FreakingMinds', color: HEADING_COLOR, gap: 2 },
    { html: escapeHtml(COMPANY_ABOUT), color: FOOTER_TEXT, gap: 12 },
  ];
  /*
   * The postal address rides with the unsubscribe link, not on its own.
   *
   * A commercial email offering an unsubscribe is expected to carry a
   * physical address — it is a CAN-SPAM requirement and it measurably helps
   * deliverability, so dropping it from marketing mail would be a real
   * regression. A confirmation receipt is neither commercial nor
   * unsubscribable, so it carries no address and names no city.
   */
  if (input.unsubscribeUrl) {
    if (address) footerLines.push({ html: escapeHtml(address), color: FOOTER_TEXT, gap: 12 });
    footerLines.push({
      html: `You are receiving this because you contacted FreakingMinds. <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${MUTED_TEXT};">Unsubscribe</a>`,
      color: MUTED_TEXT,
      gap: 0,
    });
  }

  return [
    '<!DOCTYPE html>',
    `<html bgcolor="${LIGHT_BG}" style="background-color:${LIGHT_BG};">`,
    `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${LIGHT_ONLY_HEAD}</head>`,
    `<body style="margin:0;padding:0;background-color:${LIGHT_BG};font-family:${FONT_STACK};" bgcolor="${LIGHT_BG}">`,
    `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.preheader)}</div>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${LIGHT_BG}" style="width:100%;background-color:${LIGHT_BG};">`,
    `<tr><td align="center" bgcolor="${LIGHT_BG}" style="background-color:${LIGHT_BG};padding:44px 16px;">`,
    // Masthead — the full-colour mark straight on white, aligned to the
    // text column below it rather than to the card's border.
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${LIGHT_BG}" style="width:600px;max-width:600px;background-color:${LIGHT_BG};">`,
    `<tr><td bgcolor="${LIGHT_BG}" style="background-color:${LIGHT_BG};padding:0 0 18px 40px;">`,
    `<a href="${SITE_URL}" style="text-decoration:none;">`,
    `<img src="${LOGO_URL}" width="132" alt="FreakingMinds" style="display:block;border:0;outline:none;width:132px;max-width:132px;height:auto;" />`,
    '</a>',
    '</td></tr>',
    '</table>',
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${CARD_BG}" style="width:600px;max-width:600px;background-color:${CARD_BG};border:1px solid ${BORDER_COLOR};">`,
    // One flat accent rule where the magenta header band used to be.
    `<tr><td bgcolor="${BRAND_MAGENTA}" style="background-color:${BRAND_MAGENTA};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>`,
    // Body
    `<tr><td bgcolor="${CARD_BG}" style="background-color:${CARD_BG};padding:34px 40px 36px;font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:${BODY_TEXT};">`,
    input.paragraphs.map(paragraphHtml).join(''),
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;">',
    '<tr>',
    `<td align="center" bgcolor="${BRAND_MAGENTA}" style="background-color:${BRAND_MAGENTA};border-radius:999px;padding:15px 30px;">`,
    `<a href="${escapeHtml(input.cta.url)}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;line-height:1;letter-spacing:0.02em;font-family:${FONT_STACK};">${escapeHtml(input.cta.label)}</a>`,
    '</td>',
    '</tr>',
    '</table>',
    '</td></tr>',
    // Footer
    `<tr><td bgcolor="${CARD_BG}" style="background-color:${CARD_BG};padding:22px 40px 26px;border-top:1px solid ${HAIRLINE};font-family:${FONT_STACK};font-size:12px;line-height:19px;color:${FOOTER_TEXT};">`,
    footerHtml(footerLines),
    '</td></tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');
}
