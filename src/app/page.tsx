import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { HomeMotion } from '@/components/site/HomeMotion';
import { getAcademyHomePricing } from '@/lib/academy/home-pricing';
import { serviceHref } from '@/lib/services-catalogue';

/**
 * The home page — the approved design, section for section.
 *
 * Structure follows the accepted prototype exactly: hero over the studio's own
 * film, the client marquees, the reel wall, the pinned campaign strip, the
 * capability list, evidence, the in-house software, Academy, close.
 *
 * A server component. Every video, image and word is in the initial HTML;
 * `HomeMotion` only animates markup that is already there, so the page is
 * complete before it loads and complete if it never does.
 *
 * Prices are read from the database rather than hardcoded — an earlier
 * hardcoded Academy price was wrong by ₹20,000.
 */
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export const revalidate = 60;

const HERO_FILMS = [
  { speed: '0.09', films: ['giovanni', 'skr_group'] },
  { speed: '-0.13', films: ['kanha', 'concept_studio'] },
  { speed: '0.06', films: ['renny', 'astroo_apaar'] },
] as const;

/** Twenty marks, split across two counter-running rows. */
const LOGO_ROWS = [
  Array.from({ length: 10 }, (_, i) => `Asset-${10 + i}`),
  Array.from({ length: 10 }, (_, i) => `Asset-${20 + i}`),
] as const;

const REELS = [
  { speed: '0.08', items: [['giovanni', 'Giovanni', 'Campaign film'], ['skr_group', 'SKR Group', 'Brand film']] },
  { speed: '-0.14', items: [['kanha', 'Kanha', 'Social campaign'], ['concept_studio', 'Concept Studio', 'Launch film']] },
  { speed: '0.05', items: [['renny', 'Renny', 'Product film'], ['astroo_apaar', 'Astroo Apaar', 'Content series']] },
] as const;

const CAMPAIGNS = [
  ['giovanni-service1', 'Giovanni — campaign'],
  ['elisa-service1', 'Elisa — launch'],
  ['skr-service1', 'SKR Group — brand'],
  ['harsh-service1', 'Harsh — social'],
  ['giovanni-service3', 'Giovanni — series'],
  ['elisa-service3', 'Elisa — product'],
  ['skr-service3', 'SKR Group — launch'],
  ['harsh-service3', 'Harsh — campaign'],
  ['giovanni-service5', 'Giovanni — film'],
  ['skr-service5', 'SKR Group — social'],
] as const;

const CAPABILITY = [
  ['seo', 'Search engine optimization', 'Get found. Get chosen.', 'Data-driven SEO that puts you where customers are already looking.'],
  ['social', 'Social media marketing', 'Stop posting. Start connecting.', 'Thumb-stopping content that turns followers into customers.'],
  ['performance', 'Performance marketing', 'Every rupee. Maximum impact.', 'Focused paid campaigns that deliver qualified leads and protect your ROI.'],
  ['branding', 'Brand identity design', 'Look unforgettable.', 'Visual identities that capture attention, build trust, and make competitors jealous.'],
  ['web', 'Website development', 'Fast. Beautiful. Converting.', 'Responsive, conversion-first websites that work as marketing tools.'],
  ['content', 'Content production', 'Stories that sell.', 'From scroll-stopping videos to blogs that rank: content that drives action.'],
] as const;

const PILLARS = [
  ['A', 'SEO that actually works', 'First-page rankings and quality leads, not vanity traffic.'],
  ['B', 'Social that converts', 'Communities built on content people stop for, then buy from.'],
  ['C', 'Performance you can measure', 'We obsess over your metrics so you can obsess over your business.'],
  ['D', 'A brand people remember', 'Complete visual systems that leave a lasting impression.'],
] as const;

const TEAM = [
  ['/team/Arushimaheshwari.png', 'Arushi'],
  ['/team/Abhishek.png', 'Abhishek'],
  ['/team/alii-palau.png', 'Ali'],
] as const;

const SYSTEMS = [
  ['Growth Scorecard', 'A public diagnostic that scores a brand’s digital health.', '/scorecard'],
  ['Freakquency', 'Our content engine. It ingests, publishes and distributes, on a schedule.', '/freakquency'],
  ['CreativeMinds', 'The talent network platform — applications, portfolios and the people who make the work.', '/creativeminds'],
  ['Client Portal', 'Project tracking, content approval, contracts and reports, in one place for every client.', null],
  ['Sales System', 'Capture through follow-up, automated — the same machinery we build into your business.', null],
] as const;

/*
 * The six courses. Titles live here; prices come from the database, because a
 * hardcoded Academy price was once wrong by ₹20,000 and advertised an expired
 * early-bird rate for ten weeks.
 */
const COURSES = [
  ['digital-marketing', 'Digital Marketing'],
  ['performance-marketing', 'Performance Marketing'],
  ['graphic-design', 'Graphic Designing'],
  ['video-editing', 'Video Editing'],
  ['ai-filmmaking', 'AI Filmmaking'],
  ['website-designing', 'Website Designing'],
] as const;

const SYSTEM_PROOF = [
  ['elisa_website.jpg', 'Elisa'],
  ['mahua_house_website.jpg', 'Mahua House'],
  ['playpal_website.png', 'Playpal'],
  ['restronaut_website.jpg', 'Restronaut'],
  ['badastoor_website.jpg', 'Badastoor'],
  ['mohdiamond_website.jpg', 'Mohdiamond'],
] as const;

export default async function Home() {
  const pricing = await getAcademyHomePricing();

  return (
    <SiteShell>
      <SiteHeader floating />
      <HomeMotion />


      <main id="main-content">
        {/* ═══ HERO ═══════════════════════════════════════════════════ */}
        <section className="hero">
          <div className="hero-shade" aria-hidden />
          <div className="wrap hero-grid">
            <div className="hero-in">
              <div className="eyebrow">
                <span className="tag tag--a">Marketing &amp; digital partner</span>
              </div>
              <h1 className="d">Ideas that move markets.</h1>
              <p className="lede">
                We are the marketing and digital partner for brands that intend to grow. Strategy,
                creative, performance &mdash; and the software underneath. One team.
              </p>
              <div className="hero-actions">
                <Link className="btn btn--primary" href="/get-started">
                  Get a free strategy call
                </Link>
                <Link className="btn btn--ghost" href="/work">
                  See our work
                </Link>
              </div>
              <div className="hero-figs">
                <div>
                  <b className="fig">{COURSES.length}</b>
                  <span className="tag">Academy courses</span>
                </div>
                <div>
                  <b className="fig">14</b>
                  <span className="tag">Client sites live</span>
                </div>
                <div>
                  <b className="fig">8</b>
                  <span className="tag">Films in the reel</span>
                </div>
              </div>
            </div>

            <div className="hero-films" aria-hidden>
              {HERO_FILMS.map((col) => (
                <div className="film-col" key={col.speed} data-hero-speed={col.speed}>
                  {col.films.map((id, i) => (
                    <video
                      key={id}
                      poster={`/videos/${id}-poster.jpg`}
                      muted
                      playsInline
                      loop
                      preload={i === 0 ? 'metadata' : 'none'}
                    >
                      <source src={`/videos/${id}.mp4`} type="video/mp4" />
                    </video>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CLIENT WALL ════════════════════════════════════════════ */}
        <div className="wall" aria-label="Clients we work with">
          {LOGO_ROWS.map((row, i) => (
            <div className="mq" key={i} data-mq={i === 0 ? '1' : '-1'}>
              {row.map((name) => (
                // Small files, but 36 of them in two marquees. Left as plain
                // <img>: the marquee duplicates its children until a cycle
                // exceeds the viewport, and next/image's wrapper markup breaks
                // the flex measurement that duplication depends on.
                // eslint-disable-next-line @next/next/no-img-element
                <img key={name} src={`/clients/${name}.png`} alt="" width={220} height={110} loading="lazy" decoding="async" />
              ))}
            </div>
          ))}
        </div>

        {/* ═══ REEL WALL ══════════════════════════════════════════════ */}
        <section className="sec" id="work">
          <div className="wrap">
            <div className="sec-head sec-head--split">
              <div>
                <div className="eyebrow">
                  <span className="tag">01 &mdash; The work</span>
                </div>
                <h2 className="d" data-mask>
                  Film that runs where people actually watch.
                </h2>
              </div>
              <p className="lede" style={{ maxWidth: '38ch' }}>
                Every campaign we make is built vertical first, for the feed it will live in. These
                are real client films.
              </p>
            </div>
          </div>

          <div className="wrap">
            <div className="reels">
              {REELS.map((col) => (
                <div className="rcol" key={col.speed} data-speed={col.speed}>
                  {col.items.map(([id, client, note]) => (
                    <figure className="reel" key={id}>
                      <video poster={`/videos/${id}-poster.jpg`} muted playsInline loop preload="none">
                        <source src={`/videos/${id}.mp4`} type="video/mp4" />
                      </video>
                      <figcaption>
                        <b>{client}</b>
                        <span className="tag">{note}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="wipe" aria-hidden>
          <i />
        </div>

        {/* ═══ CAMPAIGN STRIP (pinned) ════════════════════════════════ */}
        <section className="strip-sec" id="campaigns">
          <div className="strip-stage">
            <div className="strip-head">
              <div className="eyebrow">
                <span className="tag">02 &mdash; Campaigns</span>
              </div>
              <h2 className="d" data-mask style={{ fontSize: 'clamp(2rem, 4.4vw, 3.8rem)' }}>
                The creative that ran with it.
              </h2>
            </div>
            <div className="strip-track">
              {CAMPAIGNS.map(([file, caption]) => (
                <figure key={file}>
                  {/* Measured: these render at 314px and the source files are
                      1080–1440px wide, so the page was pulling 4.6x the pixels
                      it could show. `sizes` is what makes next/image pick the
                      narrow variant — without it, it serves 100vw. */}
                  <Image
                    src={`/work/services/${file}.jpg`}
                    alt={caption}
                    width={620}
                    height={775}
                    sizes="(max-width: 700px) 60vw, 340px"
                  />
                  <figcaption className="tag">{caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CAPABILITY ═════════════════════════════════════════════ */}
        <section className="sec" id="capability">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow">
                <span className="tag">03 &mdash; Capability</span>
              </div>
              <h2 className="d" data-mask>
                Six ways we grow a brand.
              </h2>
              <p className="lede">
                Every engagement is custom-built around your goals &mdash; and every one of them
                reports against a number you agreed to.
              </p>
            </div>

            <div className="cap">
              {CAPABILITY.map(([id, name, sub, desc], i) => (
                <Link className="cap-row" key={id} href={serviceHref(id)}>
                  <span className="tag n">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="cap-name">{name}</span>
                    <span className="cap-sub">{sub}</span>
                  </span>
                  <span className="cap-go" aria-hidden>
                    &rarr;
                  </span>
                  <span className="cap-desc">{desc}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ EVIDENCE ═══════════════════════════════════════════════ */}
        <section className="sec" id="evidence">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow">
                <span className="tag">04 &mdash; Evidence</span>
              </div>
              <h2 className="d" data-mask>
                Why brands choose us.
              </h2>
              <p className="lede">
                We don&rsquo;t chase rankings. We build growth that puts you in front of customers
                already looking for you.
              </p>
            </div>

            <div className="ev">
              <div className="ev-figs">
                <div className="ev-fig">
                  <b className="fig">36</b>
                  <span>Brands whose marks hang on our wall.</span>
                </div>
                <div className="ev-fig">
                  <b className="fig">14</b>
                  <span>Client sites we designed, built and still run.</span>
                </div>
              </div>

              <div className="ev-pillars">
                {PILLARS.map(([letter, title, body]) => (
                  <div className="pillar" key={letter}>
                    <span className="tag">{letter}</span>
                    <h3 className="h3">{title}</h3>
                    <p>{body}</p>
                  </div>
                ))}
              </div>

              <div className="team">
                {TEAM.map(([src, name]) => (
                  <figure key={name}>
                    {/* 142px on screen. `alii-palau.png` is 1348px wide and
                        980KB — 9.5x oversampled, the single heaviest asset on
                        the page. */}
                    <Image src={src} alt="" width={460} height={460} sizes="160px" />
                    <figcaption className="tag">{name}</figcaption>
                  </figure>
                ))}
                <p className="lede" style={{ flex: '1 1 260px', fontSize: '1rem' }}>
                  The people who make the work, not a stock photo of an office.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SYSTEMS ════════════════════════════════════════════════ */}
        <section className="sec" id="systems">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow">
                <span className="tag">05 &mdash; In-house software</span>
              </div>
              <h2 className="d" data-mask>
                We build our own software. The same team builds yours.
              </h2>
              <p className="lede">
                Most agencies buy their tools. These five run our business today &mdash; and the
                sites beside them are ones we designed, built and still run.
              </p>
            </div>

            <div className="sys">
              <div className="sys-list">
                {SYSTEMS.map(([name, body, href]) => (
                  <div className="sys-row" key={name}>
                    <i className="sys-dot" />
                    <h3 className="h3">{href ? <Link href={href}>{name}</Link> : name}</h3>
                    <p>{body}</p>
                  </div>
                ))}
              </div>

              <div className="sys-proof">
                {SYSTEM_PROOF.map(([file, name]) => (
                  <figure key={file}>
                    {/* 295px rendered from 1280px sources. */}
                    <Image
                      src={`/work/websites/${file}`}
                      alt={`${name} website`}
                      width={880}
                      height={605}
                      sizes="(max-width: 700px) 70vw, 320px"
                    />
                    <figcaption className="tag">{name}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ ACADEMY ════════════════════════════════════════════════ */}
        <section className="sec" id="academy">
          <div className="wrap">
            <div className="sec-head sec-head--split">
              <div>
                <div className="eyebrow">
                  <span className="tag">06 &mdash; Academy</span>
                </div>
                <h2 className="d" data-mask style={{ fontSize: 'clamp(1.9rem, 3.6vw, 3.2rem)' }}>
                  We also teach it.
                </h2>
              </div>
              <span className="tag">
                New batch every month &middot; {COURSES.length} courses
              </span>
            </div>

            <div className="acad">
              <div className="acad-grid">
                {COURSES.map(([slug, title]) => (
                  <Link className="acad-row" key={slug} href={`/academy/${slug}`}>
                    <span>{title}</span>
                    <span className="tag">{pricing?.courses[slug]?.current ?? 'See pricing'}</span>
                  </Link>
                ))}
              </div>
              {pricing?.bundle && (
                <div className="acad-bundle">
                  <p>
                    Creator Program &mdash; all {COURSES.length}, {pricing.bundle.current}
                    {pricing.earlyBirdActive && ' early-bird'}
                  </p>
                  <Link className="link-u" href="/academy">
                    See the curriculum <span aria-hidden>&rarr;</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══ CLOSING ════════════════════════════════════════════════ */}
        <section className="sec close" id="close">
          <div className="wrap">
            <h2 className="d" data-mask>
              Ready to grow your brand?
            </h2>
            <div className="close-row">
              <p className="lede" style={{ maxWidth: '32ch' }}>
                Response within 24 hours. No obligations, just ideas.
              </p>
              <Link className="btn btn--primary" href="/get-started">
                Book a strategy call
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </SiteShell>
  );
}
