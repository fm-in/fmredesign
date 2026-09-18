import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { FilmWall, type Film } from '@/components/site/FilmWall';
import { LogoWall, type ClientLogo } from '@/components/site/LogoWall';
import { Container, Display, Label, Rule, Section, Text } from '@/components/site/primitives';
import { SERVICES, serviceHref } from '@/lib/services-catalogue';

/**
 * The home page in the new direction, on a preview route so it can be judged
 * against the live page before it replaces it.
 *
 * What it deliberately does not do, versus the current home page:
 *
 * - No pinned sections. Both pin engines die here — the page scrolls.
 * - No rotating headline. The current hero cycles four phrases, which means
 *   the single most important line on the site is never still long enough to
 *   read, and its layout shifts on each swap.
 * - No `PageLoader`. It covers the header for 1.7s on every visit while the
 *   page underneath is already interactive.
 * - No invented metrics. "100+ brands" and "300% average traffic lift" are
 *   hardcoded in the current components with nothing behind them.
 */
export const metadata: Metadata = {
  title: 'Home preview',
  robots: { index: false, follow: false },
  alternates: { canonical: '/site-preview/home' },
};

/* Dark films anchor the ends; the two high-key reels sit inboard. */
const FILMS: readonly Film[] = [
  { id: 'astroo_apaar', client: 'Astroo Apaar', note: 'Brand film' },
  { id: 'renny', client: 'Renny', note: 'Social campaign' },
  { id: 'kanha', client: 'Kanha', note: 'Promotional' },
  { id: 'giovanni', client: 'Giovanni Village', note: 'Resort brand' },
  { id: 'concept_studio', client: 'Concept Studio', note: 'Creative' },
  { id: 'skr_group', client: 'SKR Group', note: 'Corporate' },
];

/*
 * Optical weight, not importance: a wide wordmark needs more width than a
 * compact mark to read at the same size. The recognisable names lead.
 */
/** Files in /public/clients. Stated rather than rounded up into a claim. */
const TOTAL_CLIENT_LOGOS = 36;

const LOGOS: readonly ClientLogo[] = [
  { src: '/clients/Asset-11.png', name: 'Radisson', scale: 3 },
  { src: '/clients/Asset-12.png', name: 'Jio Studios', scale: 2 },
  { src: '/clients/Asset-13.png', name: 'BNI', scale: 2 },
  { src: '/clients/Asset-18.png', name: 'Dainik Bhaskar', scale: 3 },
  { src: '/clients/Asset-15.png', name: 'Zuper Hotels & Resorts', scale: 3 },
  { src: '/clients/Asset-21.png', name: 'SKR Group', scale: 2 },
  { src: '/clients/Asset-10.png', name: 'Wise Consultancy', scale: 2 },
  { src: '/clients/Asset-14.png', name: 'Hind Wallcare', scale: 2 },
  { src: '/clients/Asset-20.png', name: 'Galaxy Enclave', scale: 3 },
  { src: '/clients/Asset-16.png', name: 'Indian Kayaking & Canoeing Association', scale: 2 },
  { src: '/clients/Asset-17.png', name: 'Uthara Print', scale: 2 },
  { src: '/clients/Asset-19.png', name: 'Bhaskar Denim', scale: 2 },
];

/*
 * The three ways people arrive. Written the way they would say it, not the way
 * an agency would categorise it.
 */
const ENTRY_POINTS = [
  {
    title: 'You need someone to run it',
    body: 'Strategy, campaigns, content and the reporting that tells you whether any of it worked. We act as the marketing team you would otherwise be hiring.',
    href: '/get-started',
    cta: 'Start a project',
  },
  {
    title: 'You need something built',
    body: 'Sites, storefronts and the tooling behind them — fourteen client sites live today, plus the platforms we build for ourselves and then hand over.',
    href: '/work',
    cta: 'See the work',
  },
  {
    title: 'You want to learn it',
    body: 'FM Academy runs the same playbooks we use on client work, taught by the people doing it. Paid, small, and not a webinar.',
    href: '/academy',
    cta: 'See the programmes',
  },
] as const;

export default function HomePreviewPage() {
  return (
    <SiteShell>
      <SiteHeader />

      <main id="main-content">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <Section as="div" className="pb-0 pt-6">
          <Container>
            <div className="grid items-end gap-10 lg:grid-cols-[1.35fr_0.65fr]">
              <div>
                <Label>Marketing &amp; digital partners</Label>
                <Display level="display" className="mt-6">
                  We do the work
                  <br />
                  that moves the number.
                </Display>
                <Text size="lead" muted className="mt-8 max-w-xl">
                  Freaking Minds is a marketing and digital partner for brands that need
                  campaigns run, sites built and results they can actually check. Radisson,
                  Jio Studios and Dainik Bhaskar are on that list.
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
                    href="/work"
                    className="font-site-sans text-site-body"
                    style={{ color: 'var(--site-text)', textDecoration: 'underline', textUnderlineOffset: '6px' }}
                  >
                    See the work first
                  </Link>
                </div>
              </div>

              {/*
                One mascot, large, and only here. The current site places nine
                of them at thumbnail size across ten pages, which turns a brand
                asset into decoration. At this scale it reads as a character.
              */}
              <div className="hidden justify-self-end lg:block">
                <Image
                  src="/3dasset/brain-rocket.webp"
                  alt=""
                  aria-hidden
                  width={420}
                  height={420}
                  priority
                  className="h-auto w-full"
                  style={{
                    maxWidth: '420px',
                    /*
                      In native colours this render is pink, purple and rainbow
                      — it fights an ink-on-paper page and reads as clip art.
                      Greyscale alone was worse: the render is pale, so it came
                      out at almost exactly the value of bone paper and
                      disappeared. Darkened and hardened it reads as a graphite
                      figure — the character survives, and it belongs to the
                      same world as the type and the films.
                    */
                    filter: 'grayscale(1) brightness(0.72) contrast(1.45)',
                  }}
                />
              </div>
            </div>
          </Container>
        </Section>

        {/* ── Proof, immediately ───────────────────────────────────────── */}
        <Section>
          <Container>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <Label>Brands we work with</Label>
              <Text muted className="text-site-label">
                {LOGOS.length} of {TOTAL_CLIENT_LOGOS}
              </Text>
            </div>
            <div className="mt-8">
              <LogoWall logos={LOGOS} />
            </div>
          </Container>
        </Section>

        {/* ── The work ─────────────────────────────────────────────────── */}
        <Section tone="raised">
          <Container>
            <div className="max-w-2xl">
              <Label>Recent work</Label>
              <Display level="h2" className="mt-5">
                Films we shot, cut and shipped.
              </Display>
              <Text muted className="mt-5">
                Six of the eight client films in the studio&rsquo;s reel. Vertical, because
                that is where they ran.
              </Text>
            </div>
            <div className="mt-14">
              <FilmWall films={FILMS} />
            </div>
            <div className="mt-14">
              <Link
                href="/work"
                className="font-site-sans text-site-body"
                style={{ color: 'var(--site-text)', textDecoration: 'underline', textUnderlineOffset: '6px' }}
              >
                Everything else we have shipped
              </Link>
            </div>
          </Container>
        </Section>

        {/* ── What we do ───────────────────────────────────────────────── */}
        <Section>
          <Container>
            <div className="max-w-2xl">
              <Label>What we do</Label>
              <Display level="h2" className="mt-5">
                Six things, done properly.
              </Display>
            </div>

            {/*
              A table, not six cards. Cards give every service the same visual
              weight and force a description length none of them want; a table
              lets the eye scan the names and stop at the one that matters.
            */}
            <ul className="mt-14" style={{ listStyle: 'none', margin: '3.5rem 0 0', padding: 0 }}>
              {SERVICES.map((service) => (
                <li key={service.id} style={{ borderTop: '1px solid var(--site-line-soft)' }}>
                  <Link
                    href={serviceHref(service.id)}
                    className="group grid gap-2 py-7 sm:grid-cols-[minmax(0,22ch)_1fr] sm:gap-10"
                  >
                    <span className="font-site-display text-site-h3 text-site-text">
                      {service.name}
                    </span>
                    <span className="font-site-sans text-site-body text-site-muted">
                      {service.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Rule soft />
          </Container>
        </Section>

        {/* ── Three doors ──────────────────────────────────────────────── */}
        <Section tone="raised">
          <Container>
            <Label>Where to start</Label>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {ENTRY_POINTS.map((entry) => (
                <div key={entry.title}>
                  <Rule />
                  <Display level="h3" as="h3" className="mt-6">
                    {entry.title}
                  </Display>
                  <Text muted className="mt-4">
                    {entry.body}
                  </Text>
                  <Link
                    href={entry.href}
                    className="mt-6 inline-block font-site-sans text-site-body"
                    style={{ color: 'var(--site-text)', textDecoration: 'underline', textUnderlineOffset: '6px' }}
                  >
                    {entry.cta}
                  </Link>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* ── Close ────────────────────────────────────────────────────── */}
        <Section>
          <Container width="narrow">
            <Display level="h1">Tell us what you are trying to move.</Display>
            <Text size="lead" muted className="mt-8">
              A number, a launch, a problem you have been circling for months. We will tell
              you whether we are the right people for it — and if we are not, who is.
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
                href="/contact"
                className="font-site-sans text-site-body"
                style={{ color: 'var(--site-text)', textDecoration: 'underline', textUnderlineOffset: '6px' }}
              >
                Or just ask a question
              </Link>
            </div>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </SiteShell>
  );
}
