import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { HomeMotion } from '@/components/site/HomeMotion';
import { SiteLoader } from '@/components/site/SiteLoader';
import { LetterWindow } from '@/components/site/LetterWindow';
import { ReelRow } from '@/components/site/ReelRow';
import { FilmVideo } from '@/components/site/FilmVideo';
import { CursorPreview } from '@/components/site/CursorPreview';
import { BrainMark } from '@/components/site/BrainMark';
import { CalButton } from '@/components/ui/CalButton';
import { VIDEO_WORK } from '@/lib/portfolio';
import { DEFAULT_BOOKING_LINK } from '@/lib/sales/links';
import { COMPANY_PHONE_DISPLAY, COMPANY_WHATSAPP_URL } from '@/lib/company';
import { getAcademyHomePricing } from '@/lib/academy/home-pricing';
import { getService, serviceHref } from '@/lib/services-catalogue';

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

/*
 * The hero's letter window runs six films behind the headline, as strips of
 * colour; the work row then shows four at full size, with names. There are
 * only eight films, so some appear in both — in the hero they are texture, in
 * the row they are the work. Names and categories come from the portfolio
 * list, the same one /work uses.
 */
const film = (id: (typeof VIDEO_WORK)[number]['id']) => {
  const f = VIDEO_WORK.find((v) => v.id === id)!;
  return { id: f.id, client: f.client, category: f.category };
};
const HERO_WALL = ['giovanni', 'kanha', 'renny', 'concept_studio', 'skr_group', 'astroo_apaar'] as const;
const WORK_FILMS = ['kanha', 'renny', 'skr_group', 'concept_studio'].map((id) =>
  film(id as (typeof VIDEO_WORK)[number]['id']),
);

/** Twenty marks, split across two counter-running rows. */
// File → client. The files are numbered exports, so without this map the
// wall told screen readers and search engines nothing about who the clients are.
const CLIENTS = [
  ['Asset-10', 'Wise Consultancy'],
  ['Asset-11', 'Radisson'],
  ['Asset-12', 'Jio Studios'],
  ['Asset-13', 'BNI'],
  ['Asset-14', 'Hind Wallcare'],
  ['Asset-15', 'Zuper Hotels & Resorts'],
  ['Asset-16', 'Indian Kayaking & Canoeing Association'],
  ['Asset-17', 'Uthara Print'],
  ['Asset-18', 'Dainik Bhaskar'],
  ['Asset-19', 'Bhaskar Denim'],
  ['Asset-20', 'Galaxy Enclave'],
  ['Asset-21', 'SKR Group'],
  ['Asset-22', 'Elisa'],
  ["Asset-23", "Kanha's Fun City"],
  ["Asset-24", "Kanha's Palm Springs Hotel"],
  ['Asset-25', 'Palm Suite'],
  ["Asset-26", "Aangan by Kanha's"],
  ['Asset-27', 'Giovanni Village'],
  ['Asset-28', 'Harsh Express'],
  ['Asset-29', 'Miracle Organization'],
] as const;

const LOGO_ROWS = [CLIENTS.slice(0, 10), CLIENTS.slice(10)] as const;

/** Logos we have work for: hovering one plays or shows it beside the cursor. */
const LOGO_WORK: Record<string, { still: string; clip?: string }> = {
  'Asset-27': { still: '/videos/giovanni-poster.jpg', clip: '/videos/giovanni.mp4' },
  'Asset-21': { still: '/videos/skr_group-poster.jpg', clip: '/videos/skr_group.mp4' },
  'Asset-23': { still: '/videos/kanha-poster.jpg', clip: '/videos/kanha.mp4' },
  'Asset-22': { still: '/work/services/elisa-service1.jpg' },
  'Asset-28': { still: '/work/services/harsh-service1.jpg' },
};

/** Every brand in /public/clients — the marquee shows twenty of them. One
 *  number, used by the hero line and the evidence figure alike. */
const BRAND_COUNT = 36;


// Captions say what each piece is. They used to be invented labels
// ("Elisa — product" on a Republic Day greeting). Product and promotion work
// leads; the festival posts follow.
const CAMPAIGNS = [
  ['elisa-service1', 'Elisa — Kiwi 90 product ad'],
  ['harsh-service1', 'Harsh Express — coverage campaign'],
  ['giovanni-service1', 'Giovanni Village — wedding venue'],
  ['giovanni-service5', 'Giovanni Village — venue promotion'],
  ['giovanni-service3', 'Giovanni Village — Christmas'],
  ['elisa-service3', 'Elisa — Republic Day'],
  ['harsh-service3', 'Harsh Express — Republic Day'],
  ['skr-service1', 'SKR Group — Maharashtra Day'],
  ['skr-service3', 'SKR Group — Kisan Diwas'],
  ['skr-service5', 'SKR Group — Bhai Dooj'],
] as const;

// Names come from the catalogue so the home page, /services and the footer
// cannot call the same service three different things again ("Performance
// marketing" here was "Pay-Per-Click (PPC) Advertising" on /services).
// The work each service shows under the cursor on hover — real client
// pieces, served through the image optimiser at preview size.
const PREVIEW: Record<string, string> = {
  seo: '/work/websites/restronaut_website.jpg',
  social: '/work/services/harsh-service1.jpg',
  performance: '/work/services/elisa-service1.jpg',
  branding: '/work/websites/mohdiamond_website.jpg',
  web: '/work/websites/mahua_house_website.jpg',
  content: '/videos/renny-poster.jpg',
};
const preview = (src: string) => `/_next/image?url=${encodeURIComponent(src)}&w=640&q=75`;
// Placeholders until each service has its own clip: the nearest existing film.
const PREVIEW_FILM: Record<string, string> = {
  social: 'giovanni',
  performance: 'adi',
  branding: 'concept_studio',
  content: 'renny',
};

const CAPABILITY = [
  ['seo', 'Get found. Get chosen.', 'Data-driven SEO that puts you where customers are already looking.'],
  ['social', 'Stop posting. Start connecting.', 'Thumb-stopping content that turns followers into customers.'],
  ['performance', 'Every rupee. Maximum impact.', 'Focused paid campaigns that deliver qualified leads and protect your ROI.'],
  ['branding', 'Look unforgettable.', 'Visual identities that capture attention, build trust, and make competitors jealous.'],
  ['web', 'Fast. Beautiful. Converting.', 'Responsive, conversion-first websites that work as marketing tools.'],
  ['content', 'Stories that sell.', 'From scroll-stopping videos to blogs that rank: content that drives action.'],
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
      {/* Home only, as on the live site: this is the first-visit splash, and
          the session flag it sets means it shows once per tab. */}
      <SiteLoader />
      <SiteHeader floating />
      <HomeMotion />


      <main id="main-content">
        {/* ═══ HERO ═══════════════════════════════════════════════════ */}
        {/* The letter window: six client films behind the headline, opening
            into the full wall as the visitor scrolls. */}
        <LetterWindow films={HERO_WALL} lines={['Ideas', 'that move', 'markets.']}>
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
          <p className="hero-proof">
            Radisson, Jio Studios, BNI and Dainik Bhaskar are among the {BRAND_COUNT} brands we
            have made work for.
          </p>
        </LetterWindow>

        {/* ═══ CLIENT WALL ════════════════════════════════════════════ */}
        <section className="wall" aria-label="Clients we work with">
          <CursorPreview listSelector=".wall" />
          {/* The names, once, for screen readers and search. The marquee below
              clones its logos to loop, so alt text there would be read out
              several times over. */}
          <ul className="sr-only">
            {CLIENTS.map(([file, client]) => (
              <li key={file}>{client}</li>
            ))}
          </ul>
          {LOGO_ROWS.map((row, i) => (
            <div className="mq" key={i} data-mq={i === 0 ? '1' : '-1'} aria-hidden>
              {row.map(([file, client]) => (
                // Small files, but 20 of them in two marquees. Left as plain
                // <img>: the marquee duplicates its children until a cycle
                // exceeds the viewport, and next/image's wrapper markup breaks
                // the flex measurement that duplication depends on.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={file}
                  src={`/clients/${file}.png`}
                  alt=""
                  title={client}
                  width={220}
                  height={110}
                  loading="lazy"
                  decoding="async"
                  data-preview={LOGO_WORK[file]?.still}
                  data-preview-video={LOGO_WORK[file]?.clip}
                />
              ))}
            </div>
          ))}
        </section>

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
            <ReelRow films={WORK_FILMS} />
            <p className="reel-more">
              <Link className="link-u" href="/work">
                All {VIDEO_WORK.length} films, the sites and the identities
              </Link>
            </p>
          </div>
        </section>

        {/* ═══ CAMPAIGN STRIP (native horizontal scroll) ══════════════ */}
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

            <CursorPreview listSelector=".cap" />
            <div className="cap">
              {CAPABILITY.map(([id, sub, desc], i) => {
                const name = getService(id)?.title ?? id;
                return (
                <Link
                  className="cap-row"
                  key={id}
                  href={serviceHref(id)}
                  data-preview={PREVIEW_FILM[id] ? `/videos/${PREVIEW_FILM[id]}-poster.jpg` : preview(PREVIEW[id])}
                  data-preview-video={PREVIEW_FILM[id] ? `/videos/${PREVIEW_FILM[id]}.mp4` : undefined}
                >
                  <span className="tag n">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="cap-name">{name}</span>
                    <span className="cap-sub">{sub}</span>
                  </span>
                  <span className="cap-go" aria-hidden>
                    &rarr;
                  </span>
                  <span className="cap-desc">{desc}</span>
                  {/* Phones have no hover: the row nearest mid-screen opens and plays this. */}
                  <span className="cap-media" aria-hidden>
                    {PREVIEW_FILM[id] ? (
                      <FilmVideo id={PREVIEW_FILM[id]} preload="none" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview(PREVIEW[id])} alt="" loading="lazy" decoding="async" />
                    )}
                  </span>
                </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══ EVIDENCE ═══════════════════════════════════════════════ */}
        <section className="sec sec--raised" id="evidence">
          <div className="wrap">
            <div className="sec-head sec-head--split">
              <div>
                <div className="eyebrow">
                  <span className="tag">04 &mdash; Evidence</span>
                </div>
                <h2 className="d" data-mask>
                  Why brands choose us.
                </h2>
              </div>
              <p className="lede" style={{ maxWidth: '38ch' }}>
                We don&rsquo;t chase rankings. We build growth that puts you in front of customers
                already looking for you.
              </p>
            </div>

            <div className="ev">
              <div className="ev-figs">
                <div className="ev-fig">
                  <b className="fig">{BRAND_COUNT}</b>
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
                    {/* 142px on screen. `Abhishek.png` is 813px and 812KB —
                        5.7x oversampled, and now the heaviest portrait here. */}
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

              {/* A live wall: two columns of work drifting in opposite
                  directions. Placeholder screenshots of client sites stand in
                  until there are screen recordings of the software itself. */}
              <div className="sys-wall">
                {[0, 1].map((col) => {
                  const items = SYSTEM_PROOF.filter((_, i) => i % 2 === col);
                  return (
                    <div className={`sys-col sys-col--${col}`} key={col}>
                      {/* Twice over, for a seamless loop; the copy is hidden from assistive tech. */}
                      {[items, items].map((set, copy) => (
                        <div className="sys-set" key={copy} aria-hidden={copy === 1 ? true : undefined}>
                          {set.map(([file, name]) => (
                            <figure className="sys-shot" key={file}>
                              <span className="sys-bar" aria-hidden>
                                <i />
                                <i />
                                <i />
                              </span>
                              <Image
                                src={`/work/websites/${file}`}
                                alt={copy === 0 ? `${name} website` : ''}
                                width={880}
                                height={605}
                                sizes="(max-width: 700px) 45vw, 300px"
                              />
                              <figcaption className="tag">{name}</figcaption>
                            </figure>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })}
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
        {/* The page's one ink band — it gives the scroll an ending, and puts
            every way to start in one place. */}
        <section className="sec close band-ink" id="close">
          <div className="wrap close-grid">
            <div>
              <h2 className="d" data-mask>
                Ready to grow your brand?
              </h2>
              <p className="lede" style={{ maxWidth: '36ch' }}>
                Tell us what you are trying to move, and we will tell you whether we are the right
                people for it.
              </p>
              <div className="close-row">
                <Link className="btn btn--primary" href="/get-started">
                  Book a strategy call
                </Link>
              </div>
            </div>
            <div className="close-side">
              <BrainMark pose="celebrating" width={220} className="close-mascot" style={{ ['--brain-tilt' as string]: '-5deg' }} />
              <ul className="close-ways">
                <li>
                  <span className="tag">WhatsApp</span>
                  <a href={COMPANY_WHATSAPP_URL}>{COMPANY_PHONE_DISPLAY}</a>
                </li>
                <li>
                  <span className="tag">15-minute call</span>
                  <CalButton calLink={DEFAULT_BOOKING_LINK} className="close-cal">
                    Pick a time
                  </CalButton>
                </li>
                <li>
                  <span className="tag">Reply</span>
                  <span>Within 24 hours, Mon&ndash;Sat</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </SiteShell>
  );
}
