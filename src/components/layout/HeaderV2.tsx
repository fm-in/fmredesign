'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Menu, X, ArrowUpRight, ChevronDown, ArrowRight,
  Brain, Video, Code, PenTool, Users, Search,
  Megaphone, BarChart3, Palette, Globe, Play, Layers
} from 'lucide-react';

// Tools data
const tools = [
  { name: 'Deep Dive', icon: Brain, desc: 'AI-powered brand analysis', href: 'https://deepdive.freakingminds.in', gradient: 'linear-gradient(135deg, #c9325d, #4a1942)', comingSoon: true },
  { name: 'Brand Kits', icon: Video, desc: 'AI logo asset generator', href: 'https://brandkits.freakingminds.in', gradient: 'linear-gradient(135deg, #e04d7d, #c9325d)', comingSoon: true },
  { name: 'WeBuild', icon: Code, desc: 'Website builder', href: '#', gradient: 'linear-gradient(135deg, #7a2155, #4a1942)', comingSoon: true },
  { name: 'WebCraft', icon: PenTool, desc: '7-day website builder', href: 'https://webcraft.freakingminds.in', gradient: 'linear-gradient(135deg, #c9325d, #8c213d)', comingSoon: true },
];

// Pulsing dot indicator for unreleased products
function ComingSoonDot() {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{
        background: '#c9325d',
        animation: 'pulse-dot 2s ease-in-out infinite',
        boxShadow: '0 0 0 0 rgba(201,50,93,0.4)',
      }}
      title="Coming Soon"
    />
  );
}

// Talent data
const talent = {
  name: 'CreativeMinds',
  icon: Users,
  desc: '500+ verified creative professionals',
  href: '/creativeminds',
  gradient: 'linear-gradient(135deg, #a82548, #4a1942)'
};

// Services data
const services = [
  { name: 'SEO', icon: Search, desc: 'Dominate search results', href: '/services#seo' },
  { name: 'Social Media', icon: Megaphone, desc: 'Build engaged communities', href: '/services#social' },
  { name: 'Performance Marketing', icon: BarChart3, desc: 'ROI-focused campaigns', href: '/services#performance' },
  { name: 'Brand Identity', icon: Palette, desc: 'Unforgettable visuals', href: '/services#branding' },
  { name: 'Web Development', icon: Globe, desc: 'Fast, beautiful sites', href: '/services#web' },
  { name: 'Content & Video', icon: Play, desc: 'Stories that convert', href: '/services#content' },
];

// Company data
const company = [
  { name: 'About Us', icon: Users, desc: 'Our story & team', href: '/about' },
  { name: 'Blog', icon: Layers, desc: 'Insights & updates', href: '/blog' },
  { name: 'Contact', icon: Megaphone, desc: 'Get in touch', href: '/contact' },
];

export function HeaderV2() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll handler
  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 20);
  }, []);

  // Handle escape key for mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        if (activeDropdown) setActiveDropdown(null);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen, activeDropdown]);

  // Scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  // Dropdown handlers with delay for better UX
  const handleMouseEnter = (dropdown: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setActiveDropdown(dropdown);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  // Check if link is active
  const isLinkActive = (href: string) => {
    if (href === '/') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-fm-magenta-600 text-white px-4 py-2 rounded-full z-[60] text-sm font-semibold"
      >
        Skip to main content
      </a>

      <header
        ref={headerRef}
        className={cn(
          'fixed top-0 left-0 right-0 transition-[background-color,box-shadow,border-color] duration-500',
          isScrolled || isMobileMenuOpen || activeDropdown
            ? 'shadow-sm'
            : ''
        )}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: isScrolled || isMobileMenuOpen || activeDropdown
            ? 'var(--v2-header-bg)'
            : 'rgba(255, 255, 255, 0.6)',
          backdropFilter: isScrolled || isMobileMenuOpen || activeDropdown
            ? undefined
            : 'blur(12px)',
          WebkitBackdropFilter: isScrolled || isMobileMenuOpen || activeDropdown
            ? undefined
            : 'blur(12px)',
          borderBottom: isScrolled || isMobileMenuOpen || activeDropdown
            ? '1px solid rgba(201, 50, 93, 0.08)'
            : '1px solid rgba(201, 50, 93, 0.04)',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo - Dark version for light theme */}
            <Link
              href="/"
              className="relative z-10 group"
              aria-label="Freaking Minds - Home"
            >
              <img
                src="/logo.png"
                alt="FreakingMinds logo"
                width={200}
                height={56}
                className="w-auto group-hover:scale-105 transition-transform duration-300"
                style={{ height: '3.5rem' }}
              />
            </Link>

            {/* Desktop Navigation */}
            <nav
              className="hidden lg:flex items-center gap-1"
              role="navigation"
              aria-label="Main navigation"
            >
              {/* Services Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter('services')}
                onMouseLeave={handleMouseLeave}
              >
                <button className="flex items-center gap-1.5 px-4 py-2 transition-colors text-sm font-medium" style={{ color: '#6b4a5a' }}>
                  Services
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'services' ? 'rotate-180' : ''}`} />
                </button>

                <div className={cn(
                  'absolute top-full left-0 pt-3 w-[520px] max-w-[calc(100vw-6rem)] transition-[opacity,transform,visibility] duration-200',
                  activeDropdown === 'services'
                    ? 'opacity-100 visible translate-y-0'
                    : 'opacity-0 invisible -translate-y-2'
                )}>
                  <div style={{ background: 'rgba(255,250,252,0.99)', border: '1px solid rgba(201,50,93,0.1)' }} className="rounded-2xl p-6 shadow-xl shadow-black/5">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#9a7888' }}>What We Do</div>
                    <div className="grid grid-cols-2 gap-2">
                      {services.map((service) => (
                        <Link
                          key={service.name}
                          href={service.href}
                          className="flex items-start gap-3 p-3 rounded-xl transition-colors group"
                          style={{ color: '#3d2030' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,50,93,0.05)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(201,50,93,0.08)' }}>
                            <service.icon className="w-5 h-5 text-fm-magenta-500" />
                          </div>
                          <div>
                            <div className="font-medium text-sm" style={{ color: '#1a0a12' }}>{service.name}</div>
                            <div className="text-xs" style={{ color: '#9a7888' }}>{service.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(201,50,93,0.08)' }}>
                      <Link href="/services" className="text-sm text-fm-magenta-600 hover:text-fm-magenta-700 flex items-center gap-1">
                        View all services <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work - No dropdown */}
              <Link
                href="/work"
                className="px-4 py-2 text-sm font-medium transition-colors"
                style={{ color: isLinkActive('/work') ? '#1a0a12' : '#6b4a5a' }}
              >
                Work
              </Link>

              {/* Products Dropdown (Tools + Talent) */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter('products')}
                onMouseLeave={handleMouseLeave}
              >
                <button className="flex items-center gap-1.5 px-4 py-2 transition-colors text-sm font-medium" style={{ color: '#6b4a5a' }}>
                  Products
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'products' ? 'rotate-180' : ''}`} />
                </button>

                <div className={cn(
                  'absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[420px] transition-[opacity,transform,visibility] duration-200',
                  activeDropdown === 'products'
                    ? 'opacity-100 visible translate-y-0'
                    : 'opacity-0 invisible -translate-y-2'
                )}>
                  <div style={{ background: 'rgba(255,250,252,0.99)', border: '1px solid rgba(201,50,93,0.1)' }} className="rounded-2xl p-5 shadow-xl shadow-black/5">
                    {/* Tools Section */}
                    <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9a7888' }}>Tools</div>
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {tools.map((tool) => (
                        <Link
                          key={tool.name}
                          href={tool.href}
                          {...(tool.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          className="flex items-center gap-3 p-2.5 rounded-xl transition-colors group"
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,50,93,0.05)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md" style={{ background: tool.gradient }}>
                            <tool.icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm" style={{ color: '#1a0a12' }}>{tool.name}</span>
                              {tool.comingSoon && <ComingSoonDot />}
                            </div>
                            <div className="text-[11px] leading-tight" style={{ color: '#9a7888' }}>{tool.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: '1px solid rgba(201,50,93,0.08)' }} className="my-4" />

                    {/* Talent Section */}
                    <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9a7888' }}>Talent Network</div>
                    <Link
                      href={talent.href}
                      className="flex items-center gap-4 p-3 rounded-xl transition-colors group"
                      style={{ background: 'rgba(201,50,93,0.03)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,50,93,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,50,93,0.03)')}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: talent.gradient }}>
                        <talent.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm" style={{ color: '#1a0a12' }}>{talent.name}</div>
                        <div className="text-xs" style={{ color: '#9a7888' }}>{talent.desc}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: '#9a7888' }} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Company Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter('company')}
                onMouseLeave={handleMouseLeave}
              >
                <button className="flex items-center gap-1.5 px-4 py-2 transition-colors text-sm font-medium" style={{ color: '#6b4a5a' }}>
                  Company
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'company' ? 'rotate-180' : ''}`} />
                </button>

                <div className={cn(
                  'absolute top-full right-0 pt-3 w-[280px] transition-[opacity,transform,visibility] duration-200',
                  activeDropdown === 'company'
                    ? 'opacity-100 visible translate-y-0'
                    : 'opacity-0 invisible -translate-y-2'
                )}>
                  <div style={{ background: 'rgba(255,250,252,0.99)', border: '1px solid rgba(201,50,93,0.1)' }} className="rounded-2xl p-4 shadow-xl shadow-black/5">
                    <div className="space-y-1">
                      {company.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="flex items-center gap-3 p-3 rounded-xl transition-colors group"
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,50,93,0.05)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(201,50,93,0.08)' }}>
                            <item.icon className="w-4 h-4 text-fm-magenta-500" />
                          </div>
                          <div>
                            <div className="font-medium text-sm" style={{ color: '#1a0a12' }}>{item.name}</div>
                            <div className="text-xs" style={{ color: '#9a7888' }}>{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:block">
              <Link
                href="/get-started"
                className="v2-btn v2-btn-primary v2-btn-sm"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden relative p-3 -mr-2 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-fm-magenta-200 rounded-lg"
              style={{ zIndex: 10, position: 'relative', minWidth: '48px', minHeight: '48px', color: '#1a0a12' }}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

      </header>

      {/* Mobile Menu - OUTSIDE header to avoid backdrop-filter containing block issue */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-label="Navigation menu"
        className={cn(
          'lg:hidden transition-[opacity,visibility] duration-500 ease-out',
          isMobileMenuOpen
            ? 'opacity-100 visible'
            : 'opacity-0 invisible pointer-events-none'
        )}
        style={{
          position: 'fixed',
          top: '5rem',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 49,
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Light glass background */}
        <div
          className="absolute inset-0 backdrop-blur-xl"
          style={{
            background: `linear-gradient(180deg,
              var(--v2-mobile-menu-from) 0%,
              var(--v2-mobile-menu-via) 50%,
              var(--v2-mobile-menu-to) 100%
            )`
          }}
        />

        <div className="relative h-full overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-6 py-8">
            <div className="space-y-6">
              {/* Services */}
              <div
                className={cn(
                  'transition-[opacity,transform] duration-500',
                  isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                )}
                style={{ transitionDelay: isMobileMenuOpen ? '100ms' : '0ms' }}
              >
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9a7888' }}>Services</div>
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-1.5">
                  {services.map((service) => (
                    <Link
                      key={service.name}
                      href={service.href}
                      className="flex items-center gap-3 p-3 rounded-lg min-h-[48px]"
                      style={{ color: '#3d2030' }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <service.icon className="w-5 h-5 text-fm-magenta-500 flex-shrink-0" />
                      <span className="text-sm">{service.name}</span>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/services"
                  className="flex items-center gap-1 mt-3 px-3 py-2 text-sm text-fm-magenta-600 font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  View all services <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Work */}
              <div
                className={cn(
                  'pt-4 transition-[opacity,transform] duration-500',
                  isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                )}
                style={{ transitionDelay: isMobileMenuOpen ? '150ms' : '0ms', borderTop: '1px solid rgba(201,50,93,0.1)' }}
              >
                <Link
                  href="/work"
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ color: '#1a0a12' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="font-medium">Work</span>
                  <ArrowRight className="w-4 h-4" style={{ color: '#9a7888' }} />
                </Link>
              </div>

              {/* Products - Tools + Talent */}
              <div
                className={cn(
                  'pt-4 transition-[opacity,transform] duration-500',
                  isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                )}
                style={{ transitionDelay: isMobileMenuOpen ? '200ms' : '0ms', borderTop: '1px solid rgba(201,50,93,0.1)' }}
              >
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9a7888' }}>Products</div>

                {/* Tools */}
                <div className="mb-4">
                  <div className="text-[11px] font-medium uppercase tracking-wider mb-2 pl-2" style={{ color: '#b8929f' }}>Tools</div>
                  <div className="space-y-1">
                    {tools.map((tool) => (
                      <Link
                        key={tool.name}
                        href={tool.href}
                        {...(tool.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className="flex items-center gap-3 p-2 rounded-lg"
                        style={{ color: '#3d2030' }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tool.gradient }}>
                          <tool.icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium" style={{ color: '#1a0a12' }}>{tool.name}</span>
                            {tool.comingSoon && <ComingSoonDot />}
                          </div>
                          <div className="text-xs" style={{ color: '#9a7888' }}>{tool.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Talent Network */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider mb-2 pl-2" style={{ color: '#b8929f' }}>Talent Network</div>
                  <Link
                    href={talent.href}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ color: '#3d2030', background: 'rgba(201,50,93,0.04)' }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: talent.gradient }}>
                      <talent.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: '#1a0a12' }}>{talent.name}</div>
                      <div className="text-xs" style={{ color: '#9a7888' }}>{talent.desc}</div>
                    </div>
                    <ArrowRight className="w-4 h-4" style={{ color: '#9a7888' }} />
                  </Link>
                </div>
              </div>

              {/* Company */}
              <div
                className={cn(
                  'pt-4 transition-[opacity,transform] duration-500',
                  isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                )}
                style={{ transitionDelay: isMobileMenuOpen ? '250ms' : '0ms', borderTop: '1px solid rgba(201,50,93,0.1)' }}
              >
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9a7888' }}>Company</div>
                <div className="flex flex-col gap-1">
                  {company.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="text-sm py-2.5 px-3 rounded-lg min-h-[44px] flex items-center"
                      style={{ color: '#3d2030' }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div
                className={cn(
                  'pt-6 transition-[opacity,transform] duration-500',
                  isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                )}
                style={{ transitionDelay: isMobileMenuOpen ? '300ms' : '0ms' }}
              >
                <Link
                  href="/get-started"
                  className="v2-btn v2-btn-primary v2-btn-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started
                </Link>

                <div className="mt-6 text-sm" style={{ textAlign: 'center', color: '#9a7888' }}>
                  <a href="mailto:freakingmindsdigital@gmail.com" className="hover:text-fm-magenta-600 transition-colors">
                    freakingmindsdigital@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
