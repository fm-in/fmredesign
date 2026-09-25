import Image from 'next/image';

/**
 * One 3D brain render, treated so it can sit in an editorial layout.
 *
 * The renders arrive as bubblegum-pink cartoons. Measured against the bone
 * ground they read as clip art; desaturated and darkened they read as a
 * sculptural object, which is the only reason they work here at all. The
 * treatment lives in `--site-brain-filter` so it is one value, not a string
 * copied into every page — it was hardcoded in five places before this.
 *
 * **Always decorative.** Every one of these repeats something the page has
 * already said in words, so each is `alt=""` and `aria-hidden`: a screen reader
 * announcing "Launch Your Project" over the heading that already says it is
 * noise. One page had a meaningful `alt` on a purely ornamental render; this
 * exists partly so that cannot drift back.
 *
 * Positioning is the caller's job. The house rule is one, large, per page.
 */
/** Exported so the asset guard can check each one against `public/`. */
export const POSES = [
  'celebrating',
  'confused',
  'creative',
  'learning',
  'loading',
  'rocket',
  'strategy',
  'support',
  'teaching',
] as const;

export type BrainPose = (typeof POSES)[number];

interface BrainMarkProps {
  pose: BrainPose;
  /** Rendered width in px; caps at 60vw so it cannot swamp a phone. */
  width?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function BrainMark({ pose, width = 240, className = '', style }: BrainMarkProps) {
  return (
    <Image
      src={`/3dasset/brain-${pose}.webp`}
      alt=""
      aria-hidden
      // Sources are 1024 square. Requesting 2x the display width gives a sharp
      // render on retina without asking for the full file.
      width={width * 2}
      height={width * 2}
      className={`brain-mark ${className}`.trim()}
      sizes={`(max-width: 640px) 60vw, ${width}px`}
      style={{ width: `min(${width}px, 60vw)`, ...style }}
    />
  );
}
