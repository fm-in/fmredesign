'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Target, TrendingUp, Palette, Globe, Lightbulb, BarChart3, PenTool, Smartphone } from 'lucide-react';

const services = [
  {
    number: '01',
    title: 'Brand Strategy',
    description: 'Defining your market position with precision. We develop comprehensive brand strategies that create meaningful differentiation and lasting connections.',
    capabilities: ['Market Research', 'Brand Architecture', 'Positioning', 'Verbal Identity'],
    icon: Lightbulb,
    color: 'from-fm-magenta-500 to-fm-magenta-700',
  },
  {
    number: '02',
    title: 'Performance Marketing',
    description: 'Data-driven campaigns that deliver measurable growth. Every decision backed by insights, every rupee accountable to results.',
    capabilities: ['Paid Media', 'SEO & SEM', 'Analytics', 'Conversion Optimization'],
    icon: TrendingUp,
    color: 'from-fm-magenta-600 to-fm-magenta-800',
  },
  {
    number: '03',
    title: 'Creative & Content',
    description: 'Compelling narratives brought to life through exceptional design. From campaign concepts to content ecosystems that engage and convert.',
    capabilities: ['Campaign Creative', 'Content Strategy', 'Video Production', 'Social Media'],
    icon: PenTool,
    color: 'from-fm-magenta-400 to-fm-magenta-600',
  },
  {
    number: '04',
    title: 'Digital Experience',
    description: 'Seamless digital touchpoints that elevate your brand. Websites, apps, and platforms designed for impact and built for scale.',
    capabilities: ['Web Design', 'UX Strategy', 'Development', 'E-commerce'],
    icon: Globe,
    color: 'from-fm-magenta-500 to-fm-magenta-900',
  },
];

export function ServicesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = entry.target.getAttribute('data-index');
            if (index === 'header') {
              setHeaderVisible(true);
            } else {
              setVisibleItems((prev) => [...new Set([...prev, parseInt(index || '0')])]);
            }
          }
        });
      },
      { threshold: 0.2, rootMargin: '-50px' }
    );

    const items = sectionRef.current?.querySelectorAll('[data-index]');
    items?.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-white py-24 lg:py-32 overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="servicesGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="#a82548" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#servicesGrid)" />
        </svg>
      </div>

      {/* Decorative gradient blob */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            background: 'radial-gradient(circle at top right, #a82548 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Section container */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 relative z-10">

        {/* Section header */}
        <div
          data-index="header"
          className={`relative max-w-3xl mb-16 lg:mb-20 transition-all duration-1000 ease-out ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Brain mascot - floating decoration (3D) */}
          <div className="absolute -right-4 md:right-0 lg:right-[-140px] top-0 hidden md:block">
            <img
              src="/3dasset/happy-brain.webp"
              alt="Freaking Minds Mascot"
              loading="lazy"
              className="w-36 lg:w-48 h-auto hover:scale-110 transition-transform duration-500 brain-animate-float-glow"
              style={{ '--brain-rotate': '8deg', mixBlendMode: 'multiply' } as React.CSSProperties}
            />
          </div>

          <span className="inline-flex items-center gap-2 text-sm font-semibold text-fm-magenta-600 mb-4">
            <span className="w-8 h-[2px] bg-fm-magenta-600" />
            What We Do
          </span>

          <h2
            className="text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-fm-neutral-900 mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Full-service capabilities,{' '}
            <span className="text-fm-magenta-600">singular</span> focus.
          </h2>

          <p className="text-lg text-fm-neutral-600 leading-relaxed max-w-2xl">
            We bring together strategy, creativity, and technology to solve complex brand challenges.
            Every engagement is tailored to your unique business objectives.
          </p>
        </div>

        {/* Services grid - card layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div
                key={service.number}
                data-index={index}
                className={`group transition-all duration-700 ease-out ${
                  visibleItems.includes(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <Link href={`/services#${service.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="relative bg-fm-neutral-50 rounded-2xl p-8 lg:p-10 h-full border border-fm-neutral-100 hover:border-fm-magenta-200 hover:shadow-xl hover:shadow-fm-magenta-100/50 transition-all duration-500 overflow-hidden">
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                    {/* Top row - number and icon */}
                    <div className="flex items-start justify-between mb-6 relative z-10">
                      <span
                        className="text-5xl lg:text-6xl font-bold text-fm-neutral-100 group-hover:text-fm-magenta-100 transition-colors duration-500"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {service.number}
                      </span>
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      <h3
                        className="text-2xl font-bold text-fm-neutral-900 mb-3 group-hover:text-fm-magenta-700 transition-colors duration-300"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {service.title}
                      </h3>

                      <p className="text-fm-neutral-600 leading-relaxed mb-6">
                        {service.description}
                      </p>

                      {/* Capabilities */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {service.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="text-xs font-medium text-fm-neutral-500 bg-white px-3 py-1.5 rounded-full border border-fm-neutral-200 group-hover:border-fm-magenta-200 group-hover:text-fm-magenta-600 transition-all duration-300"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>

                      {/* Arrow CTA */}
                      <div className="flex items-center gap-2 text-sm font-semibold text-fm-magenta-600">
                        <span>Learn more</span>
                        <ArrowUpRight className="w-4 h-4 transform transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className={`mt-16 text-center transition-all duration-700 ${
            visibleItems.length >= services.length ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          <Link
            href="/services"
            className="v2-btn v2-btn-magenta group"
          >
            <span>Explore All Services</span>
            <ArrowUpRight className="w-4 h-4 transform transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
