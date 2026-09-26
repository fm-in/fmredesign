import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Profile | CreativeMinds',
  description: 'Manage your CreativeMinds talent profile — update availability, portfolio, and rates.',
  robots: { index: false, follow: false },
  // Private portal page — do not inherit the root canonical of '/'.
  alternates: { canonical: null },
};

export default function TalentProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
