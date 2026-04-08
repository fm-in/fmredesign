import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Work — Portfolio & Case Studies',
  description:
    'See real results from real brands. Explore our portfolio of web design, branding, social media campaigns, and digital marketing projects that drove measurable growth.',
  alternates: { canonical: '/work' },
  openGraph: {
    title: 'Portfolio & Case Studies — Freaking Minds',
    description: 'Real results for real brands. Explore our design, marketing, and growth projects.',
    url: 'https://freakingminds.in/work',
  },
};

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
