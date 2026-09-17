/**
 * Client-safe half of the spam guard.
 *
 * Only the honeypot's field name is needed in the browser — the form has to
 * render an input with this name. The detection logic itself lives in
 * `@/lib/spam-guard`, which is server-only, so the heuristics never ship in
 * the client bundle where a bot author could read them.
 *
 * Mirrors the existing `events/types.ts` (client-safe) vs `events/emitter.ts`
 * (server) split.
 */

/** A form field bots fill in and humans never see. */
export const HONEYPOT_FIELD = 'companyWebsite';
