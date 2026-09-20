/**
 * The one palette every outgoing email renders in.
 *
 * There are two shells — `email/send.ts` for transactional mail and
 * `sales/email-shell.ts` for sequences and confirmation receipts. They had
 * drifted into two different brands, which a person meets in the same inbox.
 * The values live here so that cannot happen again by editing one of them.
 *
 * These mirror the public site's `--site-*` tokens
 * (src/styles/site-tokens.css), with three deliberate departures, because an
 * inbox is not a browser:
 *
 * 1. **Webfonts.** Instrument Serif and DM Sans are stripped by every major
 *    client, so headings take the site's own declared fallback (Georgia) and
 *    body takes a system sans. Georgia is the one serif installed
 *    everywhere, and it is genuinely close in colour to Instrument Serif.
 * 2. **`rgba()`.** Old Outlook drops alpha, so each hairline is the
 *    composite pre-computed against white: `--site-line` (14%) is #dedcd9,
 *    `--site-line-soft` (7%) is #eeecea.
 * 3. **The ground.** The site's bone `#f7f4ef` works because it fills the
 *    viewport. In a 600px column inside the client's own white chrome the
 *    same colour stops reading as warm paper and becomes a grey panel that
 *    lines up with nothing. Email surfaces are white; structure comes from
 *    the hairlines and the accent rule.
 */

import { SITE_URL } from '@/lib/site-url';

/**
 * The full-colour mark. It is deep magenta on transparency, so it reads on
 * white with no backing plate — which is why the masthead no longer needs
 * the white pill, and why `/email/logo.png` (the white-on-transparent
 * variant, cut for the old magenta header band) is no longer used anywhere.
 */
export const LOGO_URL = `${SITE_URL}/logo.png`;

/** `--site-accent-solid`: the fill behind white text, which never lightens. */
export const BRAND_MAGENTA = '#c9325d';
/** `--site-text`. */
export const HEADING_COLOR = '#13110f';
/**
 * One step off `--site-text` rather than exactly it. The site sets body copy
 * to full ink, but in DM Sans, which is lighter in colour than the system
 * sans we fall back to here — at the same value a 600px column would read
 * heavier in an inbox than the page does. Measures 13.7:1 on white.
 */
export const TEXT_COLOR = '#2e2926';
/** `--site-muted`. */
export const MUTED_COLOR = '#6b635c';
/** Below AA on purpose. Decorative lines only, never content. */
export const FAINT_COLOR = '#9a938c';

export const LIGHT_BG = '#ffffff';
export const CARD_BG = '#ffffff';
export const PANEL_BG = '#ffffff';
/** `--site-line`, composited on white. */
export const BORDER_COLOR = '#dedcd9';
/** `--site-line-soft`, composited on white. */
export const HAIRLINE = '#eeecea';

export const SERIF = "Georgia,'Times New Roman',Times,serif";
export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * The same sentence as the WhatsApp Business profile's "about". Someone who
 * meets us in both places should meet the same description.
 */
export const COMPANY_ABOUT =
  'The marketing and digital partner for brands that intend to grow. India, and worldwide.';

/**
 * Everything a client needs in order not to repaint the mail in dark mode.
 *
 * `supported-color-schemes` takes scheme *names*; it had been given
 * `light only`, and `only` is not a scheme name, so the value was malformed
 * and carried no instruction at all. `color-scheme` uses the canonical
 * `only light` order, and the instruction is repeated as a real CSS
 * declaration because some clients keep `<style>` and drop the meta.
 *
 * This is honoured by Apple Mail. The Gmail app and Outlook invert
 * regardless and offer no opt-out; the defence there is that every element
 * paints itself, so a client that inverts does so evenly rather than in
 * patches.
 */
export const LIGHT_ONLY_HEAD =
  '<meta name="color-scheme" content="only light">' +
  '<meta name="supported-color-schemes" content="light">' +
  '<style>:root{color-scheme:only light;supported-color-schemes:only light}</style>';
