import type { Metadata } from 'next';

/**
 * Without this, the login screen inherits `/creativeminds`'s metadata and
 * presents itself to crawlers as the talent-network marketing page.
 */
export const metadata: Metadata = {
  title: 'Talent Login | CreativeMinds',
  robots: { index: false, follow: false },
  alternates: { canonical: '/creativeminds/login' },
};

export default function TalentLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
