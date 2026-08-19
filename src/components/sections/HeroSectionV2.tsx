'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { GradientOrb } from '@/components/animations/ParallaxLayer';

// Rotating phrases for the hero headline
const rotatingPhrases = [
  'move markets.',
  'drive growth.',
  'spark change.',
  'build empires.',
  'break barriers.',
  'create impact.',
  'inspire action.',
  'win hearts.',
  'turn heads.',
];

export function HeroSectionV2() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineStaticRef = useRef<HTMLSpanElement>(null);
  const headlineRotatingRef = useRef<HTMLSpanElement>(null);
  const subheadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);

  // Check for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Entrance animation is CSS-driven (see .v2-hero-enter in globals.css).
  // It previously ran through a GSAP timeline here, which meant the whole
  // above-the-fold area sat at opacity:0 until hydration — ~7s on throttled
  // mobile, and the dominant term in LCP. The CSS version keeps the identical
  // stagger, durations and easing but paints without waiting for JS.


  // Rotate phrases every 3 seconds
  useEffect(() => {
    if (prefersReducedMotion) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setIsAnimating(true);
      timeoutId = setTimeout(() => {
        setCurrentPhraseIndex((prev) => (prev + 1) % rotatingPhrases.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [prefersReducedMotion]);

  // Mouse parallax for mascot — ref-based direct DOM update (zero re-renders)
  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      mousePosRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (mascotRef.current) {
            const { x, y } = mousePosRef.current;
            mascotRef.current.style.transform = `
              perspective(800px)
              rotateY(${(x - 0.5) * 12}deg)
              rotateX(${(y - 0.5) * -8}deg)
              translateX(${(x - 0.5) * 15}px)
              translateY(${(y - 0.5) * 10}px)
            `;
          }
          rafRef.current = 0;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[min(100vh,960px)] overflow-hidden flex items-center"
    >
      {/* Ambient Gradient Orbs — 2 only, subtle depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <GradientOrb
          color="rgba(201, 50, 93, 0.2)"
          size={650}
          blur={25}
          position={{ top: '5%', left: '-12%' }}
        />
        <GradientOrb
          color="rgba(160, 30, 70, 0.15)"
          size={500}
          blur={20}
          position={{ bottom: '10%', right: '-10%' }}
        />
      </div>

      {/* Main Content — Asymmetric layout */}
      <div className="relative z-10 v2-container w-full pt-28 lg:pt-36 pb-28 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* Left Column — Text content (7 cols on desktop) */}
          <div className="lg:col-span-7 flex flex-col items-start">
            {/* Main Headline */}
            <h1
              className="v2-display font-display font-bold leading-[1.05] tracking-tight"
              style={{ marginBottom: '28px' }}
            >
              {/* Static part */}
              <span
                ref={headlineStaticRef}
                className="v2-text-primary block v2-hero-enter v2-hero-enter--headline"
              >
                Ideas that
              </span>

              {/* Rotating phrase */}
              <span
                ref={headlineRotatingRef}
                className="relative block overflow-hidden v2-hero-enter v2-hero-enter--rotating"
                style={{ height: '1.65em', lineHeight: 1.4 }}
              >
                <span
                  className={`
                    inline-block
                    transition-[opacity,transform] duration-500
                    ${isAnimating ? 'opacity-0 -translate-y-[110%]' : 'opacity-100 translate-y-0'}
                  `}
                  style={{
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    lineHeight: 1.4,
                    paddingBottom: '0.05em',
                  }}
                >
                  <span className="hero-stacked-text">
                    {rotatingPhrases[currentPhraseIndex]}
                  </span>
                </span>
              </span>
            </h1>

            {/* Subheadline */}
            <p
              ref={subheadRef}
              className="v2-text-secondary text-base md:text-lg lg:text-xl leading-relaxed max-w-full lg:max-w-lg v2-hero-enter v2-hero-enter--subhead"
              style={{ marginBottom: '40px' }}
            >
              Full-service creative marketing for ambitious brands.
              100+ brands grown. 300% average traffic lift. Strategy, design, and performance under one roof.
            </p>

            {/* CTA Buttons */}
            <div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 w-full sm:w-auto v2-hero-enter v2-hero-enter--cta"
            >
              <Link
                href="/get-started"
                className="v2-btn v2-btn-primary group"
              >
                Get a Free Strategy Call
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/work"
                className="v2-btn v2-btn-secondary"
              >
                See Our Results
              </Link>
            </div>
          </div>

          {/* Right Column — Brain Mascot (5 cols on desktop) */}
          {/* Entrance animation lives on this wrapper, not on the mascotRef node
              below — that node receives an inline `transform` from the mouse
              parallax effect, and a CSS animation with fill-mode:both would
              override it and freeze the parallax. */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end relative v2-hero-enter v2-hero-enter--mascot">
            <div
              ref={mascotRef}
              className="relative"
              style={{
                transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
            >
              {/* Glow behind mascot */}
              <div
                className="absolute inset-0 -z-10 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, rgba(201, 50, 93, 0.2) 0%, transparent 65%)',
                  transform: 'scale(1.5)',
                  filter: 'blur(25px)',
                }}
              />
              <Image
                src="/3dasset/brain-rocket.webp"
                alt="Launch Your Brand"
                width={420}
                height={420}
                priority
                // Rendered at min(420px, 80vw). Without `sizes` the browser
                // assumes 100vw and downloads the 1080px variant on mobile —
                // this was the LCP element and 80% of its time was transfer.
                sizes="(max-width: 640px) 80vw, 420px"
                quality={80}
                className="max-w-full"
                style={{
                  width: 'min(420px, 80vw)',
                  height: 'auto',
                  filter: 'drop-shadow(0 30px 60px rgba(140,25,60,0.3))',
                  animation: prefersReducedMotion ? 'none' : 'v2HeroFloat 6s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-16 md:bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 v2-hero-enter v2-hero-enter--scroll"
      >
        <span className="v2-text-muted text-[11px] uppercase tracking-[0.2em] font-medium">
          Scroll
        </span>
        <ChevronDown
          className="w-5 h-5 v2-text-tertiary"
          style={{
            animation: prefersReducedMotion ? 'none' : 'heroScrollBounce 2s ease-in-out infinite',
          }}
        />
      </div>

    </section>
  );
}
