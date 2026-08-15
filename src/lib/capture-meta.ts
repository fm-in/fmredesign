/**
 * Capture metadata for public form submissions.
 *
 * Every unauthenticated POST that writes a row should record who sent it.
 * This cannot be reconstructed later: a lead row saved without an IP is
 * permanently unattributable, and separating genuine submissions from bot
 * traffic after the fact becomes guesswork.
 *
 * Columns are added by `migrations/2026-08-10-capture-metadata.sql`.
 *
 * Server-only by construction — it reads request headers. Do not import
 * from a client component.
 */

import { getClientIp } from '@/lib/rate-limiter';

/** Column names match the DB exactly so this spreads straight into an insert. */
export interface CaptureMeta {
  ip_address: string | null;
  user_agent: string | null;
}

/**
 * Longest user-agent we store. Real ones sit well under 256 chars; the cap
 * exists to bound a hostile client, not to tidy the value.
 */
const MAX_USER_AGENT = 512;

/**
 * Build the capture metadata for a request.
 *
 * The user-agent is stored RAW apart from the length cap. Resist the urge to
 * trim or normalise it — malformed user-agents are the signal, not noise.
 * One known bot fleet is identifiable purely by a stray leading quote.
 */
export function captureMeta(request: Request): CaptureMeta {
  const ip = getClientIp(request);
  const ua = request.headers.get('user-agent');
  return {
    // getClientIp returns the string 'unknown' when it cannot determine one.
    // NULL is the honest representation of that in the database.
    ip_address: ip && ip !== 'unknown' ? ip : null,
    user_agent: ua ? ua.slice(0, MAX_USER_AGENT) : null,
  };
}

/**
 * True when Supabase rejected an insert because a column is absent from the
 * schema cache (PostgREST `PGRST204`).
 *
 * The migration above is applied by hand in the Supabase SQL editor, so a
 * deploy can briefly run ahead of it. When that happens we would rather drop
 * the telemetry than drop the submission — a lost lead is unrecoverable,
 * a lost IP is merely a gap.
 *
 * Once the migration is applied everywhere, the retry paths that call this
 * become dead code and can be removed.
 */
export function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; message?: unknown };
  if (e.code === 'PGRST204') return true;
  // PostgREST phrases it as: Could not find the 'ip_address' column of
  // 'leads' in the schema cache — the column name precedes the word "column",
  // so match on the two parts independently rather than on word order.
  const message = typeof e.message === 'string' ? e.message : '';
  return (
    /\b(ip_address|user_agent)\b/i.test(message) && /column|schema cache/i.test(message)
  );
}
