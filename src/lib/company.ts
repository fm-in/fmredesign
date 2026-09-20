/**
 * The company's public contact number, in one place.
 *
 * It used to be a literal in a dozen files: the contact page, the about page,
 * the get-started wizard, both legal pages, two JSON-LD blocks, and
 * `COMPANY_WHATSAPP_NUMBER` in the sales link builder. Nothing tied them
 * together, so they drifted — the site advertised one number while the
 * WhatsApp Business API was registered against another. Every "Prefer
 * WhatsApp?" link in a sales email therefore opened a chat with a number that
 * had no webhook behind it: those messages reached a handset and were
 * invisible to the system. No timeline entry, no sequence stop, no opt-out.
 *
 * One source of truth, every other form derived from it.
 */

/** E.164. The source of truth — every other form below is derived. */
export const COMPANY_PHONE_E164 = '+916268112515';

/** Grouped for reading. The only form that is written out by hand. */
export const COMPANY_PHONE_DISPLAY = '+91 62681 12515';

/** `wa.me` takes digits with no punctuation. */
export const COMPANY_WHATSAPP_NUMBER = COMPANY_PHONE_E164.replace(/\D/g, '');

/*
 * Deliberately NO `tel:` export. We do not take inbound calls — every
 * "get in touch" path goes to WhatsApp or the booking page. A `tel:` link
 * here would invite a call to a Cloud API number that cannot answer one.
 */

/** Opens a chat with us. */
export const COMPANY_WHATSAPP_URL = `https://wa.me/${COMPANY_WHATSAPP_NUMBER}`;

export const COMPANY_EMAIL = 'freakingmindsdigital@gmail.com';
