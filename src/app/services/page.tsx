import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Container, Display, Eyebrow, Label, Rule, Section, Text } from '@/components/site/primitives';
import { LetterWindow } from '@/components/site/LetterWindow';
import { ServiceLoop } from '@/components/site/ServiceLoop';
import { StepsLoop } from '@/components/site/StepsLoop';
import { LoopStage } from '@/components/site/LoopStage';
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
  title: 'Digital Marketing Services in Bhopal',
  description:
    'SEO, social media, performance marketing, brand identity, web development and content & video — what each one involves and who it suits. Freaking Minds, Bhopal.',
  alternates: { canonical: '/services' },
};

const PROCESS = [
  {
    step: '01',
    title: 'Discovery & audit',
    description:
      'We look at where you stand today, what you want to move, and where the quickest wins are.',
  },
  {
    step: '02',
    title: 'Strategy',
    description:
      'A written plan: which channels, what we will make, what it costs, and the number we report against.',
  },
  {
    step: '03',
    title: 'Implementation',
    description:
      'We make the work and run it, with one team across strategy, creative and media.',
  },
  {
    step: '04',
    title: 'Measure & improve',
    description:
      'We report every month, keep what works, and change what does not.',
  },
] as const;

/** Services with a mascot loop in /public/videos/services (all six). */
const SERVICE_LOOPS = new Set(['seo', 'social', 'performance', 'branding', 'web', 'content']);

export default function ServicesPage() {
  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
        {/* The letter window, still: the headline cut out over client films.
            Placeholder films until each service has its own footage. */}
        <LetterWindow
          mode="still"
          tone="duotone"
          films={['astroo_apaar', 'kanha', 'giovanni', 'skr_group', 'renny', 'concept_studio']}
          lines={['Six things,', 'done properly.']}
        >
          <p className="lede">
            Strategy, creative and performance under one roof. Each one below says what it actually
            involves and who it tends to be right for.
          </p>
          {/* The page's index: each service previews its loop on hover and
              links down to its section. */}
          <LoopStage
            label="Services on this page"
            base="/videos/services/"
            rowsAreLinks
            items={SERVICES.map((service) => ({
              id: service.id,
              name: service.name,
              sub: service.tagline,
              desc: service.description,
              href: serviceHref(service.id),
              linkLabel: `Read about ${service.name}`,
            }))}
          />
        </LetterWindow>

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
                  {/* With a loop, the column stays in view while the details are read. */}
                  <div className={SERVICE_LOOPS.has(service.id) ? 'service-side' : undefined}>
                    <Label>{String(index + 1).padStart(2, '0')}</Label>
                    <Display level="h2" as="h2" className="mt-4">
                      {service.title}
                    </Display>
                    <Text muted className="mt-5">
                      {service.tagline}
                    </Text>
                    {SERVICE_LOOPS.has(service.id) && <ServiceLoop id={service.id} />}
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
            {/* The loop acts the steps out; each row lights as the mascot
                reaches its station (timings from the loop's composition). */}
            <StepsLoop
              src="/videos/steps/process"
              steps={PROCESS}
              windows={[[0, 2.05], [2.05, 3.65], [3.65, 5.25], [5.25, 7]]}
              label="How we work"
            />
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
