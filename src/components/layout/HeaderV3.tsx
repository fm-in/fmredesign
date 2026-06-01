'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Menu, X, ArrowRight } from 'lucide-react';

const navigation = [
  { name: 'Work', href: '/work' },
  { name: 'Services', href: '/services' },
  { name: 'Academy', href: '/academy' },
  { name: 'About', href: '/about' },
  { name: 'CreativeMinds', href: '/creativeminds' },
  { name: 'Blog', href: '/blog' },
];

export function HeaderV3() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isLinkActive = (href: string) => {
    if (href === '/') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-fm-magenta-600 text-white px-4 py-2 rounded-full z-[60] text-sm"
      >
        Skip to main content
      </a>

      <header
        ref={headerRef}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          isScrolled || isMobileMenuOpen
            ? 'bg-fm-cream/95 backdrop-blur-md'
            : 'bg-transparent'
        )}
        // GPU-promote the sticky header so the backdrop-blur is rasterized
        // once into its own compositor layer instead of being re-blurred
        // against the scrolling page every frame.
        style={{ willChange: 'backdrop-filter, background-color', transform: 'translateZ(0)' }}
      >
        {/* Subtle bottom border on scroll */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-px bg-fm-neutral-200 transition-opacity duration-500',
            isScrolled ? 'opacity-100' : 'opacity-0'
          )}
        />

        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="flex items-center justify-between h-20 lg:h-24">
            {/* Brand Logo */}
            <Link
              href="/"
              className="relative z-10 group"
              aria-label="Freaking Minds - Home"
            >
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Freaking Minds"
                  className="h-10 w-auto group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav
              className="hidden md:flex items-center gap-10 lg:gap-12"
              role="navigation"
              aria-label="Main navigation"
            >
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group relative py-2"
                  aria-current={isLinkActive(item.href) ? 'page' : undefined}
                >
                  <span
                    className={cn(
                      'text-sm tracking-wide transition-colors duration-300',
                      isLinkActive(item.href)
                        ? 'text-fm-ink font-medium'
                        : 'text-fm-neutral-500 group-hover:text-fm-ink'
                    )}
                  >
                    {item.name}
                  </span>
                  {/* Minimal dot indicator */}
                  <span
                    className={cn(
                      'absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-fm-magenta-600 transition-all duration-300',
                      isLinkActive(item.href)
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100'
                    )}
                  />
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:block">
              <Link
                href="/get-started"
                className="group relative inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-fm-ink border border-fm-neutral-300 rounded-full overflow-hidden transition-all duration-300 hover:border-fm-ink hover:bg-fm-ink hover:text-white"
              >
                <span className="relative z-10">Start a Project</span>
                <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden relative z-10 p-2 -mr-2 text-fm-ink focus:outline-none"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              <div className="relative w-6 h-6">
                <span
                  className={cn(
                    'absolute left-0 w-6 h-0.5 bg-fm-ink transition-all duration-300',
                    isMobileMenuOpen ? 'top-[11px] rotate-45' : 'top-1'
                  )}
                />
                <span
                  className={cn(
                    'absolute left-0 top-[11px] w-6 h-0.5 bg-fm-ink transition-all duration-300',
                    isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                  )}
                />
                <span
                  className={cn(
                    'absolute left-0 w-6 h-0.5 bg-fm-ink transition-all duration-300',
                    isMobileMenuOpen ? 'top-[11px] -rotate-45' : 'top-[19px]'
                  )}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            'md:hidden fixed inset-0 top-20 bg-fm-cream transition-all duration-500 ease-out',
            isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          )}
        >
          <div className="max-w-7xl mx-auto px-6 py-12 h-full flex flex-col">
            <nav className="flex flex-col gap-1">
              {navigation.map((item, index) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'text-4xl font-bold tracking-tight py-4 transition-all duration-500 border-b border-fm-neutral-200',
                    isLinkActive(item.href)
                      ? 'text-fm-ink'
                      : 'text-fm-neutral-400 hover:text-fm-ink',
                    isMobileMenuOpen
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  )}
                  style={{
                    fontFamily: 'var(--font-display)',
                    transitionDelay: isMobileMenuOpen ? `${index * 50 + 100}ms` : '0ms'
                  }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Mobile CTA */}
            <div
              className={cn(
                'mt-auto pt-8 transition-all duration-500',
                isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
              style={{ transitionDelay: isMobileMenuOpen ? '400ms' : '0ms' }}
            >
              <Link
                href="/get-started"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-fm-ink text-white text-lg font-medium rounded-full"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>Start a Project</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <div className="mt-12 space-y-2 text-sm text-fm-neutral-500">
                <a
                  href="mailto:freakingmindsdigital@gmail.com"
                  className="block hover:text-fm-ink transition-colors"
                >
                  freakingmindsdigital@gmail.com
                </a>
                <a
                  href="tel:+919833257659"
                  className="block hover:text-fm-ink transition-colors"
                >
                  +91 98332 57659
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
