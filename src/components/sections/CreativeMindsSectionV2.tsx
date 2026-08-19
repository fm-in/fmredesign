'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Palette, Code, Video, PenTool, Camera, Megaphone, Sparkles, Check } from 'lucide-react';

const creativeCategories = [
  {
    name: 'Brand Designers', icon: Palette, description: 'Visual identity & branding experts',
    gradient: 'v2-gradient-brand', area: 'brand',
    wash: '224, 77, 125',    // pink-magenta
  },
  {
    name: 'Developers', icon: Code, description: 'Web & app development',
    gradient: 'v2-gradient-deep', area: 'dev',
    wash: '120, 50, 140',    // purple
  },
  {
    name: 'Video Editors', icon: Video, description: 'Motion graphics & reels',
    gradient: 'v2-gradient-content', area: 'video',
    wash: '255, 150, 100',   // warm orange
  },
  {
    name: 'Illustrators', icon: PenTool, description: 'Custom illustrations & art',
    gradient: 'v2-gradient-seo', area: 'illust',
    wash: '255, 127, 80',    // coral
  },
  {
    name: 'Photographers', icon: Camera, description: 'Product & event photography',
    gradient: 'v2-gradient-social', area: 'photo',
    wash: '236, 117, 160',   // soft pink
  },
  {
    name: 'Marketers', icon: Megaphone, description: 'Strategy & campaigns',
    gradient: 'v2-gradient-performance', area: 'market',
    wash: '168, 37, 72',     // deep crimson
  },
];

export function CreativeMindsSectionV2() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative v2-section v2-tone-tint overflow-hidden"
    >
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none" style={{ contain: 'layout style paint' }}>
        <div
          className="absolute -left-1/4 top-1/4 w-[500px] h-[500px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(201, 50, 93, 0.12) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }}
        />
        <div
          className="absolute -right-1/4 bottom-1/4 w-[350px] h-[350px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(160, 30, 70, 0.08) 0%, transparent 70%)',
            filter: 'blur(25px)',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column - Content */}
          <div
            className={`transition-[opacity,transform] duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <div className="v2-badge v2-badge-glass mb-8">
              <Sparkles className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">CreativeMinds Network</span>
            </div>

            <h2 className="v2-h2 font-display font-bold v2-text-primary mb-6 leading-[1.1]">
              Your projects,{' '}
              <span className="v2-accent">powered by experts</span>
            </h2>

            <p className="text-lg md:text-xl v2-text-secondary mb-10 leading-relaxed max-w-xl">
              Every Freaking Minds project is backed by our curated network of verified creative professionals.
              Vetted talent, ready to execute.
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-3 mb-10">
              {['Verified Profiles', 'Quality Assured', 'Fast Matching'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm v2-text-secondary">
                  <Check className="w-4 h-4 text-fm-magenta-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <Link href="/creativeminds" className="v2-btn v2-btn-primary">
                Explore Network
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/creativeminds" className="v2-btn v2-btn-secondary">
                Join as Creative
              </Link>
            </div>
          </div>

          {/* Right column - Bento Grid */}
          <div
            className={`relative transition-[opacity,transform] duration-500 delay-100 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            {/* Mobile: 2-col grid */}
            <div className="grid grid-cols-2 gap-3 lg:hidden">
              {creativeCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Link
                    key={category.name}
                    href="/creativeminds"
                    className="group relative rounded-2xl p-5 overflow-hidden transition-[opacity,transform] duration-300"
                    style={{
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
                      transitionDelay: `${index * 40 + 100}ms`,
                      background: `linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(245,243,248,0.92) 100%)`,
                      border: '1px solid rgba(201, 50, 93, 0.08)',
                    }}
                  >
                    {/* Top gradient accent line */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-[3px] ${category.gradient} opacity-70`}
                    />
                    <div className={`w-10 h-10 rounded-xl ${category.gradient} flex items-center justify-center shadow-lg mb-3`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-fm-neutral-900 font-semibold text-sm mb-0.5">{category.name}</h3>
                    <p className="text-fm-neutral-500 text-xs">{category.description}</p>
                  </Link>
                );
              })}
            </div>

            {/* Desktop: Bento grid with named areas */}
            <div
              className="hidden lg:grid gap-3"
              style={{
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: '140px 140px 140px',
                gridTemplateAreas: `
                  "brand brand dev"
                  "video illust dev"
                  "photo photo market"
                `,
              }}
            >
              {creativeCategories.map((category, index) => {
                const Icon = category.icon;
                const isLarge = category.area === 'brand' || category.area === 'photo' || category.area === 'dev';

                return (
                  <Link
                    key={category.name}
                    href="/creativeminds"
                    className="group relative rounded-2xl overflow-hidden transition-[opacity,transform] duration-300 hover:scale-[1.02]"
                    style={{
                      gridArea: category.area,
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
                      transitionDelay: `${index * 50 + 100}ms`,
                      background: `linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(245,243,248,0.92) 100%)`,
                      border: '1px solid rgba(201, 50, 93, 0.08)',
                    }}
                  >
                    {/* Top gradient accent line */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-[3px] ${category.gradient} opacity-70 group-hover:opacity-100 transition-opacity duration-500`}
                    />

                    {/* Content */}
                    <div className="relative h-full p-5 flex flex-col justify-between">
                      <div className={`${isLarge ? 'w-12 h-12' : 'w-10 h-10'} rounded-xl ${category.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className={`${isLarge ? 'w-6 h-6' : 'w-5 h-5'} text-white`} />
                      </div>

                      <div>
                        <h3 className={`text-fm-neutral-900 font-semibold ${isLarge ? 'text-base' : 'text-sm'} mb-0.5 group-hover:text-fm-magenta-700 transition-colors`}>
                          {category.name}
                        </h3>
                        {isLarge && (
                          <p className="text-fm-neutral-500 text-xs leading-relaxed">{category.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Hover arrow */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-300 translate-x-1 group-hover:translate-x-0">
                      <ArrowRight className="w-4 h-4 text-fm-neutral-400" />
                    </div>

                    {/* Hover shadow */}
                    <div
                      className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        boxShadow: '0 8px 30px rgba(201, 50, 93, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
                      }}
                    />
                  </Link>
                );
              })}
            </div>

            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none" style={{ border: '1px solid rgba(201, 50, 93, 0.08)' }} />
            <div className="absolute -bottom-5 -left-5 w-20 h-20 rounded-full pointer-events-none" style={{ border: '1px solid rgba(201, 50, 93, 0.08)' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
