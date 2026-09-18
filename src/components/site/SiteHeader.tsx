'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

/**
 * The public site's header.
 *
 * New component rather than an edit to `HeaderV2`, which stays until no route
 * needs it. Differences that matter:
 *
 * - Six top-level destinations, no mega-menus. `HeaderV2` carried three
 *   hover dropdowns holding twelve links, four of which point at unreleased
 *   products.
 * - The scrim is a real background colour built from `--site-ground-rgb`.
 *   `HeaderV2` used a `color-mix()` gradient that never painted at all, which
 *   is why body text was readable straight through the bar mid-transition.
 * - `backdrop-filter` applies in both states. It was previously inverted:
 *   applied at the top of the page where nothing is behind the header, and
 *   removed on scroll — exactly when content passes underneath.
 */

const NAV = [
  { label: 'Work', href: '/work' },
  { label: 'Services', href: '/services' },
  { label: 'Academy', href: '/academy' },
  { label: 'Freakquency', href: '/freakquency' },
  { label: 'About', href: '/about' },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // A menu that covers the page must not leave the page scrollable behind it.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onEscape);
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-site-sm focus:px-4 focus:py-2"
        style={{ background: 'var(--site-text)', color: 'var(--site-ground)' }}
      >
        Skip to main content
      </a>

      <header
        className="sticky z-40 transition-colors duration-300"
        style={{
          top: 'env(safe-area-inset-top, 0px)',
          backgroundColor: scrolled || menuOpen ? 'rgba(var(--site-ground-rgb), 0.86)' : 'transparent',
          backdropFilter: scrolled || menuOpen ? 'blur(14px)' : 'none',
          WebkitBackdropFilter: scrolled || menuOpen ? 'blur(14px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--site-line-soft)' : '1px solid transparent',
        }}
      >
        <div
          className="mx-auto flex items-center justify-between gap-6 px-site-gutter py-4"
          style={{ maxWidth: 'var(--site-max-width)' }}
        >
          <Link
            href="/"
            className="font-site-display text-site-h3 text-site-text"
            aria-label="Freaking Minds — home"
          >
            Freaking Minds
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className="font-site-sans text-site-body transition-opacity hover:opacity-100"
                style={{
                  color: 'var(--site-text)',
                  opacity: isActive(item.href) ? 1 : 0.62,
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/get-started"
              className="hidden rounded-site-sm px-4 py-2 font-site-sans text-site-body md:inline-flex"
              style={{ background: 'var(--site-text)', color: 'var(--site-ground)' }}
            >
              Start a project
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-site-sm md:hidden"
              style={{ border: '1px solid var(--site-line)', color: 'var(--site-text)' }}
            >
              {menuOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      <div
        id="site-menu"
        hidden={!menuOpen}
        className="fixed inset-0 z-30 md:hidden"
        style={{ background: 'var(--site-ground)', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 72px)' }}
      >
        <nav className="flex flex-col px-site-gutter" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border-b py-5 font-site-display text-site-h3 text-site-text"
              style={{ borderColor: 'var(--site-line-soft)' }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/get-started"
            className="mt-8 rounded-site-sm px-4 py-3 text-center font-site-sans text-site-body"
            style={{ background: 'var(--site-text)', color: 'var(--site-ground)' }}
          >
            Start a project
          </Link>
        </nav>
      </div>
    </>
  );
}
