/**
 * One motion module for the public site.
 *
 * What it replaces, measured across `src/`:
 *
 * - 8 separate `gsap.registerPlugin(ScrollTrigger)` calls
 * - 15 separate `prefers-reduced-motion` implementations, several of which
 *   only checked the preference once at mount and never again
 * - two competing scroll-pin engines: `ServicesSectionV2` uses ScrollTrigger's
 *   `pin`, while `FeaturesSectionV2` hand-rolls `scrollY` + rAF +
 *   `position: fixed` and fights the browser for the same behaviour
 *
 * Nothing here imports GSAP at module scope. The old components did, which put
 * ~70KB of animation library in the shared bundle of every page — including
 * pages with no animation at all.
 */

export type MotionCleanup = () => void;

/**
 * Live reduced-motion state.
 *
 * Deliberately a getter, not a captured boolean: the preference can change
 * while the page is open (macOS applies it instantly), and most of the old
 * implementations read it once at mount and then ignored the change.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Subscribe to changes in the preference. Returns an unsubscribe function. */
export function onReducedMotionChange(handler: (reduced: boolean) => void): MotionCleanup {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listener = (event: MediaQueryListEvent) => handler(event.matches);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

let gsapPromise: Promise<typeof import('gsap').gsap> | null = null;

/**
 * Load GSAP with ScrollTrigger registered exactly once, on demand.
 *
 * Returns null when motion is reduced, so a caller cannot accidentally build a
 * timeline that the preference was supposed to suppress — and, just as
 * importantly, the library is never downloaded for that visitor at all.
 */
export async function loadGsap(): Promise<typeof import('gsap').gsap | null> {
  if (typeof window === 'undefined') return null;
  if (prefersReducedMotion()) return null;

  if (!gsapPromise) {
    gsapPromise = (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      gsap.registerPlugin(ScrollTrigger);
      return gsap;
    })();
  }
  return gsapPromise;
}

/** Refresh every ScrollTrigger. Required after any change to document height. */
export async function refreshScrollTriggers(): Promise<void> {
  if (!gsapPromise) return;
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  ScrollTrigger.refresh();
}

/**
 * Reveal elements as they enter the viewport.
 *
 * Replaces five near-identical IntersectionObserver blocks. Uses an observer
 * rather than GSAP because a fade-and-rise needs no timeline, and this way a
 * page with only reveals never downloads GSAP.
 *
 * Under reduced motion the elements are simply shown — never left at
 * `opacity: 0`, which is how several of the old implementations failed.
 */
export function observeReveal(
  elements: Iterable<Element>,
  options: { threshold?: number; rootMargin?: string } = {},
): MotionCleanup {
  const nodes = Array.from(elements);
  if (nodes.length === 0) return () => {};

  const show = (node: Element) => node.setAttribute('data-revealed', 'true');

  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    nodes.forEach(show);
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          show(entry.target);
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: options.threshold ?? 0.15, rootMargin: options.rootMargin ?? '0px 0px -10% 0px' },
  );

  nodes.forEach((node) => observer.observe(node));
  return () => observer.disconnect();
}

/**
 * Fetch a loop in full only once it is about to be seen.
 *
 * The short mascot loops need `preload="auto"`: with only metadata loaded,
 * every wrap back to the start stalled while the browser refetched the file.
 * But rendered with `auto`, every loop on the page downloaded at load — about
 * 1.5 MB on /services, all of it below the fold. So the element renders with
 * `preload="none"` (the poster shows) and this raises it to `auto` when the
 * video comes within `rootMargin` of the viewport — a screen ahead by default,
 * so the whole clip is in hand before `playWhileVisible` starts it.
 *
 * Under reduced motion nothing is fetched: nothing will play.
 */
export function preloadWhenNear(
  videos: Iterable<HTMLVideoElement>,
  rootMargin = '100% 0px',
): MotionCleanup {
  const nodes = Array.from(videos);
  if (nodes.length === 0 || prefersReducedMotion()) return () => {};
  const warm = (video: HTMLVideoElement) => {
    video.preload = 'auto';
  };
  if (typeof IntersectionObserver === 'undefined') {
    nodes.forEach(warm);
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        warm(entry.target as HTMLVideoElement);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin },
  );
  nodes.forEach((video) => observer.observe(video));
  return () => observer.disconnect();
}

/**
 * Play media only while it is on screen, and cap how many play at once.
 *
 * The home page carries six vertical client films. Six autoplaying videos
 * decode in parallel and stall scrolling on a mid-range phone, so this keeps
 * at most `limit` playing and pauses the rest.
 *
 * Under reduced motion nothing plays; the poster frame stands in.
 */
export function playWhileVisible(
  videos: Iterable<HTMLVideoElement>,
  limit = 4,
): MotionCleanup {
  const nodes = Array.from(videos);
  if (nodes.length === 0) return () => {};

  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    nodes.forEach((video) => video.pause());
    return () => {};
  }

  const visible = new Set<HTMLVideoElement>();

  const sync = () => {
    let playing = 0;
    for (const video of nodes) {
      if (visible.has(video) && playing < limit) {
        // `play()` rejects if the element is detached or autoplay is blocked.
        // Neither is worth an unhandled rejection in the console.
        void video.play().catch(() => {});
        playing += 1;
      } else {
        video.pause();
      }
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) visible.add(video);
        else visible.delete(video);
      }
      sync();
    },
    { threshold: 0.2 },
  );

  nodes.forEach((video) => observer.observe(video));

  return () => {
    observer.disconnect();
    nodes.forEach((video) => video.pause());
  };
}

/**
 * Pin an element while its container scrolls past.
 *
 * The single pin implementation. `FeaturesSectionV2`'s hand-rolled version
 * used `position: fixed` driven by a rAF loop reading `scrollY`, which fought
 * ScrollTrigger's own pinning on the same page and produced the doubled
 * scroll distance that had to be halved by hand in an earlier commit.
 *
 * Returns a cleanup function. Under reduced motion it pins nothing and the
 * section scrolls normally, which is the correct fallback — a pinned section
 * that cannot animate is just a long empty gap.
 */
export async function pinSection(
  trigger: HTMLElement,
  options: {
    /** Extra scroll distance to hold the pin for, as a multiple of viewport height. */
    hold?: number;
    onProgress?: (progress: number) => void;
  } = {},
): Promise<MotionCleanup> {
  const gsap = await loadGsap();
  if (!gsap) return () => {};

  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  const instance = ScrollTrigger.create({
    trigger,
    start: 'top top',
    end: () => `+=${window.innerHeight * (options.hold ?? 1)}`,
    pin: true,
    pinSpacing: true,
    anticipatePin: 1,
    onUpdate: options.onProgress ? (self) => options.onProgress?.(self.progress) : undefined,
  });

  return () => instance.kill();
}

/**
 * Drive a sticky scroll scene: call `onFrame(progress, seconds)` every frame
 * while `section` is on screen, where progress runs 0→1 as the section scrolls
 * past (its height minus one viewport).
 *
 * Deliberately not a pin. The section is tall and its stage is
 * `position: sticky` in CSS, so the browser does the holding and there is no
 * second scroll engine to fight — the lesson of `pinSection`'s own history.
 * The frame loop exists only while the section intersects the viewport.
 *
 * Returns a cleanup. Callers check reduced motion themselves, because a scene
 * under reduced motion should not be tall in the first place.
 */
export function stickyScene(
  section: HTMLElement,
  onFrame: (progress: number, seconds: number) => void,
): MotionCleanup {
  let raf = 0;
  const tick = (now: number) => {
    const r = section.getBoundingClientRect();
    const run = r.height - window.innerHeight;
    const p = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
    onFrame(p, now / 1000);
    raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  if (typeof IntersectionObserver === 'undefined') {
    start();
    return stop;
  }
  const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
  observer.observe(section);
  // Draw once immediately so the first painted frame matches the scroll position.
  onFrame(0, performance.now() / 1000);
  return () => { observer.disconnect(); stop(); };
}

/** Clamp `x` into 0–1 across the span a→b. Shared by the scroll scenes. */
export const span = (x: number, a: number, b: number): number => Math.min(1, Math.max(0, (x - a) / (b - a)));
/** Cubic in-out easing for scroll-linked moves. */
export const easeInOut = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
