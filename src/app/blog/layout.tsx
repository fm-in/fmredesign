import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — Digital Marketing Tips, Strategies & Insights',
  description:
    'Expert digital marketing insights from Freaking Minds. Learn SEO strategies, social media tips, branding advice, and growth tactics for your business.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Freaking Minds Blog — Marketing Tips & Strategies',
    description: 'Actionable digital marketing insights. SEO, social media, branding, and growth strategies from our team.',
    url: 'https://freakingminds.in/blog',
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
