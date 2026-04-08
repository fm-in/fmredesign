import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us — The Team Behind Freaking Minds',
  description:
    'Meet the Bhopal-based creative marketing agency helping ambitious brands grow through strategy, design, and performance marketing. Learn our story, values, and what drives us.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Freaking Minds — Creative Marketing Agency in Bhopal',
    description: 'Strategy, design, and performance marketing under one roof. Discover who we are and why brands trust us.',
    url: 'https://freakingminds.in/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
