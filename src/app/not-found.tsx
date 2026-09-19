import Link from 'next/link';
import Image from 'next/image';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Container, Display, Eyebrow, Label, Section, Text } from '@/components/site/primitives';

/**
 * 404.
 *
 * Gets the full site chrome, because the most useful thing on a 404 is the
 * navigation. The mascot takes the same graphite treatment as everywhere else
 * — in native colours it is pink and purple, which on a bone page reads as
 * clip art.
 */
export default function NotFound() {
  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <Section>
          <Container width="narrow">
            <Image
              src="/3dasset/brain-confused.webp"
              alt=""
              aria-hidden
              width={220}
              height={220}
              className="h-auto"
              style={{ maxWidth: '180px', filter: 'grayscale(1) brightness(0.72) contrast(1.45)' }}
            />
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
