import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SiteFooter } from '../SiteFooter';
import { SiteHeader } from '../SiteHeader';
import { SiteShell } from '../SiteShell';
import { SERVICES, serviceHref } from '@/lib/services-catalogue';

vi.mock('next/navigation', () => ({
  usePathname: () => '/work',
}));

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
});

describe('SiteFooter', () => {
  it('lists exactly the services in the catalogue, at the catalogue hrefs', () => {
    render(<SiteFooter />);
    const heading = screen.getByText('Services');
    const column = heading.parentElement as HTMLElement;

    for (const service of SERVICES) {
      const link = within(column).getByRole('link', { name: service.name });
      expect(link).toHaveAttribute('href', serviceHref(service.id));
    }
    // No extras: the old footer invented four names that existed nowhere else.
    expect(within(column).getAllByRole('link')).toHaveLength(SERVICES.length);
  });

  it('surfaces the three routes that were orphaned', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'FM Academy' })).toHaveAttribute('href', '/academy');
    expect(screen.getByRole('link', { name: 'Freakquency' })).toHaveAttribute('href', '/freakquency');
    expect(screen.getByRole('link', { name: 'Growth Scorecard' })).toHaveAttribute('href', '/scorecard');
  });

  it('has no newsletter field — the old one discarded what people typed', () => {
    const { container } = render(<SiteFooter />);
    expect(container.querySelector('input')).toBeNull();
    expect(screen.queryByText(/newsletter/i)).toBeNull();
  });

  it('links nowhere at /blog', () => {
    const { container } = render(<SiteFooter />);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs.some((h) => h?.startsWith('/blog'))).toBe(false);
  });

  it('opens external links safely', () => {
    const { container } = render(<SiteFooter />);
    for (const anchor of container.querySelectorAll('a[target="_blank"]')) {
      expect(anchor.getAttribute('rel')).toContain('noopener');
    }
  });
});

describe('SiteHeader mobile menu', () => {
  function renderPage() {
    return render(
      <SiteShell>
        <SiteHeader />
        <main>
          <a href="/behind">Behind the menu</a>
        </main>
      </SiteShell>,
    );
  }

  it('takes the page out of reach while open and gives it back on Escape', () => {
    renderPage();
    const main = screen.getByRole('main');
    const toggle = screen.getByRole('button', { name: 'Open menu' });

    fireEvent.click(toggle);
    // Focus moves into the menu, and the covered page cannot be tabbed into.
    expect(document.activeElement?.closest('#site-menu')).not.toBeNull();
    expect(main.inert).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(main.inert).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });
});
