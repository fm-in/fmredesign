import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Container, Display, Label, Rule, Section, Text } from '@/components/site/primitives';

/**
 * About.
 *
 * Copy carried over from the V2 page. What changed is the composition: the
 * values were four icon cards in a row, the team two cards in a row, and both
 * sections were separated by decorative wave dividers that did no work. Values
 * are now a numbered list and the team is at portrait scale, because there are
 * only two of them and a two-card grid on a wide page reads as a gap.
 */
export const metadata: Metadata = {
  title: 'About',
  description:
    'Freaking Minds is a full-service creative marketing agency. Strategy, design and performance under one roof.',
  alternates: { canonical: '/about' },
};

const VALUES = [
  {
    title: 'Innovation',
    description:
      'We constantly push boundaries and explore new creative territories to deliver cutting-edge solutions that set our clients apart.',
  },
  {
    title: 'Authenticity',
    description:
      'We believe in genuine brand stories and authentic connections. Every strategy we create reflects the true essence of your brand.',
  },
  {
    title: 'Results',
    description:
      "Data-driven approach ensures every campaign delivers measurable ROI. We don't just create beautiful campaigns, we create business growth.",
  },
  {
    title: 'Collaboration',
    description:
      'Your success is our success. We work as an extension of your team, bringing expertise while respecting your vision and goals.',
  },
] as const;

const TEAM = [
  {
    name: 'Arushi Maheshwari',
    role: 'Founder & CEO',
    experience: '10+ years',
    expertise: 'Brand Strategy, Business Development',
    description:
      'Visionary leader with a passion for transforming brands through innovative marketing strategies.',
    image: '/team/Arushimaheshwari.png',
  },
  {
    name: 'Abhishek Ray',
    role: 'Sales Head',
    experience: '6+ years',
    expertise: 'Sales Strategy, Client Acquisition',
    description:
      'Dynamic sales professional driving business growth through strategic partnerships and client relationships.',
    image: '/team/Abhishek.png',
  },
] as const;

export default function AboutPage() {
  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <Section as="div" className="pb-0">
          <Container>
            <Label>Meet the minds behind the work</Label>
            <Display level="display" className="mt-6 max-w-[16ch]">
              Your growth is our mission.
            </Display>
            <Text size="lead" muted className="mt-8 max-w-2xl">
              Freaking Minds is a full-service creative marketing agency that has been revolutionizing
              brand growth for over a decade. We combine strategic thinking with creative excellence to
              deliver campaigns that don&rsquo;t just look good&mdash;they drive real business results.
            </Text>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/get-started"
                className="rounded-site-sm px-5 py-3 font-site-sans text-site-body"
                style={{ background: 'var(--site-text)', color: 'var(--site-ground)' }}
              >
                Work with us
              </Link>
              <Link
                href="/work"
                className="font-site-sans text-site-body"
                style={{ color: 'var(--site-text)', textDecoration: 'underline', textUnderlineOffset: '6px' }}
              >
                View our work
              </Link>
            </div>
          </Container>
        </Section>

        <Section>
          <Container>
            <Label>What drives our excellence</Label>
            {/*
              Four numbered rows, not four icon cards. The icons were generic
              lucide glyphs that carried no meaning the heading did not already
              carry, and four equal cards flatten the differences between them.
            */}
            <ul className="mt-12" style={{ listStyle: 'none', margin: '3rem 0 0', padding: 0 }}>
              {VALUES.map((value, index) => (
                <li key={value.title} style={{ borderTop: '1px solid var(--site-line-soft)' }}>
                  <div className="grid gap-3 py-8 sm:grid-cols-[4rem_minmax(0,16ch)_1fr] sm:gap-10">
                    <span className="font-site-sans text-site-label text-site-muted">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Display level="h3" as="h2">
                      {value.title}
                    </Display>
                    <Text muted>{value.description}</Text>
                  </div>
                </li>
              ))}
            </ul>
            <Rule soft />
          </Container>
        </Section>

        <Section tone="raised">
          <Container>
            <Label>The creative minds behind your success</Label>
            <div className="mt-12 grid gap-12 sm:grid-cols-2">
              {TEAM.map((member) => (
                <div key={member.name}>
                  <div
                    className="relative overflow-hidden rounded-site-md"
                    style={{
                      aspectRatio: '4 / 5',
                      maxWidth: '360px',
                      background: 'var(--site-ground)',
                      boxShadow: 'var(--site-film-shadow)',
                    }}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-site-md"
                      style={{ boxShadow: 'inset 0 0 0 1px var(--site-line)', zIndex: 1 }}
                    />
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      sizes="(min-width: 640px) 360px, 100vw"
                      className="object-cover object-top"
                    />
                  </div>
                  <Display level="h3" as="h2" className="mt-6">
                    {member.name}
                  </Display>
                  <Text muted className="mt-2">
                    {member.role} &middot; {member.experience}
                  </Text>
                  <Text className="mt-4 max-w-sm">{member.description}</Text>
                  <Label className="mt-4 block">{member.expertise}</Label>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        <Section>
          <Container width="narrow">
            <Display level="h1" as="h2">Let&rsquo;s create something great together.</Display>
            <Text size="lead" muted className="mt-8">
              Tell us what you are trying to move and we will tell you whether we are the right people
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
