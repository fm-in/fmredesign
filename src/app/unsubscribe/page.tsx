/**
 * Reached from a link in a sales email.
 *
 * Gets the full site chrome like every other public page. It previously opted
 * out — a bare `fm-neutral-50` div with no shell — which meant the one page a
 * recipient sees after asking to be left alone was the only page that did not
 * look like the company. It is a short page, not a different site.
 */
import type { Metadata } from 'next';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Container, Display, Eyebrow, Section, Text } from '@/components/site/primitives';
import { UnsubscribeForm } from '@/components/sales/UnsubscribeForm';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
  // The token in the URL must not travel to any page this one links to.
  referrer: 'no-referrer',
  alternates: { canonical: '/unsubscribe' },
};

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;

  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <Section>
          <Container>
            <div className="lay-rail">
              <div>
                <Eyebrow>Email</Eyebrow>
              </div>

              <div className="lay-measure">
                <Display level="h1">Stop follow-up emails.</Display>
                <Text size="lead" muted className="mt-8">
                  Confirm below and we will not email you about your enquiry again. It takes effect
                  immediately &mdash; there is nothing else to do.
                </Text>

                <div className="mt-10">
                  <UnsubscribeForm token={t ?? ''} />
                </div>

                <p className="mt-12 font-site-sans text-site-label text-site-muted">
                  This only stops sales follow-ups. Anything you asked us to send &mdash; a
                  receipt, a course confirmation &mdash; still reaches you.
                </p>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </SiteShell>
  );
}
