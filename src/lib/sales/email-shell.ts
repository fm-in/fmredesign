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

const BRAND_MAGENTA = '#a82548';
const BODY_TEXT = '#2d2d2d';
const FOOTER_TEXT = '#666666';
const MUTED_TEXT = '#888888';
const FOOTER_BG = '#f4f1f2';
const OUTER_BG = '#eeeeee';
const FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

const URL_RE = /(https?:\/\/[^\s<]+)/g;

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
  unsubscribeUrl: string;
}

export function renderShell(input: ShellInput): string {
  const logoUrl = `${SITE_URL}/email/logo.png`;
  const address = process.env.COMPANY_ADDRESS;
  const addressLine = address
    ? `<p style="margin:0 0 12px;padding:0;color:${FOOTER_TEXT};">${escapeHtml(address)}</p>`
    : '';

  return [
    '<!DOCTYPE html>',
    '<html>',
    `<body style="margin:0;padding:0;background-color:${OUTER_BG};" bgcolor="${OUTER_BG}">`,
    `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.preheader)}</div>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${OUTER_BG}" style="width:100%;background-color:${OUTER_BG};">`,
    '<tr><td align="center" style="padding:24px 12px;">',
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:600px;max-width:600px;background-color:#ffffff;">`,
    // Header band
    `<tr><td align="center" bgcolor="${BRAND_MAGENTA}" style="background-color:${BRAND_MAGENTA};padding:32px 24px;">`,
    `<a href="${SITE_URL}" style="text-decoration:none;">`,
    `<img src="${logoUrl}" width="150" alt="FreakingMinds" style="display:block;border:0;outline:none;width:150px;max-width:150px;height:auto;" />`,
    '</a>',
    '</td></tr>',
    // Body
    `<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:32px 24px;font-family:${FONT_STACK};font-size:16px;line-height:1.6;color:${BODY_TEXT};">`,
    input.paragraphs.map(paragraphHtml).join(''),
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">',
    '<tr>',
    `<td align="center" bgcolor="${BRAND_MAGENTA}" style="background-color:${BRAND_MAGENTA};border-radius:8px;padding:14px 28px;">`,
    `<a href="${escapeHtml(input.cta.url)}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;font-family:${FONT_STACK};">${escapeHtml(input.cta.label)}</a>`,
    '</td>',
    '</tr>',
    '</table>',
    '</td></tr>',
    // Footer
    `<tr><td bgcolor="${FOOTER_BG}" style="background-color:${FOOTER_BG};padding:24px;font-family:${FONT_STACK};font-size:12px;line-height:1.5;color:${FOOTER_TEXT};">`,
    `<p style="margin:0 0 4px;padding:0;color:${BODY_TEXT};">${escapeHtml(input.ownerName)}</p>`,
    `<p style="margin:0 0 12px;padding:0;color:${FOOTER_TEXT};">FreakingMinds</p>`,
    addressLine,
    `<p style="margin:0;padding:0;color:${MUTED_TEXT};">You are receiving this because you contacted FreakingMinds. <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${MUTED_TEXT};">Unsubscribe</a></p>`,
    '</td></tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');
}
