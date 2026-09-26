import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { BrainMark } from '@/components/site/BrainMark';
import { Container, Display, Eyebrow, Label, Section, Text } from '@/components/site/primitives';

/**
 * 404.
 *
 * Gets the full site chrome, because the most useful thing on a 404 is the
 * navigation. The mascot is a BrainMark sticker like everywhere else.
 */
// Without this the tab and any shared link say the home page's title.
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
  // Otherwise the root's canonical of '/' is emitted on every 404.
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <Section>
          <Container width="narrow">
            <BrainMark pose="confused" width={180} />
            <Eyebrow className="mt-10 block">Error 404</Eyebrow>
            <Display level="h1" className="mt-5">
              This page does not exist.
            </Display>
            <Text size="lead" muted className="mt-8">
              It may have moved, or the link may be wrong. The work, the services and the writing
              are all still where they were.
            </Text>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/"
                className="btn btn--primary"
              >
                Back to the homepage
              </Link>
              <Link
                href="/contact"
                className="link-u"
              >
                Tell us what you were looking for
              </Link>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </SiteShell>
  );
}
