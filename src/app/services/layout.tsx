import type { Metadata } from 'next';
import { OG_DEFAULTS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Digital Marketing Services in Bhopal',
  description:
    'SEO, social media, brand design, performance ads and web development. Data-driven digital marketing that delivers measurable ROI.',
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
    ...OG_DEFAULTS,
    title: 'Digital Marketing Services — Freaking Minds',
    description: 'SEO, social media, branding, performance ads, web development — everything your brand needs to dominate online.',
    url: '/services',
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
