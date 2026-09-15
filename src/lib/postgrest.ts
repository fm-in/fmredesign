/**
 * Make a user-typed search term safe to interpolate into a PostgREST `.or()`
 * filter such as `name.ilike.%term%,email.ilike.%term%`.
 *
 * `.or()` takes a raw filter expression: a comma starts another condition and
 * parentheses group them, so an unescaped term can add conditions of its own.
 * Syntax characters and the `%` wildcard are replaced with spaces and the
 * length is capped. `_` stays: as a LIKE wildcard it still matches itself.
 */

export const MAX_SEARCH_LENGTH = 100;

export function escapeSearchTerm(raw: string): string {
  return raw
    .slice(0, MAX_SEARCH_LENGTH)
    .replace(/[,()"'\\:*%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
