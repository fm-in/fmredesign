import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Digital Marketing Services — SEO, Social Media, Branding & More',
  description:
    'Full-service digital marketing: SEO, social media marketing, brand design, performance ads, web development, and content marketing. Data-driven strategies that deliver real ROI.',
  alternates: { canonical: '/services' },
  keywords: [
    'digital marketing services bhopal',
    'seo services india',
    'social media marketing agency',
    'brand design agency',
    'performance marketing',
    'web development services',
  ],
  openGraph: {
    title: 'Digital Marketing Services — Freaking Minds',
    description: 'SEO, social media, branding, performance ads, web development — everything your brand needs to dominate online.',
    url: 'https://freakingminds.in/services',
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
