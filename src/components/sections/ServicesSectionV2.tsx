'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Search,
  Megaphone,
  Palette,
  BarChart3,
  Globe,
  Video,
  Sparkles,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MagneticButton } from '@/components/animations/Card3D';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const services = [
  {
    icon: Search,
    title: 'Search Engine Optimization',
    tagline: 'Get found. Get chosen.',
    description:
      'Dominate search results with data-driven SEO strategies that put you where customers are looking.',
    features: ['Keyword Strategy', 'Technical SEO', 'Content Authority', 'Local Search'],
    colorClass: 'v2-gradient-seo',
    bgImage: '/3dasset/seo-bg.webp',
  },
  {
    icon: Megaphone,
    title: 'Social Media Marketing',
    tagline: 'Stop posting. Start connecting.',
    description:
      'Build engaged communities with thumb-stopping content that turns followers into customers.',
    features: ['Content Strategy', 'Community Building', 'Paid Campaigns', 'Influencer Marketing'],
    colorClass: 'v2-gradient-social',
    bgImage: '/3dasset/social-media-bg.webp',
  },
  {
    icon: BarChart3,
    title: 'Performance Marketing',
    tagline: 'Every rupee. Maximum impact.',
    description:
      'Laser-focused PPC campaigns that deliver qualified leads while maximizing your ROI.',
    features: ['Google Ads', 'Meta Ads', 'Retargeting', 'Conversion Optimization'],
    colorClass: 'v2-gradient-performance',
    bgImage: '/3dasset/performance-marketing-bg.webp',
  },
  {
    icon: Palette,
    title: 'Brand Identity Design',
    tagline: 'Look unforgettable.',
    description:
      'Visual identities that capture attention, build trust, and make competitors jealous.',
    features: ['Logo Design', 'Brand Guidelines', 'Visual Systems', 'Packaging'],
    colorClass: 'v2-gradient-brand',
    bgImage: '/3dasset/brand-identity-bg.webp',
  },
  {
    icon: Globe,
    title: 'Website Development',
    tagline: 'Fast. Beautiful. Converting.',
    description: "Lightning-fast websites that don't just look good—they close deals 24/7.",
    features: ['Custom Development', 'E-commerce', 'CMS Solutions', 'Speed Optimization'],
    colorClass: 'v2-gradient-web',
    bgImage: '/3dasset/web-development-bg.webp',
  },
  {
    icon: Video,
    title: 'Content Production',
    tagline: 'Stories that sell.',
    description: 'From scroll-stopping videos to blogs that rank, content that drives real action.',
    features: ['Video Production', 'Copywriting', 'Photography', 'Email Campaigns'],
    colorClass: 'v2-gradient-content',
    bgImage: '/3dasset/content-production-bg.webp',
  },
];

/** Shared card markup used by both mobile and desktop */
function ServiceCard({
  service,
  variant,
}: {
  service: (typeof services)[number];
  variant: 'mobile' | 'desktop';
}) {
  const Icon = service.icon;
  const isMobile = variant === 'mobile';
  const hasBgImage = !!service.bgImage;

  return (
    <div className="relative v2-paper-static rounded-2xl h-full flex flex-col overflow-hidden">
      {/* Gradient header with icon */}
      <div
        className={`relative ${service.colorClass} ${
          isMobile
            ? hasBgImage ? 'px-5 pt-5 pb-4 sm:px-6 sm:pt-6' : 'px-5 pt-5 pb-4 sm:px-6 sm:pt-6'
            : hasBgImage ? 'px-7 pt-7 pb-6 lg:px-8 lg:pt-8' : 'px-7 pt-7 pb-6 lg:px-8 lg:pt-8'
        }`}
        style={hasBgImage ? { minHeight: isMobile ? '160px' : '200px' } : undefined}
      >
        {/* Background image (if provided) */}
        {service.bgImage && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <Image
              src={service.bgImage}
              alt=""
              width={400}
              height={400}
              style={{
                opacity: 0.25,
                mixBlendMode: 'luminosity',
                width: isMobile ? '70%' : '65%',
                height: 'auto',
                position: 'absolute',
                right: '-5%',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
          </div>
        )}
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className={`absolute -top-10 -right-10 rounded-full ${isMobile ? 'w-28 h-28' : 'w-40 h-40'}`}
            style={{ background: 'rgba(255,255,255,0.08)' }}
          />
          {!isMobile && (
            <>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="absolute top-4 right-20 w-3 h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </>
          )}
        </div>
        <div className={`relative ${isMobile ? 'flex items-center gap-3' : ''}`}>
          <div
            className={`${isMobile ? 'w-10 h-10 rounded-lg' : 'w-12 h-12 rounded-xl mb-4'} flex items-center justify-center`}
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}
          >
            <Icon className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
          </div>
          <p className={`text-white/80 font-semibold tracking-widest uppercase ${isMobile ? 'text-[11px]' : 'text-xs'}`}>
            {service.tagline}
          </p>
        </div>
      </div>

      {/* Content area */}
      <div className={`relative flex-1 ${isMobile ? 'p-5 sm:p-6' : 'p-7 lg:p-8'} flex flex-col overflow-hidden`}>
        {/* Watermark icon */}
        <div className="absolute pointer-events-none" style={{ bottom: '-10px', right: '-10px', opacity: 0.04 }}>
          <Icon style={{ width: isMobile ? '120px' : '180px', height: isMobile ? '120px' : '180px' }} />
        </div>

        {/* Title */}
        <h3
          className={`relative font-display font-bold text-fm-neutral-900 leading-snug ${isMobile ? 'text-lg' : 'text-2xl lg:text-[1.7rem]'}`}
          style={{ marginBottom: isMobile ? '8px' : '12px' }}
        >
          {service.title}
        </h3>

        {/* Description */}
        <p
          className="relative text-fm-neutral-600 text-sm leading-relaxed"
          style={{ marginBottom: isMobile ? '16px' : '20px' }}
        >
          {service.description}
        </p>

        {/* Features — pill tags */}
        <div className={`relative flex flex-wrap ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
          {service.features.map((f) => (
            <span
              key={f}
              className={`rounded-full bg-fm-magenta-50 text-fm-magenta-600 font-medium ${
                isMobile ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
              }`}
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="relative mt-auto border-t border-fm-neutral-100" style={{ paddingTop: isMobile ? '16px' : '20px' }}>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-full text-sm font-semibold text-white transition-[background-color] group"
            style={{
              padding: '0.5rem 1.25rem',
              background: 'linear-gradient(135deg, var(--color-fm-magenta-600), var(--color-fm-magenta-700))',
            }}
          >
            Learn More
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ServicesSectionV2() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressWrapperRef = useRef<HTMLDivElement>(null);
  const progressCountRef = useRef<HTMLSpanElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 1023px)');
    setPrefersReducedMotion(motionQuery.matches);
    setIsMobile(mobileQuery.matches);
    const hm = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    const hd = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    motionQuery.addEventListener('change', hm);
    mobileQuery.addEventListener('change', hd);
    return () => { motionQuery.removeEventListener('change', hm); mobileQuery.removeEventListener('change', hd); };
  }, []);

  // Desktop horizontal scroll
  useEffect(() => {
    if (prefersReducedMotion || isMobile) return;
    const section = sectionRef.current;
    const trigger = triggerRef.current;
    const horizontal = horizontalRef.current;
    const header = headerRef.current;
    if (!section || !trigger || !horizontal || !header) return;

    const ctx = gsap.context(() => {
      // Header stagger reveal
      gsap.from(header.querySelectorAll('.reveal-item'), {
        y: 25, opacity: 0, duration: 0.45, stagger: 0.06, ease: 'power2.out',
        scrollTrigger: { trigger: header, start: 'top 85%', toggleActions: 'play none none none' },
      });

      // Scroll math
      const cards = horizontal.querySelectorAll('.service-card');
      const cardWidth = cards[0]?.getBoundingClientRect().width || 460;
      const gap = 32;
      const totalWidth = (cardWidth + gap) * cards.length + 120;
      const scrollDistance = Math.max(0, totalWidth - window.innerWidth + 80);

      // Horizontal pin + scroll
      const horizontalTween = gsap.to(horizontal, {
        x: () => -scrollDistance,
        ease: 'none',
        scrollTrigger: {
          trigger: trigger,
          start: 'top top',
          end: () => `+=${scrollDistance}`,
          scrub: 1.5,
          pin: true,
          anticipatePin: 1,
          fastScrollEnd: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Direct DOM update — no React re-render
            if (progressBarRef.current) {
              progressBarRef.current.style.width = `${self.progress * 100}%`;
            }
            if (progressCountRef.current) {
              const count = Math.min(Math.round(self.progress * services.length) + 1, services.length);
              progressCountRef.current.textContent = `${count}/${services.length}`;
            }
          },
          onEnter: () => { if (progressWrapperRef.current) progressWrapperRef.current.style.opacity = '1'; },
          onLeave: () => { if (progressWrapperRef.current) progressWrapperRef.current.style.opacity = '0'; },
          onEnterBack: () => { if (progressWrapperRef.current) progressWrapperRef.current.style.opacity = '1'; },
          onLeaveBack: () => { if (progressWrapperRef.current) progressWrapperRef.current.style.opacity = '0'; },
        },
      });

      // Card entrance — first card is already visible, others slide in
      cards.forEach((card, i) => {
        if (i === 0) return;
        gsap.from(card, {
          opacity: 0, x: 80, scale: 0.94,
          scrollTrigger: {
            trigger: card, containerAnimation: horizontalTween,
            start: 'left 92%', end: 'left 65%', scrub: 1,
          },
        });
      });

      // CTA
      if (ctaRef.current) {
        gsap.from(ctaRef.current, {
          y: 20, opacity: 0, duration: 0.4, ease: 'power2.out',
          scrollTrigger: { trigger: ctaRef.current, start: 'top 90%', toggleActions: 'play none none none' },
        });
      }
    }, section);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
    };
    window.addEventListener('resize', onResize);
    return () => { ctx.revert(); window.removeEventListener('resize', onResize); clearTimeout(resizeTimer); };
  }, [prefersReducedMotion, isMobile]);

  // Mobile / reduced-motion animations
  useEffect(() => {
    if (!prefersReducedMotion && !isMobile) return;
    const section = sectionRef.current;
    const header = headerRef.current;
    if (!section || !header) return;

    const ctx = gsap.context(() => {
      gsap.from(header.querySelectorAll('.reveal-item'), {
        y: 15, opacity: 0, duration: 0.35, stagger: 0.05, ease: 'power2.out',
        scrollTrigger: { trigger: header, start: 'top 85%', toggleActions: 'play none none none' },
      });
      gsap.from(section.querySelectorAll('.service-card-mobile'), {
        x: 20, opacity: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out',
        scrollTrigger: { trigger: section.querySelector('.mobile-scroll-track'), start: 'top 85%', toggleActions: 'play none none none' },
      });
      if (ctaRef.current) {
        gsap.from(ctaRef.current, { y: 15, opacity: 0, duration: 0.35, ease: 'power2.out',
          scrollTrigger: { trigger: ctaRef.current, start: 'top 90%', toggleActions: 'play none none none' },
        });
      }
    }, section);
    return () => ctx.revert();
  }, [prefersReducedMotion, isMobile]);

  // ─── Mobile / Reduced Motion ─────────────────────────
  if (prefersReducedMotion || isMobile) {
    return (
      <section ref={sectionRef} className="relative z-10 overflow-visible pt-32 md:pt-36">
        <div ref={headerRef} className="v2-container pb-10">
          <div className="max-w-3xl mx-auto" style={{ textAlign: 'center' }}>
            <div className="reveal-item v2-badge v2-badge-glass mb-6">
              <Sparkles className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">Our Core Services</span>
            </div>
            <h2 className="reveal-item font-display text-3xl sm:text-4xl md:text-5xl font-bold v2-text-primary mb-6 leading-tight">
              Full-Service Marketing That <span className="v2-accent">Drives Growth</span>
            </h2>
            <p className="reveal-item text-base md:text-lg lg:text-xl v2-text-secondary leading-relaxed">
              From brand strategy to performance marketing, everything your brand needs to grow — under one roof.
            </p>
          </div>
        </div>

        {/* Horizontal scroll cards */}
        <div className="pb-20 mobile-scroll-track">
          <div
            ref={mobileScrollRef}
            className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar"
            style={{
              paddingLeft: 'max(1rem, calc((100vw - 1280px) / 2 + 1.5rem))',
              paddingRight: '1.5rem',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {services.map((service) => (
              <div
                key={service.title}
                className="service-card-mobile flex-shrink-0"
                style={{
                  width: 'min(320px, 82vw)',
                  scrollSnapAlign: 'start',
                }}
              >
                <ServiceCard service={service} variant="mobile" />
              </div>
            ))}
          </div>
        </div>

        <div ref={ctaRef} className="v2-container v2-container-narrow pb-28">
          <div className="v2-paper rounded-3xl relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14 md:px-10 md:py-16" style={{ textAlign: 'center' }}>
            {/* Smokey brand color effect */}
            <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden' }}>
              <div className="cta-smoke-blob" style={{ width: '300px', height: '300px', top: '-60px', left: '-40px', background: 'radial-gradient(circle, rgba(201,50,93,0.18) 0%, rgba(201,50,93,0.06) 40%, transparent 70%)', animation: 'ctaSmokeFloat1 8s ease-in-out infinite' }} />
              <div className="cta-smoke-blob" style={{ width: '350px', height: '350px', bottom: '-80px', right: '-60px', background: 'radial-gradient(circle, rgba(168,37,72,0.15) 0%, rgba(90,26,56,0.08) 40%, transparent 70%)', animation: 'ctaSmokeFloat2 10s ease-in-out infinite' }} />
              <div className="cta-smoke-blob" style={{ width: '250px', height: '250px', top: '20%', right: '15%', background: 'radial-gradient(circle, rgba(236,117,160,0.12) 0%, rgba(236,117,160,0.04) 40%, transparent 70%)', animation: 'ctaSmokeFloat1 12s ease-in-out infinite 2s' }} />
              <div className="cta-smoke-blob" style={{ width: '200px', height: '200px', bottom: '10%', left: '20%', background: 'radial-gradient(circle, rgba(255,127,80,0.1) 0%, rgba(255,127,80,0.03) 40%, transparent 70%)', animation: 'ctaSmokeFloat2 9s ease-in-out infinite 4s' }} />
            </div>
            <div className="relative z-10">
              <h3 className="font-display text-2xl md:text-3xl font-bold text-fm-neutral-900" style={{ marginBottom: '24px' }}>
                Ready to see what we can do for you?
              </h3>
              <p className="text-fm-neutral-600 text-lg max-w-xl mx-auto leading-relaxed" style={{ marginBottom: '36px' }}>
                Get a free strategy session and discover how we can accelerate your business growth.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <MagneticButton as="a" href="/get-started" strength={0.3} className="v2-btn v2-btn-magenta group">
                  <span>Get Free Strategy Call</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </MagneticButton>
                <MagneticButton as="a" href="/work" strength={0.3} className="v2-btn v2-btn-outline">See Our Results</MagneticButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ─── Desktop: Full-Width Cinematic Horizontal Scroll ──
  return (
    <section ref={sectionRef} className="relative z-10 overflow-hidden">
      {/* Header — scrolls normally, then the pin begins */}
      <div ref={headerRef} className="relative z-10 v2-container pt-36 pb-20">
        <div className="max-w-3xl mx-auto" style={{ textAlign: 'center' }}>
          <div className="reveal-item v2-badge v2-badge-glass mb-6">
            <Sparkles className="w-4 h-4 v2-text-primary" />
            <span className="v2-text-primary">Our Core Services</span>
          </div>
          <h2 className="reveal-item font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-6 leading-tight">
            Full-Service Marketing That <span className="v2-accent">Drives Growth</span>
          </h2>
          <p className="reveal-item text-lg md:text-xl v2-text-secondary leading-relaxed max-w-2xl mx-auto">
            From brand strategy to performance marketing, everything your brand needs to grow — under one roof.
          </p>
        </div>
      </div>

      {/* Pinned horizontal scroll viewport */}
      <div ref={triggerRef} className="relative">
        <div className="h-screen flex flex-col">
          {/* Cards track */}
          <div className="flex-1 flex items-center overflow-hidden">
            <div
              ref={horizontalRef}
              className="flex items-stretch gap-8 h-[min(520px,68vh)]"
              style={{
                paddingLeft: 'max(3rem, calc((100vw - 1280px) / 2 + 3rem))',
                paddingRight: '6rem',
              }}
            >
              {services.map((service) => (
                <div key={service.title} className="service-card flex-shrink-0 w-[420px] xl:w-[460px]">
                  <ServiceCard service={service} variant="desktop" />
                </div>
              ))}
            </div>
          </div>

          {/* Minimal progress track — sits at bottom of pinned viewport */}
          <div
            ref={progressWrapperRef}
            className="pb-8 pt-4 transition-opacity duration-500"
            style={{
              paddingLeft: 'max(3rem, calc((100vw - 1280px) / 2 + 3rem))',
              paddingRight: 'max(3rem, calc((100vw - 1280px) / 2 + 3rem))',
              opacity: 0,
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex-1 h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(201, 50, 93, 0.15)' }}>
                <div
                  ref={progressBarRef}
                  className="h-full rounded-full"
                  style={{
                    width: '0%',
                    background: 'linear-gradient(90deg, rgba(201,50,93,0.8), rgba(255,150,100,0.8))',
                  }}
                />
              </div>
              <span ref={progressCountRef} className="text-xs v2-text-muted tabular-nums font-medium min-w-[3ch]">
                1/{services.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div ref={ctaRef} className="relative z-10 v2-container v2-container-narrow py-20 lg:py-28">
        <div className="v2-paper rounded-3xl relative overflow-hidden px-6 py-12 sm:px-10 sm:py-16 md:px-12 md:py-20" style={{ textAlign: 'center' }}>
          {/* Smokey brand color effect */}
          <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden' }}>
            <div className="cta-smoke-blob" style={{ width: '400px', height: '400px', top: '-100px', left: '-80px', background: 'radial-gradient(circle, rgba(201,50,93,0.18) 0%, rgba(201,50,93,0.06) 40%, transparent 70%)', animation: 'ctaSmokeFloat1 8s ease-in-out infinite' }} />
            <div className="cta-smoke-blob" style={{ width: '450px', height: '450px', bottom: '-120px', right: '-100px', background: 'radial-gradient(circle, rgba(168,37,72,0.15) 0%, rgba(90,26,56,0.08) 40%, transparent 70%)', animation: 'ctaSmokeFloat2 10s ease-in-out infinite' }} />
            <div className="cta-smoke-blob" style={{ width: '300px', height: '300px', top: '15%', right: '10%', background: 'radial-gradient(circle, rgba(236,117,160,0.12) 0%, rgba(236,117,160,0.04) 40%, transparent 70%)', animation: 'ctaSmokeFloat1 12s ease-in-out infinite 2s' }} />
            <div className="cta-smoke-blob" style={{ width: '280px', height: '280px', bottom: '5%', left: '15%', background: 'radial-gradient(circle, rgba(255,127,80,0.1) 0%, rgba(255,127,80,0.03) 40%, transparent 70%)', animation: 'ctaSmokeFloat2 9s ease-in-out infinite 4s' }} />
          </div>
          <div className="relative z-10">
            <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-fm-neutral-900" style={{ marginBottom: '32px' }}>
              Ready to see what we can do for you?
            </h3>
            <p className="text-fm-neutral-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ marginBottom: '48px' }}>
              Get a free strategy session and discover how we can accelerate your business growth.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <MagneticButton as="a" href="/get-started" strength={0.3} className="v2-btn v2-btn-magenta group">
                <span>Get Free Strategy Call</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
              <MagneticButton as="a" href="/work" strength={0.3} className="v2-btn v2-btn-outline">See Our Results</MagneticButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
