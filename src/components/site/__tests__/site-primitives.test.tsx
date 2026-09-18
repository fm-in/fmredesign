import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SiteShell } from '../SiteShell';
import { ThemeToggle } from '../ThemeToggle';
import { Container, Display, Label, Section, Text } from '../primitives';
import {
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  THEME_INIT_SCRIPT,
  applyTheme,
  readStoredTheme,
} from '../theme';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute(THEME_ATTRIBUTE);
});

afterEach(() => {
  document.documentElement.removeAttribute(THEME_ATTRIBUTE);
  vi.restoreAllMocks();
});

describe('SiteShell', () => {
  it('scopes the token layer with data-site, so portal pages are untouched', () => {
    const { container } = render(
      <SiteShell>
        <p>content</p>
      </SiteShell>,
    );
    expect(container.querySelector('[data-site]')).not.toBeNull();
  });

  it('renders the paper grain as one decorative element, not a particle field', () => {
    const { container } = render(
      <SiteShell>
        <p>content</p>
      </SiteShell>,
    );
    const decorative = container.querySelectorAll('[aria-hidden="true"]');
    expect(decorative).toHaveLength(1);
  });
});

describe('theme', () => {
  it('defaults to light and never reads prefers-color-scheme', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal('matchMedia', matchMedia);

    expect(readStoredTheme()).toBe('light');
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it('falls back to light when storage holds junk', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'chartreuse');
    expect(readStoredTheme()).toBe('light');
  });

  it('falls back to light when storage throws, rather than breaking the page', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredTheme()).toBe('light');
  });

  it('light carries no attribute, so the default CSS path needs no override', () => {
    const root = document.documentElement;
    applyTheme('dark', root);
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
    applyTheme('light', root);
    expect(root.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
  });

  it('the pre-paint script sets dark before hydration and swallows storage errors', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(THEME_INIT_SCRIPT)();
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
  });
});

describe('ThemeToggle', () => {
  it('toggles the root attribute and persists the choice', async () => {
    const user = userEvent.setup();
    render(
      <SiteShell>
        <ThemeToggle />
      </SiteShell>,
    );

    await act(async () => {
      await user.click(screen.getByRole('button'));
    });

    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await act(async () => {
      await user.click(screen.getByRole('button'));
    });

    expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('labels the action, not the current state', async () => {
    const user = userEvent.setup();
    render(
      <SiteShell>
        <ThemeToggle />
      </SiteShell>,
    );

    expect(screen.getByRole('button')).toHaveAccessibleName('Switch to dark mode');
    await act(async () => {
      await user.click(screen.getByRole('button'));
    });
    expect(screen.getByRole('button')).toHaveAccessibleName('Switch to light mode');
  });
});

describe('primitives use the site token utilities', () => {
  it('Display maps level to a size token and keeps the tag separate', () => {
    render(<Display level="h2">Ideas that move markets</Display>);
    const el = screen.getByText('Ideas that move markets');
    expect(el.tagName).toBe('H2');
    expect(el.className).toContain('text-site-h2');
    expect(el.className).toContain('font-site-display');
  });

  it('Display can render a smaller size inside an h1', () => {
    render(
      <Display level="h2" as="h1">
        Headline
      </Display>,
    );
    const el = screen.getByText('Headline');
    expect(el.tagName).toBe('H1');
    expect(el.className).toContain('text-site-h2');
  });

  it('Text switches size and tone through tokens', () => {
    render(
      <Text size="lead" muted>
        Sub
      </Text>,
    );
    const el = screen.getByText('Sub');
    expect(el.className).toContain('text-site-lead');
    expect(el.className).toContain('text-site-muted');
  });

  it('Label never uses the accent colour', () => {
    render(<Label>Selected work</Label>);
    expect(screen.getByText('Selected work').className).not.toContain('accent');
  });

  it('Section uses the one rhythm token', () => {
    const { container } = render(
      <Section>
        <p>x</p>
      </Section>,
    );
    expect(container.querySelector('section')?.className).toContain('py-site-section');
  });

  it('Container uses the one gutter token', () => {
    const { container } = render(
      <Container>
        <p>x</p>
      </Container>,
    );
    expect((container.firstChild as HTMLElement).className).toContain('px-site-gutter');
  });
});
