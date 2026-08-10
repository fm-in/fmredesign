/**
 * Marketing health scorecard — public, self-serve.
 *
 * Deliberately NOT given a `loading.tsx`: see the note in CLAUDE.md. This
 * page does not call notFound(), but the segment sits beside routes that may
 * later, and the skeleton would buy nothing here — the quiz is client-side
 * and paints immediately.
 */

import type { Metadata } from 'next';
import { V2PageWrapper } from '@/components/layouts/V2PageWrapper';
import ScorecardClient from './ScorecardClient';

export const metadata: Metadata = {
  // The root layout applies the template '%s | Freaking Minds' — do not repeat it here.
  title: 'Free Marketing Health Scorecard',
  description:
    'Eleven questions, two minutes, and a straight answer on where your marketing is losing you customers — with the specific thing to fix first. No jargon, no sales pitch.',
  alternates: { canonical: '/scorecard' },
  openGraph: {
    title: 'How healthy is your marketing? Find out in 2 minutes',
    description:
      'A free, honest diagnostic for small businesses. Eleven questions, a score out of 100, and the one thing worth fixing first.',
    url: 'https://freakingminds.in/scorecard',
    type: 'website',
  },
};

export default function ScorecardPage() {
  return (
    <V2PageWrapper>
      <ScorecardClient />
    </V2PageWrapper>
  );
}
