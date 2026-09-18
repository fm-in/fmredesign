import Image from 'next/image';

export interface ClientLogo {
  src: string;
  name: string;
  /**
   * Optical weight, 1–3. Not importance — a wordmark like "Radisson" needs
   * more width than a compact mark like "BNI" to read at the same size.
   */
  scale?: 1 | 2 | 3;
}

/**
 * The client wall.
 *
 * Twenty marks at one size in one row is the weak composition, not the logos.
 * What this does instead:
 *
 * - **Uniform cells, variable marks.** The variance is in how large each logo
 *   sits inside its cell, not in how wide the cell is. Variable spans were
 *   tried first and left a ragged right edge with holes in it — which reads as
 *   a broken grid, not as rhythm.
 * - **A rule grid.** Hairlines between cells give the wall structure, so it
 *   reads as a table of fact rather than a floating cloud of marks.
 * - **Tokens do the light/dark work.** Every mark here is opaque dark artwork
 *   on white, so on paper it multiplies and on ink it inverts — one filter
 *   token, no second asset set.
 *
 * Supply logos in a multiple of six so the wall closes as a rectangle.
 */
export function LogoWall({ logos }: { logos: readonly ClientLogo[] }) {
  return (
    <ul
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        borderTop: '1px solid var(--site-line-soft)',
        borderLeft: '1px solid var(--site-line-soft)',
      }}
    >
      {logos.map((logo) => (
        <li
          key={logo.src}
          className="flex items-center justify-center p-4 sm:p-6"
          style={{
            minHeight: 'clamp(88px, 8vw, 132px)',
            borderRight: '1px solid var(--site-line-soft)',
            borderBottom: '1px solid var(--site-line-soft)',
          }}
        >
          <Image
            src={logo.src}
            alt={logo.name}
            width={220}
            height={90}
            className="h-auto w-full object-contain"
            style={{
              // Optical weight: a wide wordmark reads bigger than a compact
              // mark at the same height, so it is set shorter.
              maxHeight: `${{ 1: 62, 2: 52, 3: 40 }[logo.scale ?? 2]}px`,
              filter: 'var(--site-logo-filter)',
              mixBlendMode: 'var(--site-logo-blend)' as React.CSSProperties['mixBlendMode'],
              opacity: 'var(--site-logo-opacity)',
            }}
          />
        </li>
      ))}
    </ul>
  );
}
