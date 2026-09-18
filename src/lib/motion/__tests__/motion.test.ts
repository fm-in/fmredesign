import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { observeReveal, playWhileVisible, prefersReducedMotion } from '../index';

/** Minimal IntersectionObserver stand-in — jsdom ships none. */
class FakeObserver {
  static instances: FakeObserver[] = [];
  observed: Element[] = [];
  disconnected = false;

  constructor(private callback: IntersectionObserverCallback) {
    FakeObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve(el: Element) {
    this.observed = this.observed.filter((o) => o !== el);
  }
  disconnect() {
    this.disconnected = true;
  }
  /** Drive the callback the way a real observer would. */
  fire(entries: { target: Element; isIntersecting: boolean }[]) {
    this.callback(entries as unknown as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }
}

function setReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

beforeEach(() => {
  FakeObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  setReducedMotion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('prefersReducedMotion', () => {
  it('reads the preference live rather than caching it', () => {
    setReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
    setReducedMotion(true);
    // The old implementations captured this once at mount; macOS applies the
    // change instantly, so a cached value goes stale while the page is open.
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe('observeReveal', () => {
  it('marks elements revealed as they enter', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    observeReveal([a, b]);

    const observer = FakeObserver.instances[0];
    observer.fire([{ target: a, isIntersecting: true }]);

    expect(a.getAttribute('data-revealed')).toBe('true');
    expect(b.hasAttribute('data-revealed')).toBe(false);
  });

  it('stops observing an element once revealed', () => {
    const a = document.createElement('div');
    observeReveal([a]);
    const observer = FakeObserver.instances[0];
    observer.fire([{ target: a, isIntersecting: true }]);
    expect(observer.observed).not.toContain(a);
  });

  it('shows everything immediately under reduced motion, never leaving content hidden', () => {
    setReducedMotion(true);
    const a = document.createElement('div');
    const b = document.createElement('div');
    observeReveal([a, b]);

    expect(a.getAttribute('data-revealed')).toBe('true');
    expect(b.getAttribute('data-revealed')).toBe('true');
    expect(FakeObserver.instances).toHaveLength(0);
  });
});

describe('playWhileVisible', () => {
  function fakeVideo() {
    const video = document.createElement('video');
    let paused = true;
    Object.defineProperty(video, 'paused', { get: () => paused });
    video.play = vi.fn(() => {
      paused = false;
      return Promise.resolve();
    });
    video.pause = vi.fn(() => {
      paused = true;
    });
    return video;
  }

  it('caps how many play at once', () => {
    const videos = Array.from({ length: 6 }, fakeVideo);
    playWhileVisible(videos, 4);

    FakeObserver.instances[0].fire(videos.map((target) => ({ target, isIntersecting: true })));

    expect(videos.filter((v) => !v.paused)).toHaveLength(4);
  });

  it('pauses a video once it leaves and promotes a waiting one', () => {
    const videos = Array.from({ length: 5 }, fakeVideo);
    playWhileVisible(videos, 2);
    const observer = FakeObserver.instances[0];

    observer.fire(videos.map((target) => ({ target, isIntersecting: true })));
    expect(videos[0].paused).toBe(false);
    expect(videos[2].paused).toBe(true);

    observer.fire([{ target: videos[0], isIntersecting: false }]);
    expect(videos[0].paused).toBe(true);
    // The budget freed by videos[0] goes to the next visible one.
    expect(videos.filter((v) => !v.paused)).toHaveLength(2);
  });

  it('plays nothing under reduced motion — the poster frame stands in', () => {
    setReducedMotion(true);
    const videos = Array.from({ length: 3 }, fakeVideo);
    playWhileVisible(videos, 4);

    expect(videos.every((v) => v.paused)).toBe(true);
    expect(FakeObserver.instances).toHaveLength(0);
  });

  it('swallows a rejected play() instead of throwing into the console', async () => {
    const video = fakeVideo();
    video.play = vi.fn(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')));
    playWhileVisible([video], 1);

    FakeObserver.instances[0].fire([{ target: video, isIntersecting: true }]);
    await Promise.resolve();
    expect(video.play).toHaveBeenCalled();
  });

  it('pauses everything on cleanup', () => {
    const videos = Array.from({ length: 3 }, fakeVideo);
    const cleanup = playWhileVisible(videos, 3);
    FakeObserver.instances[0].fire(videos.map((target) => ({ target, isIntersecting: true })));
    cleanup();
    expect(videos.every((v) => v.paused)).toBe(true);
    expect(FakeObserver.instances[0].disconnected).toBe(true);
  });
});
