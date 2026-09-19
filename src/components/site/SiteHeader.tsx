'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

/**
 * The public site's header, as approved.
 *
 * It sits over moving film in the hero, so it always needs a ground of its
 * own: a gradient scrim to start, a solid bar the moment you scroll. The
 * scrolled state is applied by `HomeMotion` (or by a plain scroll listener
 * when motion is reduced) so there is one implementation, not two.
 *
 * The wordmark is dark artwork, so each theme gets its own file and they are
 * swapped in CSS rather than JS — that way it is already correct on first
 * paint instead of flipping after hydration.
 */

const NAV = [
  { label: 'Services', href: '/services' },
  { label: 'Work', href: '/work' },
  { label: 'Academy', href: '/academy' },
  { label: 'Freakquency', href: '/freakquency' },
  { label: 'About', href: '/about' },
] as const;

export function SiteHeader({ floating = false }: { floating?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

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

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-site-sm focus:px-4 focus:py-2"
        style={{ background: 'var(--site-text)', color: 'var(--site-ground)' }}
      >
        Skip to main content
      </a>

      {/* `floating` is for the home page, whose hero runs under the header.
          Every other page starts with content, so the bar is solid at once. */}
      <header className={floating ? 'hdr' : 'hdr is-stuck'}>
        <div className="wrap hdr-in">
          <Link href="/" className="logo" aria-label="Freaking Minds, home">
            <Image className="on-light" src="/logo.png" alt="Freaking Minds" width={74} height={46} priority />
            <Image
              className="on-dark"
              src="/logo-white.png"
              alt=""
              aria-hidden
              width={74}
              height={46}
              priority
            />
          </Link>

          <nav className="nav" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <ThemeToggle />

          <Link className="btn btn--primary" href="/get-started">
            Get started
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full lg:hidden"
            style={{ border: '1px solid var(--site-line)', color: 'var(--site-text)' }}
          >
            {menuOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </header>

      <div
        id="site-menu"
        hidden={!menuOpen}
        className="fixed inset-0 z-[79] lg:hidden"
        style={{
          background: 'var(--site-ground)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 86px)',
        }}
      >
        <nav className="wrap flex flex-col" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="d border-b py-5"
              style={{ borderColor: 'var(--site-line-soft)', fontSize: 'clamp(1.6rem, 7vw, 2.4rem)' }}
            >
              {item.label}
            </Link>
          ))}
          <Link className="btn btn--primary mt-10 self-start" href="/get-started">
            Get started
          </Link>
        </nav>
      </div>
    </>
  );
}
