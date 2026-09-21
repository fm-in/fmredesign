/**
 * What a person actually reads in an email, for tests that assert nothing
 * internal leaked into it — a campaign id, a form name, the word "undefined",
 * a sentence left dangling by a missing value.
 *
 * This lived as a copy in two test files. Both stripped tags but kept what
 * was between them, so when the Outlook dark-mode overrides added a `<style>`
 * block, every CSS selector in it started counting as words a reader sees and
 * forty assertions failed at once. One implementation, so the next gap is
 * fixed once.
 */

/** Tag contents that are never rendered, and must not be treated as words. */
const INVISIBLE = [/<style\b[^>]*>[\s\S]*?<\/style>/gi, /<head\b[^>]*>[\s\S]*?<\/head>/gi];

export function visibleHtml(html: string): string {
  let out = html;
  for (const block of INVISIBLE) out = out.replace(block, ' ');
  return (
    out
      // Anchors go first so their text survives while the href does not.
      .replace(/<\/?a\b[^>]*>/g, '')
      .replace(/<[^>]+>/g, ' ')
  );
}

/**
 * Subject, plain text and visible HTML together, with URLs collapsed to
 * "LINK" — links legitimately carry ids, slugs and signing tokens, and those
 * are not leaks.
 */
export function readableWords(email: { subject: string; text: string; html: string }): string {
  return [email.subject, email.text, visibleHtml(email.html)]
    .join('\n')
    .replace(/https?:\/\/[^\s.,;:!?)]+(?:[.,;:!?)]+[^\s.,;:!?)]+)*/g, 'LINK');
}
