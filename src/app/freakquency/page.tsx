/**
 * Freakquency — the content hub.
 *
 * "Frequency" is a media-buying metric: how often your audience sees the
 * message. The name is memorable but meaningless to a search engine, so the
 * title and description carry all the descriptive weight — nobody will ever
 * search "freakquency", and the page still has to be findable.
 *
 * Server component: the feed is fetched here and passed down, so the list is
 * in the initial HTML for crawlers rather than appearing after hydration.
 */

import type { Metadata } from 'next';
import { V2PageWrapper } from '@/components/layouts/V2PageWrapper';
import { OG_DEFAULTS } from '@/lib/seo';
import { getFeedItems, audienceCounts } from '@/lib/resources/public-data';
import FreakquencyClient from './FreakquencyClient';

// Aggregated news arrives on a two-hourly cron; an hour of staleness is
// invisible to a reader and keeps this off the origin on every request.
export const revalidate = 3600;

export const metadata: Metadata = {
  // The coined word earns recall; everything after the dash earns search.
  title: 'Freakquency — Marketing News, Guides & Tools',
  description:
    'What actually happened in marketing this week, filtered — plus guides and tools for people who have to act on it. Curated by the Freaking Minds team.',
  alternates: { canonical: '/freakquency' },
  openGraph: {
    ...OG_DEFAULTS,
    title: 'Freakquency — Marketing News, Guides & Tools',
    description:
      'What actually happened in marketing this week, filtered — plus guides and tools for people who have to act on it.',
    url: '/freakquency',
  },
};

export default async function FreakquencyPage() {
  const items = await getFeedItems();
  const counts = audienceCounts(items);

  return (
    <V2PageWrapper>
      <FreakquencyClient items={items} counts={counts} />
    </V2PageWrapper>
  );
}
