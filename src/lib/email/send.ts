import { getResend } from './resend';
import { SITE_URL } from '@/lib/site-url';
import {
  BRAND_MAGENTA, HEADING_COLOR, TEXT_COLOR, MUTED_COLOR, FAINT_COLOR,
  LIGHT_BG, CARD_BG, PANEL_BG, BORDER_COLOR, HAIRLINE,
  SERIF, SANS, COMPANY_ABOUT, LIGHT_ONLY_HEAD, LOGO_URL,
} from './brand';

const FROM = 'FreakingMinds <notifications@freakingminds.in>';
const FALLBACK_EMAIL = 'freakingmindsdigital@gmail.com';

function getNotificationEmail(): string {
  return process.env.NOTIFICATION_EMAIL || FALLBACK_EMAIL;
}

// ---------------------------------------------------------------------------
// Core sender — routes through Inngest for durable delivery
// ---------------------------------------------------------------------------

interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOpts): Promise<void> {
  try {
    const { inngest } = await import('@/lib/inngest/client');
    await inngest.send({
      name: 'email/send',
      data: {
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      },
    });
  } catch {
    // Fallback: direct send if Inngest is unreachable
    try {
      const resend = getResend();
      if (!resend) return;
      await resend.emails.send({
        from: FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
    } catch (fallbackErr) {
      console.error('Email send failed (both Inngest and fallback):', fallbackErr);
    }
  }
}

/** Shortcut: send to the team notification address */
export function notifyTeam(subject: string, html: string): void {
  sendEmail({ to: getNotificationEmail(), subject, html });
}

/** Send to a specific recipient */
export function notifyRecipient(to: string, subject: string, html: string): void {
  sendEmail({ to, subject, html });
}

// Re-export getResend for use by Inngest email functions
export { FROM };

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

/**
 * The shell every transactional email renders into.
 *
 * Notes on the parts that are not obvious from the markup — kept here rather
 * than as HTML comments, which would be shipped to every recipient and shown
 * to anyone who views the source:
 *
 * - **One left edge.** Logo, headline, body and footer all start at the same
 *   x. The logo is deep magenta on transparency so it needs no backing, and
 *   it is indented to the text column rather than the border, because a few
 *   px of disagreement between the two is exactly what reads as misaligned.
 * - **Square corners, no shadow.** A rounded card cannot hold a full-bleed
 *   accent rule: `overflow:hidden` on a `display:table` element is not
 *   honoured everywhere, so the rule either leaves white notches in the
 *   corners or juts out of them. Square sidesteps it and reads more
 *   editorial anyway. A shadow under a white card on a white ground reads
 *   as dirt rather than depth, so the 1px hairline is the only edge.
 * - **Forcing light.** This is what makes the mail go black on a phone, and
 *   it is not transparency — `<body>` and the full-width wrapper have always
 *   painted themselves, and the mail renders white even with `<html>`,
 *   `<head>` and `<body>` stripped and the rest dropped into a dark page,
 *   which is precisely what Gmail does to it. The black comes from a client
 *   deciding to rewrite the colours.
 *
 *   `supported-color-schemes` takes scheme *names*. It had been given
 *   `light only`, and `only` is not a scheme name, so the value was
 *   malformed and the opt-out it was supposed to carry did nothing. It now
 *   reads `light`, `color-scheme` uses the canonical `only light` order, and
 *   the same instruction is repeated as a real CSS declaration on `:root`
 *   because some clients keep `<style>` and drop the meta.
 *
 *   That covers Apple Mail. It does not cover the Gmail app or Outlook,
 *   which invert regardless and offer no opt-out. The defence there is that
 *   every element paints itself — `bgcolor` for Outlook's Word engine and
 *   `background-color` for everything else — so a client that inverts
 *   inverts the whole thing evenly instead of leaving it patchy.
 */
function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html bgcolor="${LIGHT_BG}" style="background-color:${LIGHT_BG}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${LIGHT_ONLY_HEAD}</head>
<body style="margin:0;padding:0;background-color:${LIGHT_BG};font-family:${SANS};-webkit-font-smoothing:antialiased" bgcolor="${LIGHT_BG}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${LIGHT_BG}" style="background-color:${LIGHT_BG};padding:44px 16px">
<tr><td align="center" bgcolor="${LIGHT_BG}" style="background-color:${LIGHT_BG}">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${LIGHT_BG}" style="width:600px;max-width:600px;background-color:${LIGHT_BG}">
  <tr><td bgcolor="${LIGHT_BG}" style="background-color:${LIGHT_BG};padding:0 0 18px 40px">
    <a href="${SITE_URL}" style="text-decoration:none">
      <img src="${LOGO_URL}" alt="FreakingMinds" width="132" style="display:block;width:132px;max-width:132px;height:auto;border:0;outline:none" />
    </a>
  </td></tr>
</table>

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${CARD_BG}" style="width:600px;max-width:600px;background-color:${CARD_BG};border:1px solid ${BORDER_COLOR}">

  <tr><td bgcolor="${BRAND_MAGENTA}" style="background-color:${BRAND_MAGENTA};height:3px;line-height:3px;font-size:0">&nbsp;</td></tr>

  <tr><td bgcolor="${CARD_BG}" style="background-color:${CARD_BG};padding:34px 40px 0">
    <h1 style="margin:0;color:${HEADING_COLOR};font-family:${SERIF};font-size:27px;font-weight:400;line-height:1.2;letter-spacing:-0.01em">${title}</h1>
  </td></tr>

  <tr><td bgcolor="${CARD_BG}" style="background-color:${CARD_BG};padding:22px 40px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${HAIRLINE}" style="background-color:${HAIRLINE};height:1px;line-height:1px;font-size:0">&nbsp;</td></tr></table>
  </td></tr>

  <tr><td bgcolor="${CARD_BG}" style="background-color:${CARD_BG};padding:26px 40px 36px;font-family:${SANS};font-size:15px;line-height:1.6;color:${TEXT_COLOR}">
    ${body}
  </td></tr>

  <tr><td bgcolor="${PANEL_BG}" style="background-color:${PANEL_BG};padding:22px 40px 26px;border-top:1px solid ${HAIRLINE};font-family:${SANS}">
    <div style="color:${HEADING_COLOR};font-size:12px;font-weight:600;line-height:19px">FreakingMinds</div>
    <div style="color:${MUTED_COLOR};font-size:12px;line-height:19px;margin:1px 0 7px">${COMPANY_ABOUT}</div>
    <div style="color:${MUTED_COLOR};font-size:12px;line-height:19px">
      <a href="${SITE_URL}" style="color:${BRAND_MAGENTA};text-decoration:none">freakingminds.in</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:hello@freakingminds.in" style="color:${MUTED_COLOR};text-decoration:none">hello@freakingminds.in</a>
    </div>
  </td></tr>

</table>

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${LIGHT_BG}" style="width:600px;max-width:600px;background-color:${LIGHT_BG}">
  <tr><td align="center" bgcolor="${LIGHT_BG}" style="background-color:${LIGHT_BG};padding:20px 0 0;color:${FAINT_COLOR};font-family:${SANS};font-size:11px;line-height:16px">
    &copy; ${new Date().getFullYear()} FreakingMinds Digital. All rights reserved.
  </td></tr>
</table>

</td></tr>
</table>
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:9px 18px 9px 0;border-bottom:1px solid ${HAIRLINE};color:${MUTED_COLOR};font-family:${SANS};font-size:11px;font-weight:600;vertical-align:top;white-space:nowrap;text-transform:uppercase;letter-spacing:0.09em;line-height:20px">${label}</td>
    <td style="padding:9px 0;border-bottom:1px solid ${HAIRLINE};color:${HEADING_COLOR};font-family:${SANS};font-size:14px;line-height:20px">${value}</td>
  </tr>`;
}

function dataTable(rows: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:20px 0;border-collapse:collapse">${rows}</table>`;
}

function badge(text: string, color: string = BRAND_MAGENTA): string {
  return `<span style="display:inline-block;background-color:${color};color:#ffffff;padding:4px 11px;border-radius:999px;font-family:${SANS};font-size:10px;font-weight:600;letter-spacing:0.09em;line-height:15px;text-transform:uppercase">${text}</span>`;
}

/** A pill, like `.btn--primary` on the site. Outlook squares the corners and
 *  still fills, because the colour is on the `<td>` rather than the `<a>`. */
function ctaButton(text: string, href: string, color: string = BRAND_MAGENTA): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px"><tr>
    <td align="center" bgcolor="${color}" style="background-color:${color};border-radius:999px;padding:15px 30px">
      <a href="${href}" style="display:inline-block;color:#ffffff;font-family:${SANS};font-size:14px;font-weight:600;line-height:1;letter-spacing:0.02em;text-decoration:none">${text}</a>
    </td>
  </tr></table>`;
}

// ---------------------------------------------------------------------------
// Template functions
// ---------------------------------------------------------------------------

interface LeadEmailData {
  name: string;
  email: string;
  company: string;
  projectType?: string;
  budgetRange?: string;
  timeline?: string;
  primaryChallenge?: string;
  leadScore?: number;
  priority?: string;
}

export function newLeadEmail(data: LeadEmailData): { subject: string; html: string } {
  const priorityColor = data.priority === 'high' ? '#dc2626' : data.priority === 'medium' ? '#f59e0b' : '#22c55e';

  const body = `
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">A new lead just came in from the website.</p>
    ${dataTable(
      row('Name', data.name) +
      row('Email', `<a href="mailto:${data.email}" style="color:${BRAND_MAGENTA};text-decoration:none">${data.email}</a>`) +
      row('Company', data.company) +
      (data.projectType ? row('Project', data.projectType) : '') +
      (data.budgetRange ? row('Budget', data.budgetRange) : '') +
      (data.timeline ? row('Timeline', data.timeline) : '') +
      (data.primaryChallenge ? row('Challenge', data.primaryChallenge) : '') +
      (data.leadScore !== undefined ? row('Score', `<strong>${data.leadScore}</strong>/100`) : '') +
      (data.priority ? row('Priority', badge(data.priority.toUpperCase(), priorityColor)) : '')
    )}
    ${ctaButton('View in Dashboard', `${SITE_URL}/admin/leads`)}
  `;

  return {
    subject: `New Lead: ${data.name} (${data.company})`,
    html: emailWrapper('New Lead Received', body),
  };
}

interface SupportTicketEmailData {
  ticketId: string;
  clientName: string;
  title: string;
  description: string;
  priority: string;
  category: string;
}

export function newSupportTicketEmail(data: SupportTicketEmailData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">A client has submitted a new support ticket.</p>
    ${dataTable(
      row('Client', data.clientName) +
      row('Title', data.title) +
      row('Priority', badge(data.priority.toUpperCase())) +
      row('Category', data.category) +
      row('Description', data.description)
    )}
    ${ctaButton('Manage Ticket', `${SITE_URL}/admin/support`)}
  `;

  return {
    subject: `Support Ticket: ${data.title} (${data.clientName})`,
    html: emailWrapper('New Support Ticket', body),
  };
}

interface TicketStatusUpdateData {
  clientName: string;
  title: string;
  oldStatus?: string;
  newStatus: string;
  assignedTo?: string;
}

export function ticketStatusUpdateEmail(data: TicketStatusUpdateData): { subject: string; html: string } {
  const statusLabel = data.newStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const body = `
    <p style="margin:0 0 14px;color:${HEADING_COLOR};font-size:15px;font-weight:600;line-height:1.6">Hi ${data.clientName},</p>
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">Your support ticket has been updated.</p>
    ${dataTable(
      row('Ticket', data.title) +
      row('Status', badge(statusLabel)) +
      (data.assignedTo ? row('Assigned To', data.assignedTo) : '')
    )}
    ${ctaButton('View in Client Portal', `${SITE_URL}/client`)}
  `;

  return {
    subject: `Ticket Update: ${data.title} — ${statusLabel}`,
    html: emailWrapper('Support Ticket Update', body),
  };
}

interface TalentApplicationData {
  fullName: string;
  email: string;
  category?: string;
  experience?: string;
}

export function talentApplicationReceivedEmail(data: TalentApplicationData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 14px;color:${HEADING_COLOR};font-size:15px;font-weight:600;line-height:1.6">Hi ${data.fullName},</p>
    <p style="margin:0 0 16px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">Thank you for applying to <strong style="color:${BRAND_MAGENTA}">CreativeMinds</strong> &mdash; FreakingMinds' curated network of creative professionals.</p>
    <p style="margin:0 0 16px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">We've received your application and our team will review it within 2&ndash;3 business days. You'll receive an email once a decision has been made.</p>
    <div style="margin:20px 0;padding:15px 19px;border:1px solid ${HAIRLINE};border-radius:10px;border-left:3px solid ${BRAND_MAGENTA}">
      <p style="margin:0;color:${TEXT_COLOR};font-size:13px;line-height:1.5"><strong>What happens next?</strong><br>Our team reviews every application personally. If approved, you'll get a public profile on our talent network and access to project opportunities.</p>
    </div>
    <p style="margin:0;color:${TEXT_COLOR};font-size:15px;line-height:1.6">Best,<br><strong>The FreakingMinds Team</strong></p>
  `;

  return {
    subject: 'Application Received — CreativeMinds by FreakingMinds',
    html: emailWrapper('Application Received', body),
  };
}

export function talentApplicationTeamEmail(data: TalentApplicationData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">A new CreativeMinds application needs review.</p>
    ${dataTable(
      row('Name', `<strong>${data.fullName}</strong>`) +
      row('Email', `<a href="mailto:${data.email}" style="color:${BRAND_MAGENTA};text-decoration:none">${data.email}</a>`) +
      (data.category ? row('Category', data.category) : '') +
      (data.experience ? row('Experience', data.experience) : '')
    )}
    ${ctaButton('Review Application', `${SITE_URL}/admin/creativeminds`)}
  `;

  return {
    subject: `New Talent Application: ${data.fullName}`,
    html: emailWrapper('New Talent Application', body),
  };
}

interface TalentApprovedData {
  fullName: string;
  profileSlug: string;
  tempPassword?: string;
  portalEmail?: string;
}

export function talentApprovedEmail(data: TalentApprovedData): { subject: string; html: string } {
  const profileUrl = `${SITE_URL}/talent/${data.profileSlug}`;
  const portalUrl = `${SITE_URL}/creativeminds/portal/${data.profileSlug}`;

  // Login credentials section (only if tempPassword is provided)
  const credentialsSection = data.tempPassword && data.portalEmail ? `
    <div style="margin:20px 0;padding:20px 24px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0">
      <p style="margin:0 0 12px;color:${HEADING_COLOR};font-size:13px;font-weight:600;letter-spacing:0.01em">Your Portal Login Credentials</p>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        <tr>
          <td style="padding:4px 0;color:${MUTED_COLOR};font-size:13px;width:80px">Email</td>
          <td style="padding:4px 0;color:${HEADING_COLOR};font-size:14px;font-weight:600">${data.portalEmail}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:${MUTED_COLOR};font-size:13px">Password</td>
          <td style="padding:4px 0"><code style="background:#e2e8f0;padding:2px 8px;border-radius:4px;font-size:14px;font-weight:600;color:${HEADING_COLOR};letter-spacing:0.5px">${data.tempPassword}</code></td>
        </tr>
      </table>
      <p style="margin:10px 0 0;color:${MUTED_COLOR};font-size:11px">Please change your password after first login.</p>
    </div>
    ${ctaButton('Login to Portal', portalUrl, '#22c55e')}
  ` : '';

  const body = `
    <p style="margin:0 0 14px;color:${HEADING_COLOR};font-size:15px;font-weight:600;line-height:1.6">Congratulations, ${data.fullName}!</p>
    <p style="margin:0 0 16px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">Your <strong style="color:${BRAND_MAGENTA}">CreativeMinds</strong> application has been approved. Your public talent profile is now live on our network.</p>
    <div style="margin:20px 0;padding:15px 19px;border:1px solid ${HAIRLINE};border-radius:10px;border-left:3px solid #22c55e">
      <p style="margin:0;color:${TEXT_COLOR};font-size:13px;line-height:1.5"><strong>What this means:</strong><br>Clients and brands browsing our talent network can now discover your profile. You may be contacted for project opportunities that match your skills.</p>
    </div>
    ${credentialsSection}
    ${ctaButton('View Your Profile', profileUrl, data.tempPassword ? BRAND_MAGENTA : '#22c55e')}
    <p style="margin:16px 0 0;color:${TEXT_COLOR};font-size:15px;line-height:1.6">Welcome to the network!<br><strong>The FreakingMinds Team</strong></p>
  `;

  return {
    subject: 'You\'re Approved! — CreativeMinds by FreakingMinds',
    html: emailWrapper('Application Approved', body),
  };
}

interface TalentRejectedData {
  fullName: string;
}

export function talentRejectedEmail(data: TalentRejectedData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 14px;color:${HEADING_COLOR};font-size:15px;font-weight:600;line-height:1.6">Hi ${data.fullName},</p>
    <p style="margin:0 0 16px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">Thank you for your interest in joining <strong style="color:${BRAND_MAGENTA}">CreativeMinds</strong>. After carefully reviewing your application, we've decided not to move forward at this time.</p>
    <p style="margin:0 0 16px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">This doesn't reflect on your talent &mdash; we may have specific needs that didn't align with your profile right now. You're welcome to reapply in the future as our requirements evolve.</p>
    <p style="margin:0 0 16px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">If you have questions, feel free to reach out at <a href="mailto:hello@freakingminds.in" style="color:${BRAND_MAGENTA};text-decoration:none">hello@freakingminds.in</a>.</p>
    <p style="margin:0;color:${TEXT_COLOR};font-size:15px;line-height:1.6">Wishing you the best,<br><strong>The FreakingMinds Team</strong></p>
  `;

  return {
    subject: 'Application Update — CreativeMinds by FreakingMinds',
    html: emailWrapper('Application Update', body),
  };
}

interface InvoiceEmailData {
  invoiceNumber: string;
  clientName: string;
  total: number;
  currency?: string;
  dueDate?: string;
  status?: string;
}

export function invoiceCreatedEmail(data: InvoiceEmailData): { subject: string; html: string } {
  const cur = data.currency || 'INR';
  const locale = cur === 'INR' ? 'en-IN' : 'en-GB';
  const formatted = new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(data.total);

  const body = `
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">A new invoice has been created.</p>
    ${dataTable(
      row('Invoice #', `<strong>${data.invoiceNumber}</strong>`) +
      row('Client', data.clientName) +
      row('Total', `<strong style="color:${HEADING_COLOR};font-size:16px">${formatted}</strong>`) +
      (data.dueDate ? row('Due Date', data.dueDate) : '') +
      (data.status ? row('Status', badge(data.status.toUpperCase())) : '')
    )}
    ${ctaButton('View Invoice', `${SITE_URL}/admin/invoices`)}
  `;

  return {
    subject: `Invoice Created: ${data.invoiceNumber} — ${data.clientName}`,
    html: emailWrapper('Invoice Created', body),
  };
}

interface ProposalEmailData {
  proposalNumber: string;
  title: string;
  clientName?: string;
  status?: string;
}

export function proposalCreatedEmail(data: ProposalEmailData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">A new proposal has been created.</p>
    ${dataTable(
      row('Proposal #', `<strong>${data.proposalNumber}</strong>`) +
      row('Title', data.title) +
      (data.clientName ? row('Client', data.clientName) : '') +
      (data.status ? row('Status', badge(data.status.toUpperCase())) : '')
    )}
    ${ctaButton('View Proposal', `${SITE_URL}/admin/proposals`)}
  `;

  return {
    subject: `Proposal Created: ${data.proposalNumber} — ${data.title}`,
    html: emailWrapper('Proposal Created', body),
  };
}

// ---------------------------------------------------------------------------
// Content action email templates (client → team)
// ---------------------------------------------------------------------------

interface ContentActionEmailData {
  contentTitle: string;
  platform: string;
  action: 'approved' | 'revision_requested';
  clientFeedback?: string;
}

export function contentActionEmail(data: ContentActionEmailData): { subject: string; html: string } {
  const isApproved = data.action === 'approved';
  const label = isApproved ? 'Approved' : 'Revision Requested';
  const color = isApproved ? '#22c55e' : '#f59e0b';

  const body = `
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">A client has ${isApproved ? 'approved' : 'requested revisions on'} content.</p>
    ${dataTable(
      row('Content', data.contentTitle) +
      row('Platform', data.platform) +
      row('Action', badge(label, color))
    )}
    ${data.clientFeedback ? `<div style="margin:20px 0;padding:16px 20px;background:#fff7ed;border-left:3px solid #f59e0b;border-radius:10px"><p style="margin:0 0 6px;color:${HEADING_COLOR};font-size:13px;font-weight:600">Client Feedback</p><p style="margin:0;color:${TEXT_COLOR};font-size:14px;line-height:1.5">${data.clientFeedback}</p></div>` : ''}
    ${ctaButton('View Content', `${SITE_URL}/admin/content`)}
  `;

  return {
    subject: `Content ${label}: ${data.contentTitle}`,
    html: emailWrapper(`Content ${label}`, body),
  };
}

// ---------------------------------------------------------------------------
// Contract email templates
// ---------------------------------------------------------------------------

/** Escape HTML to prevent XSS in email templates */
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface ContractEmailData {
  title: string;
  clientName?: string;
  contractNumber?: string;
  totalValue?: number;
  currency?: string;
}

export function contractCreatedEmail(data: ContractEmailData): { subject: string; html: string } {
  const cur = data.currency || 'INR';
  const locale = cur === 'INR' ? 'en-IN' : 'en-GB';
  const formatted = data.totalValue
    ? new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(data.totalValue)
    : undefined;

  const body = `
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">A new contract has been created.</p>
    ${dataTable(
      row('Title', `<strong>${escHtml(data.title)}</strong>`) +
      (data.clientName ? row('Client', escHtml(data.clientName)) : '') +
      (data.contractNumber ? row('Contract #', escHtml(data.contractNumber)) : '') +
      (formatted ? row('Value', `<strong style="color:${HEADING_COLOR};font-size:16px">${formatted}</strong>`) : '') +
      row('Status', badge('DRAFT'))
    )}
    ${ctaButton('View Contract', `${SITE_URL}/admin/clients`)}
  `;

  return {
    subject: `Contract Created: ${data.title}`,
    html: emailWrapper('Contract Created', body),
  };
}

// ---------------------------------------------------------------------------
// Proposal email templates
// ---------------------------------------------------------------------------

interface ProposalStatusEmailData {
  title: string;
  proposalNumber?: string;
  action: 'approved' | 'declined' | 'edit_requested';
  clientFeedback?: string;
}

/** Team notification when client acts on a proposal */
export function proposalStatusEmail(data: ProposalStatusEmailData): { subject: string; html: string } {
  const labels: Record<string, string> = {
    approved: 'Approved',
    declined: 'Declined',
    edit_requested: 'Edit Requested',
  };
  const colors: Record<string, string> = {
    approved: '#22c55e',
    declined: '#ef4444',
    edit_requested: '#f59e0b',
  };

  const label = labels[data.action] || data.action;
  const color = colors[data.action] || BRAND_MAGENTA;
  const safeTitle = escHtml(data.title);

  const body = `
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">A client has responded to a proposal.</p>
    ${dataTable(
      row('Proposal', safeTitle) +
      (data.proposalNumber ? row('Number', escHtml(data.proposalNumber)) : '') +
      row('Status', badge(label, color))
    )}
    ${data.clientFeedback ? `<div style="margin:20px 0;padding:16px 20px;background:#fff7ed;border-left:3px solid #f59e0b;border-radius:10px"><p style="margin:0 0 6px;color:${HEADING_COLOR};font-size:13px;font-weight:600">Client Feedback</p><p style="margin:0;color:${TEXT_COLOR};font-size:14px;line-height:1.5">${escHtml(data.clientFeedback)}</p></div>` : ''}
    ${ctaButton('View Proposal', `${SITE_URL}/admin/proposals`)}
  `;

  return {
    subject: `Proposal ${label}: ${data.title}`,
    html: emailWrapper(`Proposal ${label}`, body),
  };
}

interface ProposalSentToClientData {
  title: string;
  proposalNumber?: string;
  clientName: string;
  portalUrl: string;
}

/** Client-facing email when proposal is sent */
export function proposalSentToClientEmail(data: ProposalSentToClientData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 14px;color:${HEADING_COLOR};font-size:15px;font-weight:600;line-height:1.6">Hi ${escHtml(data.clientName)},</p>
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">A new proposal is ready for your review.</p>
    ${dataTable(
      row('Proposal', `<strong>${escHtml(data.title)}</strong>`) +
      (data.proposalNumber ? row('Number', escHtml(data.proposalNumber)) : '') +
      row('Status', badge('READY FOR REVIEW', '#3b82f6'))
    )}
    <p style="margin:16px 0 0;color:${TEXT_COLOR};font-size:14px;line-height:1.5">Please review the proposal in your client portal and let us know your thoughts.</p>
    ${ctaButton('Review Proposal', data.portalUrl)}
  `;

  return {
    subject: `New Proposal: ${data.title} — FreakingMinds`,
    html: emailWrapper('Proposal Ready for Review', body),
  };
}

// ---------------------------------------------------------------------------
// Invoice status email template (client-facing)
// ---------------------------------------------------------------------------

interface InvoiceStatusEmailData {
  invoiceNumber: string;
  clientName: string;
  total: number;
  currency?: string;
  dueDate?: string;
  status: 'sent' | 'paid' | 'overdue';
}

/** Client-facing email for invoice status changes */
export function invoiceStatusEmail(data: InvoiceStatusEmailData): { subject: string; html: string } {
  const cur = data.currency || 'INR';
  const locale = cur === 'INR' ? 'en-IN' : 'en-GB';
  const formatted = new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(data.total);

  const labels: Record<string, string> = { sent: 'Invoice Sent', paid: 'Payment Received', overdue: 'Payment Overdue' };
  const colors: Record<string, string> = { sent: '#3b82f6', paid: '#22c55e', overdue: '#ef4444' };
  const label = labels[data.status] || data.status;
  const color = colors[data.status] || BRAND_MAGENTA;

  const messages: Record<string, string> = {
    sent: 'A new invoice has been sent to you for review.',
    paid: 'Your payment has been received. Thank you!',
    overdue: 'Your invoice is past due. Please arrange payment at your earliest convenience.',
  };

  const body = `
    <p style="margin:0 0 14px;color:${HEADING_COLOR};font-size:15px;font-weight:600;line-height:1.6">Hi ${escHtml(data.clientName)},</p>
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">${messages[data.status]}</p>
    ${dataTable(
      row('Invoice #', `<strong>${escHtml(data.invoiceNumber)}</strong>`) +
      row('Amount', `<strong style="color:${HEADING_COLOR};font-size:16px">${formatted}</strong>`) +
      (data.dueDate ? row('Due Date', data.dueDate) : '') +
      row('Status', badge(label.toUpperCase(), color))
    )}
    ${ctaButton('View in Portal', `${SITE_URL}/client`)}
  `;

  return {
    subject: `${label}: ${data.invoiceNumber} — FreakingMinds`,
    html: emailWrapper(label, body),
  };
}

// ---------------------------------------------------------------------------
// Document shared email template (client-facing)
// ---------------------------------------------------------------------------

interface DocumentSharedEmailData {
  clientName: string;
  fileName: string;
  portalUrl: string;
}

/** Client-facing email when a document is shared */
export function documentSharedEmail(data: DocumentSharedEmailData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 14px;color:${HEADING_COLOR};font-size:15px;font-weight:600;line-height:1.6">Hi ${escHtml(data.clientName)},</p>
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">A new document has been shared with you.</p>
    ${dataTable(
      row('File', `<strong>${escHtml(data.fileName)}</strong>`)
    )}
    <p style="margin:16px 0 0;color:${TEXT_COLOR};font-size:14px;line-height:1.5">You can access this document in your client portal.</p>
    ${ctaButton('View Documents', data.portalUrl)}
  `;

  return {
    subject: `Document Shared: ${data.fileName} — FreakingMinds`,
    html: emailWrapper('Document Shared', body),
  };
}

// ---------------------------------------------------------------------------
// Contract email templates
// ---------------------------------------------------------------------------

interface ContractStatusEmailData {
  title: string;
  action: 'sent' | 'accepted' | 'rejected' | 'edit_requested';
  clientFeedback?: string;
}

export function contractStatusEmail(data: ContractStatusEmailData): { subject: string; html: string } {
  const labels: Record<string, string> = {
    sent: 'Sent to Client',
    accepted: 'Accepted',
    rejected: 'Rejected',
    edit_requested: 'Edit Requested',
  };
  const colors: Record<string, string> = {
    sent: '#3b82f6',
    accepted: '#22c55e',
    rejected: '#ef4444',
    edit_requested: '#f59e0b',
  };

  const label = labels[data.action] || data.action;
  const color = colors[data.action] || BRAND_MAGENTA;
  const safeTitle = escHtml(data.title);

  const body = `
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">Contract status has been updated.</p>
    ${dataTable(
      row('Contract', safeTitle) +
      row('Status', badge(label, color))
    )}
    ${data.clientFeedback ? `<div style="margin:20px 0;padding:16px 20px;background:#fff7ed;border-left:3px solid #f59e0b;border-radius:10px"><p style="margin:0 0 6px;color:${HEADING_COLOR};font-size:13px;font-weight:600">Client Feedback</p><p style="margin:0;color:${TEXT_COLOR};font-size:14px;line-height:1.5">${escHtml(data.clientFeedback)}</p></div>` : ''}
    ${ctaButton('View Contract', `${SITE_URL}/admin/clients`)}
  `;

  return {
    subject: `Contract ${label}: ${data.title}`,
    html: emailWrapper(`Contract ${label}`, body),
  };
}

// ---------------------------------------------------------------------------
// Marketing health scorecard
// ---------------------------------------------------------------------------

interface ScorecardDimensionLine {
  label: string;
  score: number;
  band: string;
  recommendation: string;
}

interface ScorecardReportData {
  name: string;
  overall: number;
  bandLabel: string;
  /** Already ordered worst-first by scoring.ts — preserve that order. */
  dimensions: ScorecardDimensionLine[];
}

/**
 * Colour for a band. Semantic rather than brand magenta on purpose: a weak
 * score rendered in the brand colour reads as decoration, not as a warning.
 * Mirrors BAND_STYLE in the scorecard UI.
 */
const SCORECARD_BAND_COLOR: Record<string, string> = {
  at_risk: '#e11d48',
  patchy: '#f59e0b',
  solid: '#0ea5e9',
  strong: '#10b981',
};

/**
 * The report the visitor was promised on the form.
 *
 * Sent to the person who filled it in, not to the team — the team gets a
 * dashboard notification instead. Deliberately light on selling: the report
 * earns a conversation by being right, and one that pitches in every section
 * gets deleted.
 *
 * Built from tables and inline styles because that is what mail clients
 * render reliably; no flexbox, no external CSS.
 */
export function scorecardReportEmail(data: ScorecardReportData): { subject: string; html: string } {
  const overallColor = SCORECARD_BAND_COLOR[
    data.overall >= 80 ? 'strong' : data.overall >= 60 ? 'solid' : data.overall >= 40 ? 'patchy' : 'at_risk'
  ];

  const sections = data.dimensions
    .map((d, i) => {
      const color = SCORECARD_BAND_COLOR[d.band] || BRAND_MAGENTA;
      // Bar width is a percentage of a fixed-width table — the only bar
      // technique that survives Outlook.
      const filled = Math.max(0, Math.min(100, d.score));
      return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${BORDER_COLOR};border-radius:10px">
        <tr><td style="padding:16px 18px">
          ${i === 0 ? `<div style="margin:0 0 6px">${badge('Fix this first', BRAND_MAGENTA)}</div>` : ''}
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:${HEADING_COLOR};font-size:15px;font-weight:600">${d.label}</td>
              <td align="right" style="color:${color};font-size:18px;font-weight:600">${d.score}</td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 12px;background-color:#ece8e2;border-radius:3px">
            <tr>
              <td style="height:6px;font-size:0;line-height:0">
                <table width="${filled}%" cellpadding="0" cellspacing="0" style="background:${color};border-radius:3px">
                  <tr><td style="height:6px;font-size:0;line-height:0">&nbsp;</td></tr>
                </table>
              </td>
            </tr>
          </table>
          <div style="color:${TEXT_COLOR};font-size:13px;line-height:1.6">${d.recommendation}</div>
        </td></tr>
      </table>`;
    })
    .join('');

  const body = `
    <p style="margin:0 0 20px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">
      Hi ${data.name}, here is your marketing health report — the full breakdown you saw on the site,
      kept here so you have it to hand.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border:1px solid ${HAIRLINE};border-radius:14px">
      <tr><td align="center" style="padding:26px 20px">
        <div style="color:${MUTED_COLOR};font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px">Your score</div>
        <div style="color:${overallColor};font-family:${SERIF};font-size:50px;font-weight:400;line-height:1">${data.overall}<span style="color:${MUTED_COLOR};font-size:20px;font-weight:500">/100</span></div>
        <div style="color:${overallColor};font-size:15px;font-weight:600;margin:6px 0 0">${data.bandLabel}</div>
      </td></tr>
    </table>

    ${sections}

    <div style="height:1px;background:${BORDER_COLOR};margin:28px 0 20px"></div>

    <p style="margin:0 0 4px;color:${TEXT_COLOR};font-size:14px;line-height:1.6">
      Most of the above is work you can do yourself, and it is worth doing in that order —
      the top item is where the next pound of effort returns the most.
    </p>
    <p style="margin:0;color:${MUTED_COLOR};font-size:13px;line-height:1.6">
      If you would rather not do it yourself, that is what we do. No obligation either way.
    </p>
    ${ctaButton('Talk to us', `${SITE_URL}/get-started`)}
  `;

  return {
    subject: `Your marketing health score: ${data.overall}/100`,
    html: emailWrapper('Your Marketing Health Report', body),
  };
}
