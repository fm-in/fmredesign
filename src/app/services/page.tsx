import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Container, Display, Eyebrow, Label, Rule, Section, Text } from '@/components/site/primitives';
import { SERVICES, serviceHref } from '@/lib/services-catalogue';
import { serviceDeepDiveData } from '@/data/serviceDeepDiveData';

/**
 * Services.
 *
 * The detail that used to live behind `ServiceDeepDiveModal` — a five-slide
 * overlay across seven files — is on the page now, one anchored section per
 * service. A visitor reading about SEO can link someone straight to it and a
 * crawler can index it; neither was true of the modal.
 *
 * What did NOT come across: the eighteen `resultsCTA.metrics`. "150%+ average
 * traffic increase", "3x more qualified leads", "100+ brands transformed" and
 * the rest are hardcoded in `serviceDeepDiveData` with nothing behind them.
 * The pillars and personas describe what is actually offered, so those stay.
 *
 * A server component: the modal was the only reason this page held state.
 */
export const metadata: Metadata = {
  title: 'Services',
  description:
    'SEO, social media, performance marketing, brand identity, web development and content — what each one actually involves.',
  alternates: { canonical: '/services' },
};

const PROCESS = [
  {
    step: '01',
    title: 'Discovery & Audit',
    description:
      'We analyze your current digital presence, understand your goals, and identify opportunities for growth.',
  },
  {
    step: '02',
    title: 'Strategy Development',
    description:
      'Our team creates a comprehensive digital marketing strategy tailored to your business objectives and target audience.',
  },
  {
    step: '03',
    title: 'Implementation',
    description:
      'We execute your custom strategy with precision, using the latest tools and best practices for maximum impact.',
  },
  {
    step: '04',
    title: 'Monitor & Optimize',
    description:
      'Continuous monitoring and optimization ensure your campaigns deliver the best possible results and ROI.',
  },
] as const;

export default function ServicesPage() {
  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <Section as="div" className="pb-0">
          <Container>
            <div className="lay-split">
              <div>
                <Eyebrow>What we do</Eyebrow>
                <Display level="display" className="mt-6">
                  Six things, done properly.
                </Display>
                <Text size="lead" muted className="mt-8 lay-measure">
                  Strategy, creative and performance under one roof. Each one below says what it
                  actually involves and who it tends to be right for.
                </Text>
              </div>

              {/* The index belongs beside the headline, not stacked under the
                  lede as a wrapped row with an empty half-page to its right. */}
              <nav aria-label="Services on this page">
                <Rule />
                <ul style={{ listStyle: 'none', margin: '1.5rem 0 0', padding: 0 }}>
                  {SERVICES.map((service, i) => (
                    <li key={service.id} style={{ borderBottom: '1px solid var(--site-line-soft)' }}>
                      <Link
                        href={serviceHref(service.id)}
                        className="flex items-baseline justify-between gap-6 py-3"
                        style={{ color: 'var(--site-text)' }}
                      >
                        <span className="font-site-sans text-site-body">{service.name}</span>
                        <span className="tag">{String(i + 1).padStart(2, '0')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </Container>
        </Section>

        {SERVICES.map((service, index) => {
          const detail = serviceDeepDiveData.find((d) => d.serviceId === service.id);
          return (
            <Section
              key={service.id}
              id={service.id}
              tone={index % 2 === 1 ? 'raised' : 'ground'}
              className="scroll-mt-24"
            >
              <Container>
                <div className="grid gap-10 lg:grid-cols-[minmax(0,26ch)_1fr] lg:gap-16">
                  <div>
                    <Label>{String(index + 1).padStart(2, '0')}</Label>
                    <Display level="h2" as="h2" className="mt-4">
                      {service.title}
                    </Display>
                    <Text muted className="mt-5">
                      {service.tagline}
                    </Text>
                  </div>

                  <div>
                    <Text size="lead">{detail?.hook.problemStatement ?? service.description}</Text>

                    {detail && (
                      <>
                        <Text muted className="mt-8">
                          {detail.whatWeDo.intro}
                        </Text>

                        <div className="mt-10 grid gap-8 sm:grid-cols-3">
                          {detail.whatWeDo.pillars.map((pillar) => (
                            <div key={pillar.name}>
                              <Rule />
                              <h3 className="mt-5 font-site-sans text-site-body text-site-text">
                                {pillar.name}
                              </h3>
                              <ul
                                className="mt-3 space-y-2"
                                style={{ listStyle: 'none', margin: '0.75rem 0 0', padding: 0 }}
                              >
                                {pillar.deliverables.map((item) => (
                                  <li
                                    key={item}
                                    className="font-site-sans text-site-body text-site-muted"
                                  >
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>

                        <div className="mt-14">
                          <Label>Who it tends to be right for</Label>
                          <div className="mt-6 grid gap-6 sm:grid-cols-2">
                            {detail.whoItsFor.personas.map((persona) => (
                              <div key={persona.title}>
                                <h3 className="font-site-sans text-site-body text-site-text">
                                  {persona.title}
                                </h3>
                                <Text muted className="mt-2">
                                  {persona.description}
                                </Text>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="mt-12">
                      <Link className="link-u" href="/get-started">
                        Talk to us about {service.name} <span aria-hidden>&rarr;</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </Container>
            </Section>
          );
        })}

        <Section id="process" className="scroll-mt-24">
          <Container>
            <Eyebrow>How we work</Eyebrow>
            <Display level="h2" as="h2" className="mt-5 max-w-[18ch]">
              The same four steps, every time.
            </Display>
            <ul className="mt-14" style={{ listStyle: 'none', margin: '3.5rem 0 0', padding: 0 }}>
              {PROCESS.map((item) => (
                <li key={item.step} style={{ borderTop: '1px solid var(--site-line-soft)' }}>
                  <div className="grid gap-3 py-8 sm:grid-cols-[4rem_minmax(0,18ch)_1fr] sm:gap-10">
                    <span className="font-site-sans text-site-label text-site-muted">{item.step}</span>
                    <Display level="h3" as="h3">
                      {item.title}
                    </Display>
                    <Text muted>{item.description}</Text>
                  </div>
                </li>
              ))}
            </ul>
            <Rule soft />
          </Container>
        </Section>

        <Section tone="raised">
          <Container>
            <div className="lay-split">
              <div>
            <Display level="h1" as="h2">Not sure which one you need?</Display>
            <Text size="lead" muted className="mt-8 lay-measure">
              Most projects are two or three of these together. Tell us the outcome and we will
              tell you what it takes.
            </Text>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/get-started"
                className="btn btn--primary"
              >
                Start a project
              </Link>
              <Link
                href="/scorecard"
                className="link-u"
              >
                Or take the Growth Scorecard
              </Link>
            </div>
              </div>

              <div>
                <Rule />
                <ol style={{ listStyle: 'none', margin: '1.5rem 0 0', padding: 0 }}>
                  {PROCESS.map((item) => (
                    <li key={item.step} className="flex items-baseline gap-5 py-3" style={{ borderBottom: '1px solid var(--site-line-soft)' }}>
                      <span className="tag">{item.step}</span>
                      <span className="font-site-sans text-site-body text-site-text">{item.title}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </SiteShell>
  );
}
