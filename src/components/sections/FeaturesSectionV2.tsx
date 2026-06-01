'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Search, Megaphone, Palette, BarChart3, ArrowRight, ChevronDown, Check } from 'lucide-react';
import { useCountUp, parseMetric } from '@/hooks/useCountUp';
import { MagneticButton } from '@/components/animations/Card3D';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Extended content for expandable details
const extendedContent: Record<number, string[]> = {
  0: ['Technical SEO audits', 'Content optimization', 'Link building strategies', 'Local SEO targeting'],
  1: ['Platform-specific strategies', 'Content calendars', 'Analytics dashboards', 'Influencer outreach'],
  2: ['A/B testing', 'Conversion tracking', 'Budget optimization', 'Remarketing campaigns'],
  3: ['Logo design', 'Brand guidelines', 'Marketing collateral', 'Digital asset creation'],
};

// Feature-specific shadow colors (updated to new brand #8c1d4a)
const shadowColors: Record<string, string> = {
  'v2-gradient-seo': 'rgba(255, 127, 80, 0.3)',
  'v2-gradient-social': 'rgba(140, 29, 74, 0.3)',
  'v2-gradient-performance': 'rgba(140, 29, 74, 0.25)',
  'v2-gradient-brand': 'rgba(140, 29, 74, 0.3)',
};

const features = [
  {
    icon: Search,
    title: 'Get Found Where It Matters',
    tagline: 'SEO That Actually Works',
    description:
      "Dominate search results with data-driven SEO strategies. We don't just chase rankings—we build sustainable organic growth that puts you in front of customers actively looking for you.",
    highlights: ['First-page rankings', '300% avg traffic growth', 'Quality lead generation'],
    mascot: '/3dasset/brain-strategy.webp',
    mascotAlt: 'Brain mascot character analyzing strategy charts',
    gradientClass: 'v2-gradient-seo',
    accentClass: 'text-fm-orange-400',
    ctaLink: '/services#seo',
    bgColor: '#1c0e16',
  },
  {
    icon: Megaphone,
    title: 'Stop Posting. Start Connecting.',
    tagline: 'Social Media That Converts',
    description:
      "Build engaged communities with thumb-stopping content that turns followers into customers. We create social strategies that don't just get likes—they get results.",
    highlights: ['Community building', '200% engagement boost', 'Influencer partnerships'],
    mascot: '/3dasset/brain-creative.webp',
    mascotAlt: 'Creative brain mascot with artistic tools',
    gradientClass: 'v2-gradient-social',
    accentClass: 'text-fm-magenta-400',
    ctaLink: '/services#social',
    bgColor: '#22101a',
  },
  {
    icon: BarChart3,
    title: 'Every Rupee. Maximum Impact.',
    tagline: 'Performance Marketing',
    description:
      'Laser-focused PPC campaigns that deliver qualified leads while maximizing your ROI. We obsess over your metrics so you can obsess over your business.',
    highlights: ['300% ROAS achieved', 'Cost optimization', 'Real-time analytics'],
    mascot: '/3dasset/brain-teaching.webp',
    mascotAlt: 'Brain mascot presenting performance data',
    gradientClass: 'v2-gradient-performance',
    accentClass: 'text-fm-magenta-400',
    ctaLink: '/services#performance',
    bgColor: '#2a1220',
  },
  {
    icon: Palette,
    title: 'Look Unforgettable',
    tagline: 'Brand Identity Design',
    description:
      "Visual identities that capture attention, build trust, and make competitors jealous. Your brand deserves to be remembered—let's make that happen.",
    highlights: ['180% brand recall', 'Complete visual systems', 'Lasting impressions'],
    mascot: '/3dasset/brain-celebrating.webp',
    mascotAlt: 'Celebrating brain mascot with design elements',
    gradientClass: 'v2-gradient-brand',
    accentClass: 'text-fm-magenta-400',
    ctaLink: '/services#branding',
    bgColor: '#1f0f18',
  },
];

// Check if highlight contains a metric (number)
const isMetricHighlight = (text: string): boolean => {
  return /\d+%|\d+x/i.test(text);
};

// Animated metric component — Fix #2: removed unused `index` from type
function AnimatedMetric({ text, isVisible }: { text: string; isVisible: boolean }) {
  const parsed = parseMetric(text);
  const count = useCountUp(parsed?.number || 0, 2000, true, isVisible);

  if (!parsed) return <span>{text}</span>;

  return (
    <span className="font-bold bg-gradient-to-r from-fm-orange-300 via-fm-orange-400 to-fm-magenta-400 bg-clip-text text-transparent">
      {count}{parsed.suffix} {parsed.rest}
    </span>
  );
}

export function FeaturesSectionV2() {
  const [visibleFeatures, setVisibleFeatures] = useState<number[]>([0]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set());
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const [clickedMascot, setClickedMascot] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(true);
  const [sectionState, setSectionState] = useState<'before' | 'during' | 'after'>('before');
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const mobileSectionRef = useRef<HTMLElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  // Refs for direct DOM manipulation (bypass React re-renders during scroll)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sectionStateRef = useRef<'before' | 'during' | 'after'>('before');
  const visibleFeaturesRef = useRef<Set<number>>(new Set([0]));

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Fix #7: Track mobile scroll position for dot indicators
  useEffect(() => {
    if (!isMobile || !mobileScrollRef.current) return;

    const scrollEl = mobileScrollRef.current;
    const handleScroll = () => {
      const scrollLeft = scrollEl.scrollLeft;
      const cardWidth = scrollEl.firstElementChild
        ? (scrollEl.firstElementChild as HTMLElement).offsetWidth + 20 // 20 = gap
        : 340;
      const index = Math.round(scrollLeft / cardWidth);
      setMobileActiveIndex(Math.min(index, features.length - 1));
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Main scroll handler — direct DOM manipulation to avoid React re-renders per frame
  // Uses cached dimensions + rAF throttle to eliminate layout thrashing
  useEffect(() => {
    if (isMobile || prefersReducedMotion || !containerRef.current) return;

    // Cache dimensions to avoid getBoundingClientRect/offsetHeight every frame
    let cachedContainerTop = 0;
    let cachedContainerHeight = 0;
    let cachedWindowHeight = window.innerHeight;
    let rafId = 0;
    let ticking = false;

    const measureDimensions = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      cachedContainerTop = rect.top + window.scrollY;
      cachedContainerHeight = container.offsetHeight;
      cachedWindowHeight = window.innerHeight;
    };

    // Measure once on mount
    measureDimensions();

    // Re-measure after GSAP ScrollTrigger pins are set up (pin spacers shift element positions)
    ScrollTrigger.addEventListener('refresh', measureDimensions);
    // Fallback delayed re-measure in case refresh fires before this listener is attached
    const delayedMeasure = setTimeout(measureDimensions, 400);

    // Re-measure on resize (debounced)
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measureDimensions, 150);
    };

    const updateCards = () => {
      ticking = false;
      const scrollProgress = window.scrollY - cachedContainerTop;
      const maxScroll = cachedContainerHeight - cachedWindowHeight;

      // Determine section state
      let newState: 'before' | 'during' | 'after';
      if (scrollProgress < 0) {
        newState = 'before';
      } else if (scrollProgress > maxScroll) {
        newState = 'after';
      } else {
        newState = 'during';
      }

      // Only trigger React re-render when state actually changes
      if (newState !== sectionStateRef.current) {
        sectionStateRef.current = newState;
        setSectionState(newState);
      }

      // Calculate and apply card transforms directly to DOM (no React re-render)
      const scrollPerCard = maxScroll / (features.length - 1);

      features.forEach((_, index) => {
        const card = cardRefs.current[index];
        if (!card) return;

        let offset: number;
        if (newState === 'before') {
          offset = index === 0 ? 0 : 100;
        } else if (newState === 'after') {
          offset = 0;
        } else {
          if (index === 0) {
            offset = 0;
          } else {
            const cardScrollStart = (index - 1) * scrollPerCard;
            const cardScrollEnd = index * scrollPerCard;
            if (scrollProgress <= cardScrollStart) {
              offset = 100;
            } else if (scrollProgress >= cardScrollEnd) {
              offset = 0;
            } else {
              const progress = (scrollProgress - cardScrollStart) / scrollPerCard;
              offset = Math.round((1 - progress) * 100);
            }
          }
        }

        card.style.transform = `translateY(${offset}%)`;
        card.style.willChange = newState === 'during' ? 'transform' : 'auto';

        // Track visible features via ref — only setState when a genuinely new card appears
        if (offset < 50 && !visibleFeaturesRef.current.has(index)) {
          visibleFeaturesRef.current.add(index);
          setVisibleFeatures(Array.from(visibleFeaturesRef.current));
        }
      });
    };

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        rafId = requestAnimationFrame(updateCards);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    // Initial call
    updateCards();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      ScrollTrigger.removeEventListener('refresh', measureDimensions);
      cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      clearTimeout(delayedMeasure);
    };
  }, [isMobile, prefersReducedMotion]);

  // Fix #8: Enhanced mascot click with wobble
  const handleMascotClick = useCallback((index: number) => {
    if (prefersReducedMotion) return;
    setClickedMascot(index);
    setTimeout(() => setClickedMascot(null), 600);
  }, [prefersReducedMotion]);

  // Handle image load
  const handleImageLoad = useCallback((index: number) => {
    setImagesLoaded(prev => new Set(prev).add(index));
  }, []);

  // GSAP entrance animation for mobile cards
  useEffect(() => {
    if (!isMobile || prefersReducedMotion || !mobileSectionRef.current) return;

    const section = mobileSectionRef.current;
    const ctx = gsap.context(() => {
      gsap.from(section.querySelectorAll('.feature-card-mobile'), {
        x: 20, opacity: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out',
        scrollTrigger: {
          trigger: section.querySelector('.mobile-scroll-track'),
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    }, section);

    return () => ctx.revert();
  }, [isMobile, prefersReducedMotion]);

  // Mobile Layout - Horizontal scroll cards
  if (isMobile || prefersReducedMotion) {
    return (
      <section ref={mobileSectionRef} className="relative z-10 v2-section" aria-labelledby="features-heading">
        <div className="v2-container mb-10">
          <div className="max-w-3xl mx-auto" style={{ textAlign: 'center' }}>
            <h2 id="features-heading" className="font-display text-3xl md:text-4xl font-bold v2-text-primary mb-4 leading-tight">
              Why Brands <span className="v2-accent">Choose Us</span>
            </h2>
            <p className="text-base v2-text-secondary leading-relaxed">
              Every engagement is designed to deliver real, measurable impact for your business.
            </p>
          </div>
        </div>

        <div className="pb-20 mobile-scroll-track">
          <div
            ref={mobileScrollRef}
            className="flex gap-5 overflow-x-auto hide-scrollbar pb-4"
            style={{
              paddingLeft: 'max(1rem, calc((100vw - 1280px) / 2 + 1.5rem))',
              paddingRight: '1.5rem',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const shadowColor = shadowColors[feature.gradientClass] || 'rgba(0,0,0,0.4)';

              return (
                <article
                  key={feature.title}
                  className="feature-card-mobile flex-shrink-0 relative rounded-2xl border overflow-hidden flex flex-col"
                  style={{
                    width: 'min(320px, 85vw)',
                    scrollSnapAlign: 'start',
                    backgroundColor: feature.bgColor,
                    borderColor: 'rgba(140, 29, 74, 0.2)',
                  }}
                >
                  {/* Brain mascot — uses plain <img> on mobile to avoid Next.js Image optimization issues in horizontal scroll */}
                  <div className="relative flex justify-center pt-6 pb-2">
                    <div
                      className={`absolute w-36 h-36 rounded-full opacity-40 ${feature.gradientClass}`}
                      style={{ filter: 'blur(25px)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                    />
                    <div
                      className="relative"
                      style={{
                        zIndex: 2,
                        animation: prefersReducedMotion ? 'none' : 'featureFloat 6s ease-in-out infinite',
                        animationDelay: `${index * 0.5}s`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={feature.mascot}
                        alt={feature.mascotAlt}
                        loading="lazy"
                        width={200}
                        height={200}
                        className="w-44"
                        style={{
                          filter: `drop-shadow(0 20px 40px ${shadowColor})`,
                          height: 'auto',
                        }}
                      />
                    </div>
                  </div>

                  {/* Card content */}
                  <div className="px-5 pb-6 flex flex-col flex-1">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 self-start" style={{ marginBottom: '10px' }}>
                      <div className={`w-5 h-5 rounded ${feature.gradientClass} flex items-center justify-center`}>
                        <Icon className={`w-3 h-3 ${feature.accentClass}`} />
                      </div>
                      <span className="text-white/70 text-xs font-medium">{feature.tagline}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-display text-xl font-bold text-white leading-tight" style={{ marginBottom: '8px' }}>
                      {feature.title}
                    </h3>

                    {/* Description - 3 line clamp */}
                    <p className="text-sm text-white/60 leading-relaxed line-clamp-3" style={{ marginBottom: '12px' }}>
                      {feature.description}
                    </p>

                    {/* Highlight pills */}
                    <div className="flex flex-wrap gap-2" style={{ marginBottom: '16px' }}>
                      {feature.highlights.map((highlight) => (
                        <div key={highlight} className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-white">
                          {highlight}
                        </div>
                      ))}
                    </div>

                    {/* CTA button - pushed to bottom */}
                    <div className="mt-auto">
                      <MagneticButton
                        as="a"
                        href={feature.ctaLink}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-fm-neutral-900 font-semibold rounded-full hover:bg-white/90 transition-colors group text-sm"
                      >
                        <span>Learn More</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </MagneticButton>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Fix #7: Mobile scroll dot indicators */}
          <div className="flex justify-center gap-2 mt-5">
            {features.map((_, i) => (
              <button
                key={i}
                className="w-2 h-2 rounded-full transition-[background-color,transform] duration-300"
                style={{
                  backgroundColor: i === mobileActiveIndex ? '#8c1d4a' : 'rgba(140, 29, 74, 0.25)',
                  transform: i === mobileActiveIndex ? 'scale(1.3)' : 'scale(1)',
                }}
                onClick={() => {
                  if (mobileScrollRef.current) {
                    const cardEl = mobileScrollRef.current.children[i] as HTMLElement;
                    cardEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                  }
                }}
                aria-label={`Go to card ${i + 1}: ${features[i].tagline}`}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Desktop Layout - Stacking Cards with JS-controlled transforms
  return (
    <section className="relative z-10" aria-labelledby="features-heading">
      {/* Section Header */}
      <div className="v2-container" style={{ paddingTop: 'var(--v2-section-padding)', paddingBottom: 'var(--v2-section-padding)' }}>
        <div className="max-w-3xl mx-auto" style={{ textAlign: 'center' }}>
          <h2 id="features-heading" className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-6 leading-tight">
            Why Brands <span className="v2-accent">Choose Us</span>
          </h2>
          <p className="text-lg md:text-xl v2-text-secondary leading-relaxed">
            Every engagement is designed to deliver real, measurable impact for your business.
          </p>
        </div>
      </div>

      {/* Fix #4: Reduced from 100vh to 80vh per card — less scroll fatigue */}
      <div
        ref={containerRef}
        className="relative"
        style={{ height: `${features.length * 80}vh` }}
      >
        {/* Cards viewport - fixed during scroll, absolute at start/end */}
        <div
          className="w-full h-screen overflow-hidden"
          style={{
            position: sectionState === 'during' ? 'fixed' : 'absolute',
            top: sectionState === 'after' ? 'auto' : 0,
            bottom: sectionState === 'after' ? 0 : 'auto',
            left: 0,
            right: 0,
            zIndex: 20,
          }}
        >
          {features.map((feature, index) => {
            const isVisible = visibleFeatures.includes(index);
            const isEven = index % 2 === 0;
            const Icon = feature.icon;
            const shadowColor = shadowColors[feature.gradientClass] || 'rgba(0,0,0,0.4)';

            return (
              <div
                key={feature.title}
                ref={(el) => { cardRefs.current[index] = el; }}
                className="absolute inset-x-4 md:inset-x-8 lg:inset-x-16 top-8 bottom-8 rounded-3xl lg:rounded-[2.5rem] overflow-hidden"
                style={{
                  backgroundColor: feature.bgColor,
                  zIndex: index + 1,
                  transform: `translateY(${index === 0 ? 0 : 100}%)`,
                  boxShadow: '0 25px 80px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.3), 0 0 0 1.5px rgba(140, 29, 74, 0.35)',
                  border: '1px solid rgba(140, 29, 74, 0.25)',
                }}
              >
                {/* Dot pattern */}
                <div
                  className="absolute inset-0 opacity-[0.02] pointer-events-none rounded-3xl lg:rounded-[2.5rem]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                    backgroundSize: '40px 40px',
                    zIndex: 0,
                  }}
                />

                {/* Card content */}
                <div className="w-full h-full flex items-center overflow-hidden" style={{ position: 'relative', zIndex: 2 }}>
                  <div className="v2-container w-full max-w-6xl py-12 lg:py-16 relative" style={{ zIndex: 2 }}>
                    {/* Feature number */}
                    <div className="absolute top-4 right-4 lg:top-8 lg:right-8 flex items-center gap-2">
                      <span className="text-sm font-medium text-white/40">{String(index + 1).padStart(2, '0')}</span>
                      <span className="text-sm text-white/30">/</span>
                      <span className="text-sm text-white/30">{String(features.length).padStart(2, '0')}</span>
                    </div>

                    <div className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${isEven ? '' : 'lg:grid-flow-dense'}`}>
                      {/* Mascot Side */}
                      <div className={`order-1 lg:order-none relative flex items-center justify-center py-4 lg:py-0 ${isEven ? '' : 'lg:col-start-1 lg:row-start-1'}`}>
                        <div
                          className={`absolute w-[200px] h-[200px] md:w-[280px] md:h-[280px] lg:w-[350px] lg:h-[350px] rounded-full opacity-40 ${feature.gradientClass}`}
                          style={{ filter: 'blur(25px)' }}
                        />
                        <div
                          className="mascot-wrapper relative cursor-pointer"
                          onClick={() => handleMascotClick(index)}
                          role="button"
                          tabIndex={0}
                          aria-label={`Click to interact with ${feature.mascotAlt}`}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMascotClick(index); }}
                        >
                          {/* Fix #8: Enhanced mascot click with wobble + scale */}
                          <Image
                            src={feature.mascot}
                            alt={feature.mascotAlt}
                            width={320}
                            height={320}
                            className={`w-48 sm:w-56 md:w-64 lg:w-80 transition-opacity duration-300 ${imagesLoaded.has(index) ? 'opacity-100' : 'opacity-0'}`}
                            style={{
                              filter: `drop-shadow(0 20px 40px ${shadowColor})`,
                              animation: clickedMascot === index
                                ? 'mascotWobble 0.6s ease-out'
                                : 'featureFloat 6s ease-in-out infinite',
                              animationDelay: clickedMascot === index ? '0s' : `${index * 0.5}s`,
                            }}
                            onLoad={() => handleImageLoad(index)}
                            loading="eager"
                            priority={index < 2}
                          />
                        </div>
                      </div>

                      {/* Content Side */}
                      <div className={`order-2 lg:order-none text-center lg:text-left ${isEven ? '' : 'lg:col-start-2'}`}>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-5">
                          <div className={`w-6 h-6 rounded-lg ${feature.gradientClass} flex items-center justify-center`}>
                            <Icon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-white/70 text-sm font-medium tracking-wide">{feature.tagline}</span>
                        </div>

                        <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                          {feature.title}
                        </h3>

                        <p className="text-sm lg:text-base text-white/70 mb-5 leading-relaxed max-w-xl">
                          {feature.description}
                        </p>

                        <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-5">
                          {feature.highlights.map((highlight, hIdx) => (
                            <div key={highlight} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/15 transition-colors">
                              <span className="text-xs font-medium text-white">
                                {isMetricHighlight(highlight) ? <AnimatedMetric text={highlight} isVisible={isVisible} /> : highlight}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mb-5">
                          {/* Fix #6: Added aria-controls linking button to expanded content */}
                          <button
                            onClick={() => setExpandedFeature(expandedFeature === index ? null : index)}
                            className="text-sm text-white/50 hover:text-white/70 flex items-center gap-2 mx-auto lg:mx-0 transition-colors p-2 -m-2"
                            aria-expanded={expandedFeature === index}
                            aria-controls={`feature-details-${index}`}
                          >
                            {expandedFeature === index ? 'Show less' : "See what's included"}
                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedFeature === index ? 'rotate-180' : ''}`} />
                          </button>

                          {expandedFeature === index && (
                            <ul id={`feature-details-${index}`} className="mt-3 space-y-1.5">
                              {extendedContent[index]?.map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-white/60 text-sm justify-center lg:justify-start">
                                  <Check className="w-4 h-4 text-fm-orange-400 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <MagneticButton
                          as="a"
                          href={feature.ctaLink}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-fm-neutral-900 font-semibold rounded-full hover:bg-white/90 transition-colors group text-sm"
                        >
                          <span>Learn More</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </MagneticButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
