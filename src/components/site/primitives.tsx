import type { ElementType, ReactNode } from 'react';

/**
 * Layout and type primitives for the public site.
 *
 * Every one of these uses the `site-` token utilities, which is what proves
 * the token layer generates real Tailwind classes rather than dead custom
 * properties — the failure mode of the 27 tokens it replaces.
 */

type Tone = 'ground' | 'raised';

/**
 * A page section. Vertical rhythm comes from one fluid token, not from the
 * five hand-tuned `v2-section--*` modifiers it replaces.
 */
export function Section({
  children,
  tone = 'ground',
  className = '',
  id,
  as: Tag = 'section',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  id?: string;
  as?: ElementType;
}) {
  return (
    <Tag
      id={id}
      className={`py-site-section ${tone === 'raised' ? 'bg-site-raised' : ''} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

/** The measure. One container, not four (`v2-container{,-narrow,-wide,-article}`). */
export function Container({
  children,
  width = 'default',
  className = '',
}: {
  children: ReactNode;
  width?: 'default' | 'narrow';
  className?: string;
}) {
  /*
   * The container is ALWAYS the page measure, so every page starts at the same
   * left edge. `width="narrow"` limits the content inside it rather than
   * shrinking and re-centring the container — that was putting /privacy and
   * /terms at 416px while the rest of the site started at 86px.
   */
  return (
    <div
      className={`mx-auto w-full px-site-gutter ${className}`.trim()}
      style={{ maxWidth: 'var(--site-max-width)' }}
    >
      {width === 'narrow' ? <div style={{ maxWidth: '720px' }}>{children}</div> : children}
    </div>
  );
}

/**
 * Display type. `level` picks the size token; `as` picks the tag — so a page
 * can have one `<h1>` without being forced into the largest size, which is
 * what drove the old hand-written `.v2-display` / `.v2-h2` duplication.
 */
export function Display({
  children,
  level = 'display',
  as,
  className = '',
}: {
  children: ReactNode;
  level?: 'display' | 'h1' | 'h2' | 'h3';
  as?: ElementType;
  className?: string;
}) {
  const Tag: ElementType = as ?? (level === 'display' ? 'h1' : level === 'h3' ? 'h3' : level === 'h2' ? 'h2' : 'h1');
  const size = {
    display: 'text-site-display',
    h1: 'text-site-h1',
    h2: 'text-site-h2',
    h3: 'text-site-h3',
  }[level];

  return <Tag className={`font-site-display text-site-text ${size} ${className}`.trim()}>{children}</Tag>;
}

/** Body copy at two sizes. */
export function Text({
  children,
  size = 'body',
  muted = false,
  className = '',
  as: Tag = 'p',
}: {
  children: ReactNode;
  size?: 'lead' | 'body';
  muted?: boolean;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag
      className={`font-site-sans ${size === 'lead' ? 'text-site-lead' : 'text-site-body'} ${
        muted ? 'text-site-muted' : 'text-site-text'
      } ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

/**
 * A small caps label. Always ink or muted, never the accent: `#C9325D`
 * measures ~4.7:1 on bone, which passes AA for normal text but is too thin to
 * rely on below 14px once antialiasing eats the strokes.
 */
export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`tag ${className}`.trim()}>{children}</span>
  );
}

/**
 * A section opener: the label plus its trailing rule.
 *
 * Distinct from `Label`, which captions a figure or annotates a count — a
 * rule there would stretch into the surrounding layout. Renders exactly the
 * same markup as the raw `.eyebrow` class the home page uses, so the two
 * spellings cannot drift apart.
 *
 * Replaces a third treatment, the bordered `site-chip` pill, which made the
 * same element look different on three pages.
 */
export function Eyebrow({
  children,
  accent = false,
  className = '',
}: {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={`eyebrow ${className}`.trim()}>
      <span className={accent ? 'tag tag--a' : 'tag'}>{children}</span>
    </div>
  );
}

/** A hairline. One token, so light and dark stay in step. */
export function Rule({ soft = false, className = '' }: { soft?: boolean; className?: string }) {
  return (
    <hr
      className={className}
      style={{
        border: 0,
        borderTop: `1px solid ${soft ? 'var(--site-line-soft)' : 'var(--site-line)'}`,
      }}
    />
  );
}
