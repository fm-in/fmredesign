import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { StillFrame } from '@/components/site/StillFrame';
import { FilmWall, type Film } from '@/components/site/FilmWall';
import { Container, Display, Label, Rule, Section, Text } from '@/components/site/primitives';
import { PORTFOLIO, VIDEO_WORK, isUnnamedClient } from '@/lib/portfolio';

/**
 * The work.
 *
 * The V2 page put everything behind three tabs, so a visitor saw a third of
 * the portfolio and had to know to click for the rest — on the one page whose
 * entire job is showing how much there is. Everything is on the page now, in
 * sections, and the counts are stated rather than implied.
 *
 * A server component: nothing here needed a client boundary except the film
 * wall, which brings its own.
 */
export const metadata: Metadata = {
  title: 'Work',
  description:
    'Websites, brand films, campaigns and identities for Radisson, Jio Studios, Dainik Bhaskar, SKR Group and others.',
  alternates: { canonical: '/work' },
};

const FILMS: readonly Film[] = VIDEO_WORK.slice(0, 6).map((v) => ({
  id: v.id,
  client: v.client,
  note: v.category,
}));

export default function WorkPage() {
  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <Section as="div" className="pb-0">
          <Container>
            <Label>Selected work</Label>
            <Display level="display" className="mt-6 max-w-[15ch]">
              Real results for real brands.
            </Display>
            <Text size="lead" muted className="mt-8 max-w-2xl">
              {PORTFOLIO.websites.length} live sites, {VIDEO_WORK.length} films, and the campaign and
              identity work behind them.
            </Text>
          </Container>
        </Section>

        {/* ── Sites ─────────────────────────────────────────────────────── */}
        <Section>
          <Container>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <Display level="h2" as="h2">
                Sites we built.
              </Display>
              <Label>{PORTFOLIO.websites.length} live</Label>
            </div>
            <Rule soft className="mt-8" />
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {PORTFOLIO.websites.map((site) => (
                <a
                  key={site.src}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <StillFrame
                    src={site.src}
                    alt={`${site.client} website`}
                    ratio="16 / 11"
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                  />
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <span className="font-site-sans text-site-body text-site-text">{site.client}</span>
                    <span className="font-site-sans text-site-label uppercase text-site-muted">
                      {site.category}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </Container>
        </Section>

        {/* ── Films ─────────────────────────────────────────────────────── */}
        <Section tone="raised">
          <Container>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <Display level="h2" as="h2">
                Films we shot.
              </Display>
              <Label>{VIDEO_WORK.length} in the reel</Label>
            </div>
            <Rule soft className="mt-8" />
            <div className="mt-12">
              <FilmWall films={FILMS} />
            </div>
          </Container>
        </Section>

        {/* ── Campaign work ─────────────────────────────────────────────── */}
        <Section>
          <Container>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <Display level="h2" as="h2">
                Campaigns and creative.
              </Display>
              <Label>{PORTFOLIO.graphicDesign.length} pieces</Label>
            </div>
            <Rule soft className="mt-8" />
            <div className="mt-12 grid gap-6 grid-cols-2 lg:grid-cols-4">
              {PORTFOLIO.graphicDesign.map((item) => (
                <StillFrame
                  key={item.src}
                  src={item.src}
                  alt={`${item.client} — ${item.category}`}
                  ratio="1 / 1"
                  caption={`${item.client} · ${item.category}`}
                  sizes="(min-width: 1024px) 22vw, 46vw"
                />
              ))}
            </div>
          </Container>
        </Section>

        {/* ── Identity ──────────────────────────────────────────────────── */}
        <Section tone="raised">
          <Container>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <Display level="h2" as="h2">
                Identities we drew.
              </Display>
              <Label>{PORTFOLIO.logos.length} marks</Label>
            </div>
            <Rule soft className="mt-8" />
            <div className="mt-12 grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {PORTFOLIO.logos.map((logo) => (
                <StillFrame
                  key={logo.src}
                  src={logo.src}
                  alt={isUnnamedClient(logo.client) ? 'Logo design' : `${logo.client} logo`}
                  ratio="1 / 1"
                  sizes="(min-width: 1024px) 22vw, 45vw"
                />
              ))}
            </div>
          </Container>
        </Section>

        <Section>
          <Container width="narrow">
            <Display level="h1">Ready to be our next one?</Display>
            <Text size="lead" muted className="mt-8">
              Tell us what you are trying to move, and we will tell you whether we are the right people
              for it.
            </Text>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/get-started"
                className="rounded-site-sm px-5 py-3 font-site-sans text-site-body"
                style={{ background: 'var(--site-text)', color: 'var(--site-ground)' }}
              >
                Start a project
              </Link>
              <Link
                href="/services"
                className="font-site-sans text-site-body"
                style={{ color: 'var(--site-text)', textDecoration: 'underline', textUnderlineOffset: '6px' }}
              >
                See what we do
              </Link>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </SiteShell>
  );
}
