import type { Metadata } from 'next';
import { OG_DEFAULTS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Our Work — Portfolio & Case Studies',
  description:
    'Real results from real brands. Our portfolio of web design, branding, social campaigns and marketing projects that drove measurable growth.',
  alternates: { canonical: '/work' },
  openGraph: {
    ...OG_DEFAULTS,
    title: 'Portfolio & Case Studies — Freaking Minds',
    description: 'Real results for real brands. Explore our design, marketing, and growth projects.',
    url: '/work',
  },
};

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
