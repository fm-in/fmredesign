import type { ReactNode } from 'react';

/**
 * Long-form text: legal pages, article bodies, anything that arrives as a run
 * of headings and paragraphs rather than as composed sections.
 *
 * Scoped with `data-prose` and styled from `site-tokens.css`, so the rules
 * live with every other token rule instead of becoming a second styling
 * system. The old site solved this with `.v2-prose` plus a set of bare
 * element selectors in unlayered CSS, which then leaked into every page that
 * happened to contain a `<p>`.
 */
export function Prose({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div data-prose className={className}>
      {children}
    </div>
  );
}
