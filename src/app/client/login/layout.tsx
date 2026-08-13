import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Portal Login',
  description:
    'Log in to your FreakingMinds client portal to track projects, review content, access reports, and manage your account.',
  openGraph: {
    title: 'Client Portal Login | Freaking Minds',
    description:
      'Access your dedicated client dashboard — track project progress, approve content, download reports, and connect with your team.',
    url: '/client/login',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ClientLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
