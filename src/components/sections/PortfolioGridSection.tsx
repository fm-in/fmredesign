'use client';

import React, { useState, useEffect, useRef } from 'react';

// Real portfolio work organized by client
const portfolioItems = {
  graphicDesign: [
    { src: '/work/services/harsh-service1.jpg', client: 'Harsh Traders', category: 'Social Media' },
    { src: '/work/services/elisa-service1.jpg', client: 'Elisa India', category: 'Social Media' },
    { src: '/work/services/giovanni-service1.jpg', client: 'Giovanni', category: 'Social Media' },
    { src: '/work/services/skr-service1.jpg', client: 'SKR Group', category: 'Corporate' },
    { src: '/work/services/harsh-service2.jpg', client: 'Harsh Traders', category: 'Social Media' },
    { src: '/work/services/elisa-service2.jpg', client: 'Elisa India', category: 'Social Media' },
    { src: '/work/services/giovanni-service2.jpg', client: 'Giovanni', category: 'Social Media' },
    { src: '/work/services/skr-service2.jpg', client: 'SKR Group', category: 'Corporate' },
    { src: '/work/services/harsh-service3.jpg', client: 'Harsh Traders', category: 'Social Media' },
    { src: '/work/services/elisa-service3.jpg', client: 'Elisa India', category: 'Social Media' },
    { src: '/work/services/giovanni-service3.jpg', client: 'Giovanni', category: 'Social Media' },
    { src: '/work/services/skr-service3.jpg', client: 'SKR Group', category: 'Corporate' },
  ],
  logos: [
    { src: '/work/logos/1.jpg', client: 'Client 1', category: 'Logo Design' },
    { src: '/work/logos/2.jpg', client: 'Client 2', category: 'Logo Design' },
    { src: '/work/logos/3.jpg', client: 'Client 3', category: 'Logo Design' },
    { src: '/work/logos/4.jpg', client: 'Client 4', category: 'Logo Design' },
    { src: '/work/logos/5.jpg', client: 'Client 5', category: 'Logo Design' },
    { src: '/work/logos/6.jpg', client: 'Client 6', category: 'Logo Design' },
    { src: '/work/logos/7.jpg', client: 'Client 7', category: 'Logo Design' },
  ],
  websites: [
    { src: '/work/websites/restronaut_website.png', client: 'Restronaut', url: 'https://restronaut.in', category: 'SaaS' },
    { src: '/work/websites/trailsofteak_website.png', client: 'Trails of Teak', url: 'https://trailsofteak.com', category: 'Hospitality' },
    { src: '/work/websites/elisa_website.png', client: 'Elisa India', url: 'https://elisaindia.com', category: 'E-commerce' },
    { src: '/work/websites/playpal_website.png', client: 'PlayPal', url: 'https://playpal.freakingminds.in', category: 'Marketplace' },
    { src: '/work/websites/jigoworld_website.png', client: 'JIGO World', url: 'https://jigoworld.com', category: 'Manufacturing' },
    { src: '/work/websites/supertripindia_website.png', client: 'SuperTrip India', url: 'https://supertripindia.com', category: 'Travel' },
    { src: '/work/websites/sorathelabel_website.png', client: 'Sora The Label', url: 'https://sorathelabel.com', category: 'Shopify Store' },
    { src: '/work/websites/raginiiuplopwar_website.png', client: 'Raginii Uplopwar', url: 'https://raginiiuplopwar.com', category: 'Personal Brand' },
    { src: '/work/websites/khuttal_website.jpg', client: 'Khuttal', url: 'https://khuttal.com', category: 'Restaurant' },
    { src: '/work/websites/skr_group_website.jpg', client: 'SKR Group', url: 'https://skrgroup.co.in', category: 'Corporate' },
    { src: '/work/websites/badastoor_website.jpg', client: 'Badastoor', url: 'https://badastoor.in', category: 'Fashion' },
    { src: '/work/websites/mahua_house_website.jpg', client: 'Mahua House', url: 'https://mahuahouse.in', category: 'Restaurant' },
    { src: '/work/websites/mohdiamond_website.jpg', client: 'Moh Diamond', url: 'https://mohdiamond.com', category: 'Jewelry' },
    { src: '/work/websites/griha_shiksha_kendra_website.jpg', client: 'Griha Shiksha Kendra', url: 'https://grihashikshakendra.com', category: 'Education' },
  ],
};

type TabType = 'graphicDesign' | 'logos' | 'websites';

export function PortfolioGridSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('graphicDesign');

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

  const tabs = [
    { key: 'graphicDesign' as TabType, label: 'Graphic Design', count: portfolioItems.graphicDesign.length },
    { key: 'logos' as TabType, label: 'Logo Design', count: portfolioItems.logos.length },
    { key: 'websites' as TabType, label: 'Web Development', count: portfolioItems.websites.length },
  ];

  const currentItems = portfolioItems[activeTab];

  return (
    <section ref={sectionRef} className="relative bg-white overflow-hidden" style={{ paddingTop: 'var(--v2-section-padding)', paddingBottom: 'var(--v2-section-padding)' }}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 relative z-10">
        {/* Section header */}
        <div
          className={`mb-10 transition-[opacity,transform] duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ textAlign: 'center' }}
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-fm-magenta-600 mb-4">
            <span className="w-8 h-[2px] bg-fm-magenta-600" />
            Our Portfolio
            <span className="w-8 h-[2px] bg-fm-magenta-600" />
          </span>

          <h2
            className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-[1.2] tracking-[-0.02em] text-fm-neutral-900 mb-4"
            style={{ fontFamily: 'var(--font-display)', textAlign: 'center' }}
          >
            Latest Work in <span className="text-fm-magenta-600">Creative Design</span>
          </h2>
        </div>

        {/* Tabs */}
        <div
          className={`flex flex-wrap justify-center gap-3 mb-10 transition-[opacity,transform] duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '100ms' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-[background-color,color,box-shadow] duration-300 ${
                activeTab === tab.key
                  ? 'bg-fm-magenta-600 text-white shadow-lg shadow-fm-magenta-200/50'
                  : 'bg-fm-neutral-100 text-fm-neutral-600 hover:bg-fm-neutral-200'
              }`}
            >
              {tab.label}
              <span className={`ml-2 text-xs ${activeTab === tab.key ? 'text-fm-magenta-200' : 'text-fm-neutral-400'}`}>
                ({tab.count})
              </span>
            </button>
          ))}
        </div>

        {/* Portfolio grid */}
        <div
          className={`transition-[opacity,transform] duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          {activeTab === 'websites' ? (
            // Website grid - larger cards
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentItems.map((item) => (
                <a
                  key={item.src}
                  href={'url' in item ? item.url : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-fm-neutral-100 shadow-lg hover:shadow-xl transition-[box-shadow] duration-300"
                >
                  <img
                    src={item.src}
                    alt={item.client}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-fm-neutral-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <span className="text-xs font-medium text-fm-magenta-300 block mb-1">{item.category}</span>
                    <h3 className="text-white font-semibold">{item.client}</h3>
                  </div>
                </a>
              ))}
            </div>
          ) : activeTab === 'logos' ? (
            // Logo grid - square cards
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {currentItems.map((item) => (
                <div
                  key={item.src}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-fm-neutral-50 border border-fm-neutral-100 hover:border-fm-magenta-200 hover:shadow-lg transition-[border-color,box-shadow] duration-300 p-4"
                >
                  <img
                    src={item.src}
                    alt={item.client}
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
            </div>
          ) : (
            // Graphic design grid - masonry-like
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentItems.map((item) => (
                <div
                  key={item.src}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-fm-neutral-100 shadow-md hover:shadow-xl transition-[box-shadow] duration-300"
                >
                  <img
                    src={item.src}
                    alt={item.client}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-fm-neutral-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <span className="text-xs font-medium text-fm-magenta-300 block mb-0.5">{item.category}</span>
                    <h3 className="text-white text-sm font-medium">{item.client}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
