'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

// Video portfolio from migrated assets
const videos = [
  { src: '/videos/bhopal_manthan.mp4', client: 'Bhopal Manthan', category: 'Brand Video' },
  { src: '/videos/skr_group.mp4', client: 'SKR Group', category: 'Corporate' },
  { src: '/videos/astroo_apaar.mp4', client: 'Astroo Apaar', category: 'Promotional' },
  { src: '/videos/renny.mp4', client: 'Renny', category: 'Social Media' },
  { src: '/videos/adi.mp4', client: 'ADI', category: 'Brand Video' },
  { src: '/videos/concept_studio.mp4', client: 'Concept Studio', category: 'Creative' },
  { src: '/videos/kanha.mp4', client: 'Kanha', category: 'Promotional' },
  { src: '/videos/giovanni.mp4', client: 'Giovanni', category: 'Brand Video' },
];

export function VideoPortfolioSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);

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
    <section ref={sectionRef} className="relative v2-tone-deep overflow-hidden" style={{ paddingTop: 'var(--v2-section-padding)', paddingBottom: 'var(--v2-section-padding)' }}>
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-fm-magenta-900/20 to-fm-neutral-900/40" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 relative z-10">
        {/* Section header */}
        <div
          className={`mb-12 lg:mb-16 transition-[opacity,transform] duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ textAlign: 'center' }}
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-fm-magenta-300 mb-4">
            <span className="w-8 h-[2px] bg-fm-magenta-300" />
            Video Production
            <span className="w-8 h-[2px] bg-fm-magenta-300" />
          </span>

          <h2
            className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-[1.2] tracking-[-0.02em] text-white mb-4"
            style={{ fontFamily: 'var(--font-display)', textAlign: 'center' }}
          >
            Our Video Portfolio
          </h2>

          <p className="text-fm-neutral-400 max-w-2xl mx-auto" style={{ textAlign: 'center' }}>
            From brand stories to social media content, we create compelling video content that captures attention and drives engagement.
          </p>
        </div>

        {/* Video grid */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 transition-[opacity,transform] duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          {videos.map((video, index) => (
            <div
              key={video.src}
              className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-fm-neutral-800 cursor-pointer"
              style={{ transitionDelay: `${index * 50}ms` }}
              onClick={() => setPlayingVideo(playingVideo === index ? null : index)}
            >
              {playingVideo === index ? (
                <video
                  src={video.src}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <>
                  {/* Video thumbnail - show first frame */}
                  <video
                    src={video.src}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-fm-neutral-900/90 via-fm-neutral-900/30 to-transparent group-hover:from-fm-magenta-900/90 transition-[background] duration-300" />

                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-[background-color,transform] duration-300">
                      <Play className="w-7 h-7 text-white ml-1" fill="white" />
                    </div>
                  </div>

                  {/* Client info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="text-xs font-medium text-fm-magenta-300 block mb-1">{video.category}</span>
                    <h3 className="text-white font-semibold">{video.client}</h3>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
