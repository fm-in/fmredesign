import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SiteFooter } from '../SiteFooter';
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
