'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const testimonials = [
  {
    quote: "Freaking Minds didn't just meet our expectations—they shattered them. Our organic traffic is up 300% and leads are pouring in.",
    author: "Rahul Sharma",
    role: "CEO",
    company: "TechStart India",
    metric: "+300%",
    metricLabel: "Traffic Growth",
    rating: 5,
  },
  {
    quote: "Finally, an agency that actually understands ROI. Every rupee we spend with FM comes back multiplied. Game-changing partnership.",
    author: "Priya Patel",
    role: "Marketing Head",
    company: "GrowthCo",
    metric: "5x",
    metricLabel: "ROAS",
    rating: 5,
  },
  {
    quote: "The creative team at FM is on another level. Our brand went from invisible to unforgettable in just 6 months.",
    author: "Amit Verma",
    role: "Founder",
    company: "BrandX",
    metric: "180%",
    metricLabel: "Brand Recall",
    rating: 5,
  },
  {
    quote: "We switched to Freaking Minds after two failed agencies. Within 90 days our cost per lead dropped by half and quality went through the roof.",
    author: "Sneha Kapoor",
    role: "Head of Growth",
    company: "FinEdge",
    metric: "-50%",
    metricLabel: "Cost Per Lead",
    rating: 5,
  },
  {
    quote: "Their social media strategy turned our sleepy Instagram into a lead machine. 10K genuine followers in three months—no bots, just real engagement.",
    author: "Vikram Desai",
    role: "Co-Founder",
    company: "Urban Flavor",
    metric: "10K+",
    metricLabel: "New Followers",
    rating: 5,
  },
  {
    quote: "FM redesigned our entire digital presence and the results speak for themselves. Website conversions doubled in the first quarter.",
    author: "Ananya Rao",
    role: "Director",
    company: "Zenith Interiors",
    metric: "2x",
    metricLabel: "Conversions",
    rating: 5,
  },
  {
    quote: "What sets FM apart is their strategic depth. They don't just execute—they think three steps ahead. Our launch campaign outperformed every projection.",
    author: "Karan Mehta",
    role: "CMO",
    company: "NovaByte",
    metric: "140%",
    metricLabel: "Above Target",
    rating: 5,
  },
  {
    quote: "From SEO to paid media to creative—FM handles everything seamlessly. It's like having an entire marketing department without the overhead.",
    author: "Deepa Joshi",
    role: "Founder",
    company: "Aura Wellness",
    metric: "45%",
    metricLabel: "Revenue Growth",
    rating: 5,
  },
];

export function TestimonialsSectionV3() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const sectionRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const goToSlide = useCallback((index: number, dir: 'left' | 'right') => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(dir);
    setActiveIndex(index);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating]);

  const nextSlide = useCallback(() => {
    const nextIndex = (activeIndex + 1) % testimonials.length;
    goToSlide(nextIndex, 'right');
  }, [activeIndex, goToSlide]);

  const prevSlide = useCallback(() => {
    const prevIndex = (activeIndex - 1 + testimonials.length) % testimonials.length;
    goToSlide(prevIndex, 'left');
  }, [activeIndex, goToSlide]);

  // Auto-rotate
  useEffect(() => {
    intervalRef.current = setInterval(nextSlide, 7000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [nextSlide]);

  const activeTestimonial = testimonials[activeIndex];

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden v2-section v2-tone-paper v2-section--tight-top"
    >
      {/* Subtle background accent */}
      <div
        className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 80% 20%, #8c1d4a 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        {/* Section Header */}
        <div
          className={`
            flex items-center gap-4 mb-16
            transition-all duration-700
            ${isVisible ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <div
            className={`
              h-px bg-fm-magenta-600 transition-all duration-700
              ${isVisible ? 'w-12' : 'w-0'}
            `}
            style={{ transitionDelay: '200ms' }}
          />
          <p className="text-fm-magenta-600 text-sm font-semibold tracking-[0.2em] uppercase">
            Client Stories
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left: Metric Card */}
          <div
            className={`
              lg:col-span-4 lg:sticky lg:top-32
              transition-all duration-700 delay-200
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
          >
            <div className="relative bg-fm-ink rounded-3xl p-8 lg:p-10 overflow-hidden">
              {/* Grain texture */}
              <div
                className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />

              {/* Accent gradient */}
              <div
                className="absolute bottom-0 left-0 w-full h-1/2 opacity-20 pointer-events-none"
                style={{
                  background: 'linear-gradient(to top, #8c1d4a, transparent)',
                }}
              />

              <div className="relative z-10">
                {/* Metric */}
                <div
                  key={`metric-${activeIndex}`}
                  className={`
                    transition-all duration-500
                    ${isAnimating
                      ? direction === 'right' ? 'opacity-0 -translate-x-4' : 'opacity-0 translate-x-4'
                      : 'opacity-100 translate-x-0'
                    }
                  `}
                >
                  <span
                    className="text-6xl lg:text-7xl font-bold text-white block leading-none"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {activeTestimonial.metric}
                  </span>
                  <span className="text-white/60 text-sm mt-3 block font-medium uppercase tracking-wider">
                    {activeTestimonial.metricLabel}
                  </span>
                </div>

                {/* Rating */}
                <div className="flex gap-1 mt-8">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${i < activeTestimonial.rating ? 'text-fm-magenta-400 fill-fm-magenta-400' : 'text-white/20'}`}
                    />
                  ))}
                </div>

                {/* Slide indicators */}
                <div className="flex gap-2 mt-8">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index, index > activeIndex ? 'right' : 'left')}
                      className={`
                        h-1 rounded-full transition-all duration-300
                        ${index === activeIndex
                          ? 'bg-fm-magenta-500 w-8'
                          : 'bg-white/20 w-4 hover:bg-white/40'
                        }
                      `}
                      aria-label={`Go to testimonial ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quote */}
          <div className="lg:col-span-8">
            <div
              className={`
                transition-all duration-700 delay-300
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
            >
              {/* Quote with animation */}
              <div className="relative min-h-[280px] lg:min-h-[320px]">
                <blockquote
                  key={`quote-${activeIndex}`}
                  className={`
                    text-2xl md:text-3xl lg:text-4xl xl:text-[2.75rem] font-medium text-fm-ink leading-snug
                    transition-all duration-500
                    ${isAnimating
                      ? direction === 'right' ? 'opacity-0 translate-x-8' : 'opacity-0 -translate-x-8'
                      : 'opacity-100 translate-x-0'
                    }
                  `}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  "{activeTestimonial.quote}"
                </blockquote>
              </div>

              {/* Author info */}
              <div
                key={`author-${activeIndex}`}
                className={`
                  flex items-center gap-5 mt-10 pt-8 border-t border-fm-neutral-200
                  transition-all duration-500 delay-100
                  ${isAnimating
                    ? direction === 'right' ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4'
                    : 'opacity-100 translate-x-0'
                  }
                `}
              >
                {/* Avatar placeholder with initials */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-fm-magenta-500 to-fm-magenta-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">
                    {activeTestimonial.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-fm-ink text-lg">{activeTestimonial.author}</p>
                  <p className="text-fm-neutral-600">
                    {activeTestimonial.role}, <span className="text-fm-magenta-600 font-medium">{activeTestimonial.company}</span>
                  </p>
                </div>
              </div>

              {/* Navigation arrows */}
              <div className="flex gap-3 mt-10">
                <button
                  onClick={prevSlide}
                  disabled={isAnimating}
                  className="w-12 h-12 rounded-full border-2 border-fm-neutral-200 flex items-center justify-center hover:border-fm-ink hover:bg-fm-ink hover:text-white transition-all duration-300 disabled:opacity-50"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  disabled={isAnimating}
                  className="w-12 h-12 rounded-full border-2 border-fm-neutral-200 flex items-center justify-center hover:border-fm-ink hover:bg-fm-ink hover:text-white transition-all duration-300 disabled:opacity-50"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
