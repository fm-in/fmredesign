import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LetterWindow } from '../LetterWindow';
import { LiveWall, type WallTile } from '../LiveWall';
import { ReelRow } from '../ReelRow';
import { FilmVideo } from '../FilmVideo';

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
const reduced = (q: string) => q.includes('prefers-reduced-motion');

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

const FILMS = ['giovanni', 'kanha', 'renny', 'concept_studio', 'skr_group', 'astroo_apaar'];

describe('FilmVideo', () => {
  it('offers phones the 360p source first, with a poster for every visitor', () => {
    const { container } = render(<FilmVideo id="kanha" />);
    const video = container.querySelector('video')!;
    expect(video.getAttribute('poster')).toBe('/videos/kanha-poster.jpg');
    const sources = Array.from(video.querySelectorAll('source'));
    expect(sources[0].getAttribute('media')).toBe('(max-width: 700px)');
    expect(sources[0].getAttribute('src')).toBe('/videos/sm/kanha.mp4');
    expect(sources[1].getAttribute('src')).toBe('/videos/kanha.mp4');
  });
});

describe('LetterWindow', () => {
  it('renders the headline as one real heading, with the films hidden from assistive tech', () => {
    stubMatchMedia(reduced);
    const { container } = render(<LetterWindow films={FILMS} lines={['Ideas', 'that move', 'markets.']} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Ideasthat movemarkets.');
    expect(container.querySelectorAll('.lw-wall video')).toHaveLength(6);
    expect(container.querySelector('.lw-wall')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('stays a normal-height section under reduced motion, and plays nothing', () => {
    stubMatchMedia(reduced);
    const { container } = render(<LetterWindow films={FILMS} lines={['Ideas']} />);
    expect(container.querySelector('.lw')?.classList.contains('is-scroll')).toBe(false);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('never becomes a scroll scene in still mode', () => {
    stubMatchMedia(() => false);
    const { container } = render(<LetterWindow films={FILMS} lines={['Six things,']} mode="still" as="h1" />);
    expect(container.querySelector('.lw')?.classList.contains('is-scroll')).toBe(false);
  });
});

describe('LiveWall', () => {
  const tiles: WallTile[] = [
    { kind: 'film', id: 'giovanni', label: 'Giovanni Village, brand film' },
    { kind: 'image', src: '/x.jpg', label: 'Restronaut website', site: true },
    { kind: 'film', id: 'kanha', label: 'Kanha, promotional film' },
  ];

  it('names every tile in text and marks the centre', () => {
    stubMatchMedia(reduced);
    const { container } = render(
      <LiveWall tiles={tiles} centre={2}>
        <h1>Real results for real brands.</h1>
      </LiveWall>,
    );
    expect(screen.getByText('Restronaut website')).toBeTruthy();
    expect(container.querySelector('.lwall-tile--2')?.classList.contains('is-centre')).toBe(true);
    expect(container.querySelector('.lwall-tile--1')?.classList.contains('is-site')).toBe(true);
    expect(container.querySelector('.lwall')?.classList.contains('is-scroll')).toBe(false);
  });
});

describe('ReelRow', () => {
  const films = [
    { id: 'kanha', client: 'Kanha', category: 'Promotional' },
    { id: 'renny', client: 'Renny', category: 'Social Media' },
    { id: 'skr_group', client: 'SKR Group', category: 'Corporate' },
  ];

  it('renders a plain row on desktop, with no deck controls', () => {
    stubMatchMedia(() => false);
    render(<ReelRow films={films} />);
    expect(screen.getAllByText(/Kanha|Renny|SKR Group/)).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Next film' })).toBeNull();
  });

  it('becomes a deck on phones, and the next button sends the front film to the back', () => {
    vi.useFakeTimers();
    stubMatchMedia((q) => q.includes('max-width: 700px') || reduced(q));
    const { container } = render(<ReelRow films={films} />);
    const front = () => container.querySelector('[data-slot="0"] b')?.textContent;
    expect(front()).toBe('Kanha');
    fireEvent.click(screen.getByRole('button', { name: 'Next film' }));
    act(() => { vi.runAllTimers(); });
    expect(front()).toBe('Renny');
    vi.useRealTimers();
  });
});
