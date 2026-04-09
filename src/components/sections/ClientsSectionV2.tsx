'use client';

import React, { useEffect, useRef } from 'react';
import { Star, ArrowRight, Handshake, BarChart3, Lightbulb } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MagneticButton } from '@/components/animations/Card3D';
import { GradientOrb } from '@/components/animations/ParallaxLayer';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Client logos from the migrated assets
const clientLogos = [
  'Asset-5.png', 'Asset-6.png', 'Asset-7.png', 'Asset-8.png', 'Asset-9.png',
  'Asset-10.png', 'Asset-11.png', 'Asset-12.png', 'Asset-13.png', 'Asset-14.png',
  'Asset-15.png', 'Asset-16.png', 'Asset-17.png', 'Asset-18.png', 'Asset-19.png',
  'Asset-20.png', 'Asset-21.png', 'Asset-22.png', 'Asset-23.png', 'Asset-24.png',
  'Asset-25.png', 'Asset-26.png', 'Asset-27.png', 'Asset-28.png', 'Asset-29.png',
  'Asset-30.png', 'Asset-31.png', 'Asset-32.png', 'Asset-33.png', 'Asset-34.png',
  'Asset-35.png', 'Asset-36.png', 'Asset-37.png', 'Asset-38.png', 'Asset-39.png',
  'Asset-40.png',
];

const stats = [
  { icon: Handshake, label: 'Trusted Partnerships' },
  { icon: Star, label: 'Top-Rated Service' },
  { icon: BarChart3, label: 'Measurable Growth' },
  { icon: Lightbulb, label: 'Strategic Approach' },
];

export function ClientsSectionV2() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // Header animation with split text feel
      if (headerRef.current) {
        const targets = [
          headerRef.current.querySelector('.clients-badge'),
          headerRef.current.querySelector('h2'),
          headerRef.current.querySelector('p'),
        ].filter(Boolean);

        if (targets.length > 0) {
          gsap.from(targets, {
            y: 25,
            opacity: 0,
            duration: 0.45,
            stagger: 0.06,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: headerRef.current,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          });
        }
      }

      // Stats cards
      if (statsRef.current) {
        const statCards = statsRef.current.querySelectorAll('.stat-card');

        if (statCards.length > 0) {
          gsap.from(statCards, {
            y: 25,
            opacity: 0,
            duration: 0.4,
            stagger: 0.06,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: statsRef.current,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          });
        }

        // Animate stat numbers with counting effect
        const statNumbers = statsRef.current.querySelectorAll('.stat-number');
        statNumbers.forEach((num) => {
          gsap.from(num, {
            textContent: '0',
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: statsRef.current,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          });
        });
      }

      // Marquee entrance
      if (marqueeRef.current) {
        gsap.from(marqueeRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: marqueeRef.current,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
      }

      // CTA animation
      if (ctaRef.current) {
        gsap.from(ctaRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
      }

      // Mascot entrance
      if (mascotRef.current) {
        gsap.from(mascotRef.current, {
          y: 30,
          opacity: 0,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'bottom 75%',
            toggleActions: 'play none none none',
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-visible z-20"
    >
      {/* Ambient Gradient Orbs — reduced blur for scroll perf */}
      <GradientOrb
        color="rgba(201, 50, 93, 0.15)"
        size={500}
        blur={20}
        position={{ top: '-200px', right: '-200px' }}
        drift={20}
      />
      <GradientOrb
        color="rgba(160, 30, 70, 0.12)"
        size={400}
        blur={18}
        position={{ bottom: '-100px', left: '-150px' }}
        drift={15}
      />

      {/* Content */}
      <div
        className="relative z-10 v2-section"
      >
        <div className="v2-container">
          {/* Section Header */}
          <div ref={headerRef} className="max-w-3xl mx-auto mb-16" style={{ textAlign: 'center' }}>
            <div className="clients-badge v2-badge v2-badge-glass mb-6">
              <Star className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">
                Trusted by Industry Leaders
              </span>
            </div>

            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-6 leading-tight">
              Trusted by 100+ Brands{' '}
              <span className="v2-accent">Worldwide</span>
            </h2>

            <p className="text-lg md:text-xl v2-text-secondary leading-relaxed">
              From ambitious startups to global enterprises, we help brands
              achieve extraordinary results.
            </p>
          </div>

          {/* Stats Row */}
          <div ref={statsRef} className="mb-16 max-w-3xl mx-auto">
            <div className="rounded-2xl p-4 md:p-5" style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(201, 50, 93, 0.1)' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="flex flex-col items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,50,93,0.15)' }}>
                        <Icon className="w-4 h-4 text-fm-magenta-400" />
                      </div>
                      <span className="v2-text-secondary text-xs font-medium">{stat.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Logo Marquee */}
          <div ref={marqueeRef} className="mb-20">
            {/* First row - scrolls left */}
            <div className="logo-marquee-container mb-4">
              <div className="logo-marquee-track">
                {[...clientLogos, ...clientLogos].map((logo, index) => (
                  <div
                    key={`row1-${index}`}
                    className="logo-marquee-item"
                  >
                    <img
                      src={`/clients/${logo}`}
                      alt=""
                      role="presentation"
                      aria-hidden="true"
                      loading="lazy"
                      width={140}
                      height={80}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      className="hover:opacity-100 transition-[opacity,transform] duration-300 hover:scale-110"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Second row - scrolls right (reverse) */}
            <div className="logo-marquee-container">
              <div className="logo-marquee-track-reverse">
                {[...clientLogos.slice().reverse(), ...clientLogos.slice().reverse()].map((logo, index) => (
                  <div
                    key={`row2-${index}`}
                    className="logo-marquee-item"
                  >
                    <img
                      src={`/clients/${logo}`}
                      alt=""
                      role="presentation"
                      aria-hidden="true"
                      loading="lazy"
                      width={140}
                      height={80}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      className="hover:opacity-100 transition-[opacity,transform] duration-300 hover:scale-110"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div ref={ctaRef} className="mt-16" style={{ textAlign: 'center' }}>
            <MagneticButton
              as="a"
              href="/work"
              strength={0.3}
              className="v2-btn v2-btn-primary group"
            >
              View Our Work
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* Bridging Character */}
      <div
        ref={mascotRef}
        className="absolute left-[10%] z-30 hidden lg:block"
        style={{ bottom: '-120px' }}
      >
        <img
          src="/3dasset/brain-creative.png"
          alt="FreakingMinds brain mascot"
          loading="lazy"
          className="animate-v2-clients-float"
          style={{
            width: 'min(288px, 45vw)',
            height: 'auto',
            filter: 'drop-shadow(0 30px 60px rgba(140,25,60,0.25))',
          }}
        />
      </div>
    </section>
  );
}
