'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Mail, Phone, MapPin, Sparkles, Zap, Heart } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MagneticButton } from '@/components/animations/Card3D';
import { GradientOrb, FloatingElement } from '@/components/animations/ParallaxLayer';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const quickFacts = [
  { icon: Zap, text: "Response within 24 hours" },
  { icon: Heart, text: "Clients love working with us" },
  { icon: Sparkles, text: "No obligations, just ideas" },
];

export function ContactSectionV2() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const contactBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // Content slide-in animation
      if (contentRef.current) {
        const badge = contentRef.current.querySelector('.contact-badge');
        const heading = contentRef.current.querySelector('h2');
        const subtitle = contentRef.current.querySelector('.subtitle');
        const ctaButtons = contentRef.current.querySelectorAll('.cta-btn');
        const quickFactItems = contentRef.current.querySelectorAll('.quick-fact');

        // Create a timeline for sequenced animations
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        });

        tl.from(badge, {
          x: -25,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
        })
        .from(heading, {
          x: -30,
          opacity: 0,
          duration: 0.45,
          ease: 'power2.out',
        }, '-=0.25')
        .from(subtitle, {
          x: -25,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
        }, '-=0.25')
        .from(ctaButtons, {
          y: 15,
          opacity: 0,
          duration: 0.35,
          stagger: 0.06,
          ease: 'power2.out',
        }, '-=0.2')
        .from(quickFactItems, {
          y: 15,
          opacity: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: 'power2.out',
        }, '-=0.15');
      }

      // Mascot + contact bar consolidated timeline
      if (mascotRef.current && contactBarRef.current) {
        const icons = contactBarRef.current.querySelectorAll('.contact-icon');

        const entranceTl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        // Mascot entrance
        entranceTl.from(mascotRef.current, {
          x: 30,
          opacity: 0,
          duration: 0.5,
          ease: 'power2.out',
        })
        // Contact bar slides up
        .from(contactBarRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
        }, '-=0.3')
        // Icons fade in
        .from(icons, {
          opacity: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: 'power2.out',
        }, '-=0.2');
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{
        overflowX: 'clip',
      }}
    >
      {/* Subtle top divider */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(201,50,93,0.15), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* Ambient Gradient Orbs — tuned for light bg */}
      <GradientOrb
        color="rgba(160, 30, 70, 0.22)"
        size={500}
        blur={20}
        position={{ top: '-200px', right: '-150px' }}
        drift={20}
      />
      <GradientOrb
        color="rgba(140, 25, 60, 0.18)"
        size={400}
        blur={18}
        position={{ bottom: '-100px', left: '-80px' }}
        drift={15}
      />

      {/* Content */}
      <div
        className="relative z-10 v2-section"
      >
        <div className="v2-container">
          <div className="grid md:grid-cols-2 gap-6 md:gap-10 lg:gap-12 items-center">
            {/* Left: Content */}
            <div ref={contentRef}>
              {/* Badge */}
              <div
                className="contact-badge v2-badge v2-badge-light"
                style={{ marginBottom: '32px' }}
              >
                <Sparkles className="w-4 h-4 text-fm-magenta-600" />
                <span>Ready to Grow Your Brand?</span>
              </div>

              {/* Main Headline */}
              <h2
                className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-fm-neutral-900 leading-tight"
                style={{ marginBottom: '24px' }}
              >
                Let&apos;s Build Your{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-fm-magenta-600">Next Chapter</span>
                  <span
                    className="absolute inset-0 -skew-y-2 rounded-lg"
                    style={{ background: 'rgba(201, 50, 93, 0.18)', zIndex: 0 }}
                  />
                </span>{' '}
                Together
              </h2>

              <p
                className="subtitle text-lg md:text-xl text-fm-neutral-600 leading-relaxed"
                style={{ marginBottom: '40px' }}
              >
                Whether you&apos;re launching a startup or scaling an enterprise,
                we&apos;re here to drive real, measurable growth. No pressure, just possibilities.
              </p>

              {/* CTAs — light background variants */}
              <div className="flex flex-col sm:flex-row gap-4" style={{ marginBottom: '40px' }}>
                <MagneticButton
                  as="a"
                  href="/get-started"
                  strength={0.3}
                  className="cta-btn v2-btn v2-btn-magenta group"
                >
                  Start Your Project
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </MagneticButton>

                <MagneticButton
                  as="a"
                  href="tel:+919833257659"
                  strength={0.25}
                  className="cta-btn v2-btn v2-btn-outline"
                >
                  <Phone className="w-5 h-5" />
                  Call Us Now
                </MagneticButton>
              </div>

              {/* Quick Facts */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6">
                {quickFacts.map((fact) => {
                  const Icon = fact.icon;
                  return (
                    <div key={fact.text} className="quick-fact flex items-center gap-2 text-fm-neutral-600">
                      <Icon className="w-4 h-4 text-fm-magenta-600" />
                      <span className="text-sm font-medium">{fact.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Large Mascot */}
            <div
              ref={mascotRef}
              className="relative flex items-center justify-center"
            >
              {/* Glow Effect Behind Mascot — magenta tint for light bg */}
              <div
                className="absolute w-[280px] h-[280px] md:w-[400px] md:h-[400px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(180,35,75,0.2) 0%, rgba(201,50,93,0.08) 50%, transparent 70%)',
                  filter: 'blur(25px)',
                }}
              />

              {/* Main Mascot */}
              <FloatingElement amplitude={15} duration={4}>
                <Image
                  src="/3dasset/brain-support.webp"
                  alt="We're Here to Help"
                  width={420}
                  height={420}
                  loading="lazy"
                  className="relative max-w-full"
                  style={{
                    width: 'min(420px, 60vw)',
                    height: 'auto',
                    filter: 'drop-shadow(0 25px 50px rgba(140,25,60,0.25))',
                  }}
                />
              </FloatingElement>
            </div>
          </div>

          {/* Contact Info Bar */}
          <div
            ref={contactBarRef}
            className="v2-paper rounded-2xl p-6"
            style={{ marginTop: '48px' }}
          >
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 text-center sm:text-left">
              {/* Email */}
              <div className="contact-item flex items-center justify-center md:justify-start gap-3 group">
                <div className="contact-icon w-10 h-10 rounded-full bg-fm-magenta-50 flex items-center justify-center transition-[transform,background-color] duration-300 group-hover:scale-110 group-hover:bg-fm-magenta-100">
                  <Mail className="w-5 h-5 text-fm-magenta-600" />
                </div>
                <div>
                  <div className="text-fm-neutral-400 text-xs uppercase tracking-wide">Email</div>
                  <a href="mailto:freakingmindsdigital@gmail.com" className="text-fm-neutral-900 font-medium hover:text-fm-magenta-600 transition-colors text-sm sm:text-base break-all sm:break-normal">
                    freakingmindsdigital@gmail.com
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="contact-item flex items-center justify-center md:justify-start gap-3 group">
                <div className="contact-icon w-10 h-10 rounded-full bg-fm-magenta-50 flex items-center justify-center transition-[transform,background-color] duration-300 group-hover:scale-110 group-hover:bg-fm-magenta-100">
                  <Phone className="w-5 h-5 text-fm-magenta-600" />
                </div>
                <div>
                  <div className="text-fm-neutral-400 text-xs uppercase tracking-wide">Phone</div>
                  <a href="tel:+919833257659" className="text-fm-neutral-900 font-medium hover:text-fm-magenta-600 transition-colors">
                    +91 98332 57659
                  </a>
                </div>
              </div>

              {/* Location */}
              <div className="contact-item flex items-center justify-center md:justify-start gap-3 group">
                <div className="contact-icon w-10 h-10 rounded-full bg-fm-magenta-50 flex items-center justify-center transition-[transform,background-color] duration-300 group-hover:scale-110 group-hover:bg-fm-magenta-100">
                  <MapPin className="w-5 h-5 text-fm-magenta-600" />
                </div>
                <div>
                  <div className="text-fm-neutral-400 text-xs uppercase tracking-wide">Location</div>
                  <span className="text-fm-neutral-900 font-medium">India & Worldwide</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
