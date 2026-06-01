/**
 * Confirmation email sent to the buyer when a Razorpay payment is captured
 * for an FM Academy enrollment.
 *
 * Pure builder — returns { subject, html }. Sending is owned by the caller
 * (the webhook handler fires it through Inngest).
 */

const BRAND_MAGENTA = '#c9325d';
const HEADING_COLOR = '#0f0f0f';
const TEXT_COLOR = '#404040';
const MUTED_COLOR = '#888888';
const LIGHT_BG = '#f4f1f2';
const CARD_BG = '#ffffff';
const LOGO_URL = 'https://freakingminds.in/logo.png';
const SITE_URL = 'https://freakingminds.in';

interface BuildOpts {
  buyerName: string;
  programTitle: string;
  programSlug: string;
  programFormat: string;
  startsAt?: string;
  amountInr: number;
  deliveryZoomUrl?: string;
  deliveryWhatsappUrl?: string;
  deliveryNotionUrl?: string;
}

export function buildEnrollmentConfirmationEmail(opts: BuildOpts): {
  subject: string;
  html: string;
} {
  const subject = `Welcome to ${opts.programTitle} — payment confirmed`;

  const startsAtStr = opts.startsAt
    ? new Date(opts.startsAt).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const amount = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(opts.amountInr);

  // Build the "what's next" links section conditionally — only include the
  // surfaces the admin actually filled in for this program.
  const deliveryLinks: string[] = [];
  if (opts.deliveryWhatsappUrl) {
    deliveryLinks.push(linkRow('WhatsApp group (join now)', opts.deliveryWhatsappUrl));
  }
  if (opts.deliveryZoomUrl) {
    deliveryLinks.push(linkRow('Live sessions (Zoom)', opts.deliveryZoomUrl));
  }
  if (opts.deliveryNotionUrl) {
    deliveryLinks.push(linkRow('Course materials (Notion)', opts.deliveryNotionUrl));
  }

  const deliverySection = deliveryLinks.length
    ? `
      <tr><td style="padding:24px 32px 8px 32px">
        <h3 style="margin:0 0 12px 0;color:${HEADING_COLOR};font-size:16px;font-weight:600">What&rsquo;s next</h3>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${deliveryLinks.join('')}
        </table>
      </td></tr>`
    : `
      <tr><td style="padding:24px 32px 8px 32px">
        <h3 style="margin:0 0 12px 0;color:${HEADING_COLOR};font-size:16px;font-weight:600">What&rsquo;s next</h3>
        <p style="margin:0;color:${TEXT_COLOR};font-size:14px;line-height:1.6">
          Our team will email you the joining details (WhatsApp group + session links)
          within the next 24 hours. If you don&rsquo;t hear from us, write to
          <a href="mailto:freakingmindsdigital@gmail.com" style="color:${BRAND_MAGENTA};text-decoration:none">freakingmindsdigital@gmail.com</a>.
        </p>
      </td></tr>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${LIGHT_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT_BG};padding:40px 16px">
<tr><td align="center">

  <table width="600" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:0 0 24px">
      <a href="${SITE_URL}" style="text-decoration:none">
        <div style="display:inline-block;background:#ffffff;padding:12px 24px;border-radius:12px">
          <img src="${LOGO_URL}" alt="FreakingMinds" width="140" style="display:block;height:auto;border:0" />
        </div>
      </a>
    </td></tr>
  </table>

  <table width="600" cellpadding="0" cellspacing="0" style="background:${CARD_BG};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(201,50,93,0.08),0 1px 4px rgba(0,0,0,0.04)">
    <tr><td style="background:linear-gradient(135deg,${BRAND_MAGENTA},#a82548);height:4px;font-size:0;line-height:0">&nbsp;</td></tr>

    <tr><td style="padding:32px 32px 8px 32px">
      <p style="margin:0 0 8px 0;color:${BRAND_MAGENTA};font-size:13px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Payment confirmed</p>
      <h1 style="margin:0;color:${HEADING_COLOR};font-size:24px;font-weight:700;line-height:1.3">
        You&rsquo;re in, ${escapeHtml(opts.buyerName)}.
      </h1>
    </td></tr>

    <tr><td style="padding:16px 32px 0 32px">
      <p style="margin:0;color:${TEXT_COLOR};font-size:15px;line-height:1.6">
        Welcome to <strong>${escapeHtml(opts.programTitle)}</strong>${startsAtStr ? `, starting <strong>${startsAtStr}</strong>` : ''}.
        Your payment of <strong>${amount}</strong> has been received and your seat is confirmed.
      </p>
    </td></tr>

    ${deliverySection}

    <tr><td style="padding:24px 32px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT_BG};border-radius:12px;padding:16px">
        <tr><td>
          <p style="margin:0 0 4px 0;color:${MUTED_COLOR};font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Receipt</p>
          <p style="margin:0;color:${HEADING_COLOR};font-size:14px;line-height:1.6">
            <strong>${amount}</strong> &middot; ${escapeHtml(opts.programTitle)}<br>
            <span style="color:${MUTED_COLOR};font-size:12px">A GST-compliant receipt will arrive separately from Razorpay.</span>
          </p>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:8px 32px 32px 32px">
      <p style="margin:0;color:${TEXT_COLOR};font-size:14px;line-height:1.6">
        Questions? Reply to this email or write to
        <a href="mailto:freakingmindsdigital@gmail.com" style="color:${BRAND_MAGENTA};text-decoration:none">freakingmindsdigital@gmail.com</a>.
      </p>
    </td></tr>
  </table>

  <table width="600" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:24px 0 0 0">
      <p style="margin:0;color:${MUTED_COLOR};font-size:12px;line-height:1.6">
        Freaking Minds &middot; House No. 5, Maheshwari Bhawan, MP Nagar, Bhopal<br>
        <a href="${SITE_URL}/academy" style="color:${MUTED_COLOR};text-decoration:underline">FM Academy</a>
      </p>
    </td></tr>
  </table>

</td></tr>
</table>
</body></html>`;

  return { subject, html };
}

function linkRow(label: string, href: string): string {
  return `
    <tr><td style="padding:6px 0">
      <a href="${href}" style="display:inline-block;color:${BRAND_MAGENTA};font-size:14px;font-weight:500;text-decoration:none;border-bottom:1px solid rgba(201,50,93,0.3)">
        → ${escapeHtml(label)}
      </a>
    </td></tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
