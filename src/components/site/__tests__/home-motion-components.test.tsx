import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeroReel } from '../HeroReel';
import { CursorPreview } from '../CursorPreview';

const FILMS = [
  { id: 'giovanni', client: 'Giovanni', category: 'Brand Video' },
  { id: 'adi', client: 'ADI', category: 'Brand Video' },
  { id: 'renny', client: 'Renny', category: 'Social Media' },
];

function stubMatchMedia(matches: (q: string) => boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
}

beforeEach(() => {
  vi.restoreAllMocks();
  // jsdom has no media playback.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});

describe('HeroReel', () => {
  it('server-renders the first film, so the window is never empty', () => {
    stubMatchMedia(() => false);
    const { container } = render(<HeroReel films={FILMS} />);
    const first = container.querySelector('video');
    expect(first?.getAttribute('poster')).toBe('/videos/giovanni-poster.jpg');
    expect(first?.querySelector('source')?.getAttribute('src')).toBe('/videos/giovanni.mp4');
    expect(screen.getByText('Giovanni')).toBeTruthy();
  });

  it('offers every film as a labelled button, with the current one pressed', () => {
    stubMatchMedia(() => false);
    render(<HeroReel films={FILMS} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Play Giovanni', 'Play ADI', 'Play Renny']);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('does not autoplay when the visitor prefers reduced motion', () => {
    stubMatchMedia((q) => q.includes('prefers-reduced-motion'));
    render(<HeroReel films={FILMS} />);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('loads the chosen film when a button is pressed', () => {
    stubMatchMedia((q) => q.includes('prefers-reduced-motion'));
    const { container } = render(<HeroReel films={FILMS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play Renny' }));
    const layers = container.querySelectorAll('video');
    expect(layers[1].getAttribute('src')).toBe('/videos/renny.mp4');
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalled();
  });
});

describe('CursorPreview', () => {
  it('renders a hidden, decorative frame and does nothing on touch devices', () => {
    stubMatchMedia(() => false); // no fine pointer
    const { container } = render(
      <>
        <div className="list">
          <a data-preview="/x.jpg">Row</a>
        </div>
        <CursorPreview listSelector=".list" />
      </>,
    );
    const frame = container.querySelector('.cursor-preview');
    expect(frame?.getAttribute('aria-hidden')).toBe('true');
    fireEvent.pointerEnter(screen.getByText('Row'));
    expect(frame?.querySelector('img')?.getAttribute('src')).toBeNull();
  });
});
