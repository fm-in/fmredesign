import type { Metadata } from 'next';
import { OG_DEFAULTS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About Us — Our Team & Story',
  description:
    'Meet the Bhopal-based creative marketing agency helping ambitious brands grow through strategy, design and performance marketing.',
  alternates: { canonical: '/about' },
  openGraph: {
    ...OG_DEFAULTS,
    title: 'About Freaking Minds — Creative Marketing Agency in Bhopal',
    description: 'Strategy, design, and performance marketing under one roof. Discover who we are and why brands trust us.',
    url: '/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
