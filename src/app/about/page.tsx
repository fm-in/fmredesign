import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Container, Display, Eyebrow, Label, Rule, Section, Text } from '@/components/site/primitives';
import { COMPANY_PHONE_DISPLAY, COMPANY_WHATSAPP_URL } from '@/lib/company';

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
  title: 'About Us — Our Team & Story',
  description:
    'Freaking Minds is a full-service creative marketing agency in Bhopal. Meet the team, and see how strategy, design and performance marketing work under one roof.',
  alternates: { canonical: '/about' },
};

const VALUES = [
  {
    title: 'Innovation',
    description:
      'We try new formats, tools and ideas early, so our clients are not the last in their market to use them.',
  },
  {
    title: 'Authenticity',
    description:
      'We tell the story your brand can actually back up. No borrowed personality, no claims your customers will see through.',
  },
  {
    title: 'Results',
    description:
      'Every campaign is measured against a number agreed at the start. Good-looking work that does not move it is not finished.',
  },
  {
    title: 'Collaboration',
    description:
      'We work as an extension of your team, respect your goals, and say so early when something is not working.',
  },
] as const;

const TEAM = [
  {
    name: 'Arushi Maheshwari',
    role: 'Founder & CEO',
    experience: '10+ years',
    expertise: 'Brand Strategy, Business Development',
    description:
      'Leads strategy and new business, and sets the direction for the work the studio takes on.',
    image: '/team/Arushimaheshwari.png',
  },
  {
    name: 'Abhishek Ray',
    role: 'Sales Head',
    experience: '6+ years',
    expertise: 'Sales Strategy, Client Acquisition',
    description:
      'Looks after new clients and partnerships, from the first conversation to a signed brief.',
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
            {/* The hero pairs the headline with the people it is about. The
                right half was empty while the portraits sat three sections
                further down. */}
            <div className="lay-split">
              <div>
            <Eyebrow>Meet the minds behind the work</Eyebrow>
            <Display level="display" className="mt-6">
              Your growth is the brief.
            </Display>
            <Text size="lead" muted className="mt-8 lay-measure">
              Freaking Minds is a full-service creative and marketing agency in Bhopal, working with
              brands for over a decade. Strategy and creative sit in one team, and the work is judged
              by what it does for the business, not only by how it looks.
            </Text>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/get-started"
                className="btn btn--primary"
              >
                Start a project
              </Link>
              <Link
                href="/work"
                className="link-u"
              >
                See our work
              </Link>
            </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {TEAM.map((member) => (
                  <figure key={member.name} className="m-0">
                    <div
                      className="relative overflow-hidden rounded-site-sm"
                      style={{ aspectRatio: '4 / 5', background: 'var(--site-raised)', boxShadow: 'var(--site-film-shadow)' }}
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-site-sm"
                        style={{ boxShadow: 'inset 0 0 0 1px var(--site-line)', zIndex: 1 }}
                      />
                      <Image src={member.image} alt={member.name} fill sizes="(min-width:900px) 24vw, 45vw" className="object-cover object-top" />
                    </div>
                    <figcaption className="tag mt-3">{member.name.split(' ')[0]}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </Container>
        </Section>

        <Section>
          <Container>
            <div className="lay-rail">
              <Eyebrow>How we work</Eyebrow>
              <div>
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
              </div>
            </div>
          </Container>
        </Section>

        <Section tone="raised">
          <Container>
            <div className="lay-rail">
              <Eyebrow>The people you will work with</Eyebrow>
              <div className="grid gap-12 sm:grid-cols-2">
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
            </div>
          </Container>
        </Section>

        {/* The closing CTA was a 720px block centred in a 1309px container —
            295px dead on each side. Now a split: the ask on the left, the
            routes to act on it on the right. */}
        <Section>
          <Container>
            <div className="lay-split">
              <div>
            <Display level="h1" as="h2">Let&rsquo;s create something great together.</Display>
            <Text size="lead" muted className="mt-8 lay-measure">
              Tell us what you are trying to move and we will tell you whether we are the right people
              for it.
            </Text>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/get-started"
                className="btn btn--primary"
              >
                Start a project
              </Link>
              <Link
                href="/contact"
                className="link-u"
              >
                Or ask a question
              </Link>
            </div>
              </div>

              {/* A split with an empty second column is the same dead space in
                  a different place. The right column carries the direct routes,
                  so someone who does not want a form still has somewhere to go. */}
              <div>
                <Rule />
                <dl className="mt-6" style={{ margin: '1.5rem 0 0' }}>
                  {[
                    ['Email', 'freakingmindsdigital@gmail.com', 'mailto:freakingmindsdigital@gmail.com'],
                    ['WhatsApp', COMPANY_PHONE_DISPLAY, COMPANY_WHATSAPP_URL],
                    ['Reply', 'Within 24 hours, Mon\u2013Sat', null],
                  ].map(([label, value, href]) => (
                    <div key={label} className="flex items-baseline justify-between gap-6 py-3" style={{ borderBottom: '1px solid var(--site-line-soft)' }}>
                      <dt className="tag">{label}</dt>
                      <dd style={{ margin: 0, textAlign: 'right' }}>
                        {href ? (
                          <a href={href} style={{ color: 'var(--site-text)' }}>{value}</a>
                        ) : (
                          <span style={{ color: 'var(--site-muted)' }}>{value}</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </SiteShell>
  );
}
