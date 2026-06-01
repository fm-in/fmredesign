'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Sparkles, Palette, TrendingUp, Code, Globe } from 'lucide-react';

export function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const services = [
    {
      icon: Palette,
      title: 'Brand Strategy',
      desc: 'Define your unique position in the market.',
      color: 'bg-fm-magenta-100',
      iconColor: 'text-fm-magenta-600',
    },
    {
      icon: TrendingUp,
      title: 'Digital Marketing',
      desc: 'Data-driven campaigns that convert.',
      color: 'bg-fm-magenta-50',
      iconColor: 'text-fm-magenta-500',
    },
    {
      icon: Code,
      title: 'Web Development',
      desc: 'Beautiful, fast, converting websites.',
      color: 'bg-fm-magenta-100',
      iconColor: 'text-fm-magenta-600',
    },
    {
      icon: Globe,
      title: 'Social Media',
      desc: 'Build community and engagement.',
      color: 'bg-fm-neutral-100',
      iconColor: 'text-fm-neutral-700',
    },
  ];

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#FAFAFA] pt-28 md:pt-32 pb-12 md:pb-16">
      {/* Animated gradient mesh background */}
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at ${20 + mousePos.x * 20}% ${30 + mousePos.y * 20}%, rgba(168, 37, 72, 0.14) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at ${70 - mousePos.x * 15}% ${60 - mousePos.y * 15}%, rgba(236, 117, 160, 0.10) 0%, transparent 50%),
            radial-gradient(ellipse 40% 40% at ${50 + mousePos.x * 10}% ${80 - mousePos.y * 10}%, rgba(168, 37, 72, 0.06) 0%, transparent 50%)
          `,
          transition: 'background 0.3s ease-out',
        }}
      />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="heroGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#a82548" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#heroGrid)" />
        </svg>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10">
        {/* Bento Grid */}
        <div className={`grid grid-cols-12 gap-4 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* Hero Card - Large */}
          <div className="col-span-12 lg:col-span-8 bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/50 shadow-xl min-h-[420px] flex flex-col justify-between">
            <div>
              {/* Badge */}
              <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-2 rounded-full bg-fm-magenta-500 animate-pulse" />
                <span
                  className="text-sm font-medium"
                  style={{
                    background: 'linear-gradient(135deg, #a82548 0%, #ec75a0 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Digital Marketing Agency
                </span>
              </div>

              {/* Headline with animated gradient */}
              <h1
                className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.03em]"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, #18181b 0%, #a82548 50%, #ec75a0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  backgroundSize: '200% 200%',
                  animation: 'gradientMove 8s ease infinite',
                }}
              >
                Ideas that
                <br />
                move markets.
              </h1>

              {/* Subheadline */}
              <p className="mt-6 text-fm-neutral-600 text-lg leading-relaxed max-w-xl">
                Strategic creativity that transforms ambitious brands into market leaders.
                Data-informed. Design-led. Results-driven.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link
                href="/get-started"
                className="group px-7 py-3.5 text-sm font-medium rounded-full transition-all hover:scale-105 flex items-center gap-2 shadow-lg shadow-fm-magenta-200/50"
                style={{ background: 'linear-gradient(135deg, #a82548 0%, #7c1d3e 100%)', color: '#ffffff' }}
              >
                Start a Project
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/work"
                className="px-7 py-3.5 border border-fm-neutral-300 text-fm-neutral-700 text-sm font-medium rounded-full hover:border-fm-magenta-300 hover:text-fm-magenta-600 hover:bg-fm-magenta-50 transition-all"
              >
                View Our Work
              </Link>
            </div>
          </div>

          {/* Stats Card */}
          <div className="col-span-12 lg:col-span-4 bg-fm-neutral-900 rounded-3xl p-8 text-white flex flex-col justify-between min-h-[420px]">
            <div>
              <span className="text-fm-neutral-400 text-xs uppercase tracking-widest">Our Impact</span>
              <div
                className="text-[4rem] md:text-[5rem] font-bold leading-none mt-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, #ec75a0 0%, #ffffff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                250+
              </div>
              <p className="text-fm-neutral-400 mt-2">Projects delivered with excellence</p>
            </div>

            {/* Brain mascot - Meditating zen brain (3D) */}
            <div className="flex justify-center my-6">
              <img
                src="/3dasset/medibrain.webp"
                alt="Freaking Minds - Thoughtful Strategy"
                loading="lazy"
                className="w-44 h-auto hover:scale-110 transition-transform duration-500 drop-shadow-lg rounded-2xl brain-animate-float"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>95%</div>
                <div className="text-fm-neutral-500 text-xs mt-1">Client Retention</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>10+</div>
                <div className="text-fm-neutral-500 text-xs mt-1">Years Experience</div>
              </div>
            </div>
          </div>

          {/* Service Cards Row */}
          {services.map((service, index) => (
            <div
              key={service.title}
              className={`col-span-12 md:col-span-6 lg:col-span-3 bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg group hover:border-fm-magenta-300 hover:shadow-xl hover:shadow-fm-magenta-100/50 transition-all duration-300 cursor-pointer ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
            >
              <div className={`w-12 h-12 ${service.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <service.icon className={`w-6 h-6 ${service.iconColor}`} />
              </div>
              <h3 className="text-fm-neutral-900 font-semibold text-lg mb-2 group-hover:text-fm-magenta-700 transition-colors">
                {service.title}
              </h3>
              <p className="text-fm-neutral-500 text-sm">{service.desc}</p>
              <ArrowUpRight className="w-5 h-5 text-fm-neutral-300 group-hover:text-fm-magenta-600 mt-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          ))}

          {/* Bottom CTA Bar */}
          <div
            className={`col-span-12 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-1000 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{
              transitionDelay: '600ms',
              background: 'linear-gradient(135deg, #a82548 0%, #7c1d3e 50%, #a82548 100%)',
            }}
          >
            <div className="text-center md:text-left">
              <h3 className="text-xl md:text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#ffffff' }}>
                Ready to transform your brand?
              </h3>
              <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Let's create something extraordinary together.</p>
            </div>
            <Link
              href="/get-started"
              className="group px-8 py-4 bg-white text-sm font-semibold rounded-full hover:bg-fm-neutral-100 transition-all flex items-center gap-2 shadow-lg"
              style={{ color: '#a82548' }}
            >
              Get Started Today
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </section>
  );
}
