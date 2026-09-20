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

/**
 * `value` as a LIKE/ILIKE pattern that matches only itself: the wildcards `%`
 * and `_` and the escape character `\` are escaped. Use it for an exact,
 * case-insensitive match such as `.ilike('email', likeLiteral(address))`.
 * PostgREST also reads `*` as `%` and offers no escape for it, so an address
 * containing `*` can match a little more than itself; that only ever widens a
 * do-not-contact match, never narrows it.
 */
export function likeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
