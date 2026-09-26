/**
 * FM Academy — public program detail page.
 *
 * Server-rendered with 60s revalidation + pre-rendered at build time via
 * generateStaticParams (so cold requests don't pay the Supabase hop).
 *
 * Layout:
 *   1. Hero band — eyebrow, title, lede, batch start callout, hero image
 *      (or gradient brand panel if no cover image).
 *   2. Two-column body: long-form content left, sticky pricing right.
 *   3. Mobile sticky bottom CTA bar so the price +"Book now" is always
 *      one tap away on small screens.
 */

import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  MapPin,
  BadgeCheck,
  ChevronRight,
} from 'lucide-react';
import { BrainMark } from '@/components/site/BrainMark';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { getSupabaseAdmin } from '@/lib/supabase';
import { batchSchedule, seatScarcity, BATCH_CADENCE } from '@/lib/academy/schedule';
import {
  FORMAT_LABELS,
  formatProgramPrice,
  transformProgramRow,
  type Program,
} from '@/lib/admin/academy-types';
import { ReserveSeatForm } from '@/components/academy/ReserveSeatForm';
import { OG_DEFAULTS } from '@/lib/seo';
import { SITE_URL } from '@/lib/site-url';
import { breadcrumbJsonLd, jsonLdString } from '@/lib/structured-data';

export const revalidate = 60;
// Pre-render every currently-open program at build time so the first
// request to each /academy/[slug] is a static cache hit, not a 1.9s
// Supabase round-trip. New programs added after build get on-demand
// generation (revalidate covers the 60s freshness for existing ones).
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('programs_public')
      .select('slug');
    return (data || []).map((p) => ({ slug: p.slug as string }));
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getProgramBySlug(slug: string): Promise<Program | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('programs_public')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error || !data) return null;
    return transformProgramRow(data);
  } catch (e) {
    console.error('Program detail fetch error:', e);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const p = await getProgramBySlug(slug);
  if (!p) return { title: 'Program not found — FM Academy' };
  const description = (
    p.shortDescription ||
    p.longDescription ||
    `Book your seat for ${p.title} by the Freaking Minds team.`
  ).replace(/\s+/g, ' ').trim();

  /**
   * Programme titles are author-entered and unbounded —"Freaking Minds
   * Creator Program — Full Bundle" plus the suffix plus the root template
   * rendered at 74 characters, well past where Google truncates. Drop the
   * suffix before truncating the name itself, since the name is the part a
   * searcher is actually scanning for.
   */
  const SUFFIX = ' — FM Academy';
  const MAX_PAGE_TITLE = 43; // + ' | Freaking Minds' (17) stays under 60
  let pageTitle = `${p.title}${SUFFIX}`;
  if (pageTitle.length > MAX_PAGE_TITLE) {
    pageTitle =
      p.title.length > MAX_PAGE_TITLE
        ? p.title.slice(0, MAX_PAGE_TITLE - 1).replace(/\s+\S*$/, '') + '…'
        : p.title;
  }

  return {
    // No '| Freaking Minds' here — the root layout's template appends it, and
    // restating it produced"... | Freaking Minds | Freaking Minds".
    title: pageTitle,
    // Truncated on a word boundary; Google cuts around 160 characters and a
    // shortDescription set in the admin is not length-checked anywhere.
    description:
      description.length > 158
        ? description.slice(0, 158).replace(/\s+\S*$/, '') + '…'
        : description,
    // Without this every program page inherits the root canonical of '/' and
    // tells Google it IS the home page — which all seven were doing.
    alternates: { canonical: `/academy/${slug}` },
    // Spread the defaults so a program with no cover image still shares with
    // an image instead of a blank card.
    openGraph: {
      ...OG_DEFAULTS,
      title: pageTitle,
      description,
      url: `/academy/${slug}`,
      ...(p.coverImageUrl ? { images: [{ url: p.coverImageUrl }] } : {}),
    },
  };
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const p = await getProgramBySlug(slug);
  if (!p) notFound();

  const price = formatProgramPrice(p);
  const scarcity = seatScarcity(p.seatsTotal, p.seatsTaken);
  const isSoldOut = p.seatsTotal != null && scarcity.remaining === 0;
  const schedule = batchSchedule(p.startsAt);
  const daysLeft = schedule.daysUntil ?? null;
  const buyerAmount =
    price.earlyBirdActive && p.earlyBirdPriceInr ? p.earlyBirdPriceInr : p.priceInr;
  const isBundle = p.slug === 'creator-program-full';

  /*
   * Course + breadcrumb structured data. Built only from the programme row
   * and what this page already states (in person, at the Bhopal studio);
   * optional fields are left out when the row does not have them.
   */
  const courseUrl = `${SITE_URL}/academy/${p.slug}`;
  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${courseUrl}#course`,
    name: p.title,
    description: (p.shortDescription || p.longDescription || p.title).replace(/\s+/g, ' ').trim(),
    url: courseUrl,
    ...(p.coverImageUrl ? { image: [p.coverImageUrl] } : {}),
    inLanguage: 'en-IN',
    // Named inline as well as by @id — Google's Course check wants provider.name.
    provider: { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'Freaking Minds', url: SITE_URL },
    offers: {
      '@type': 'Offer',
      category: 'Paid',
      price: buyerAmount,
      priceCurrency: p.currency || 'INR',
      url: courseUrl,
      availability:
        isSoldOut
          ? 'https://schema.org/SoldOut'
          : p.status === 'open'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
      ...(price.earlyBirdActive && p.earlyBirdUntil ? { priceValidUntil: p.earlyBirdUntil } : {}),
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Onsite',
      location: {
        '@type': 'Place',
        name: 'Freaking Minds studio',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Bhopal',
          addressRegion: 'Madhya Pradesh',
          addressCountry: 'IN',
        },
      },
      ...(p.startsAt ? { startDate: p.startsAt } : {}),
      ...(p.endsAt ? { endDate: p.endsAt } : {}),
      ...(p.instructorName ? { instructor: { '@type': 'Person', name: p.instructorName } } : {}),
    },
  };
  const breadcrumbSchema = breadcrumbJsonLd([
    { name: 'FM Academy', path: '/academy' },
    { name: p.title, path: `/academy/${p.slug}` },
  ]);

  return (
    <SiteShell>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(courseSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }}
      />
      <main id="main-content">
      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="pt-24 pb-12 md:pb-16">
        <div className="site-measure">
          <Link
            href="/academy"
            className="inline-flex items-center gap-1 text-sm text-site-muted hover:text-site-text mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to FM Academy
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {/* Was `bg-site-raised/10` behind `text-white/90`: a 10%-opacity
                    near-white fill under white text, on a bone ground. */}
                <span className="px-3 py-1 rounded-full border border-site-line text-site-accent font-medium">
                  {isBundle ? 'Creator Program — all six courses' : FORMAT_LABELS[p.format]}
                </span>
                <span className="text-site-muted inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {schedule.isUpcoming ? `Starts ${schedule.long}` : BATCH_CADENCE}
                </span>
                {daysLeft != null && daysLeft > 0 && daysLeft <= 30 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-site-line text-site-accent font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    {daysLeft} {daysLeft === 1 ? 'day' : 'days'} to go
                  </span>
                )}
              </div>

              <h1 className="text-site-h2 font-site-display font-bold text-site-text leading-[1.05]">
                {p.title}
              </h1>

              {p.shortDescription && (
                <p className="text-lg md:text-xl text-site-muted leading-relaxed max-w-xl">
                  {p.shortDescription}
                </p>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-site-muted pt-2">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> 45-day program
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> In-person · Bhopal studio
                </span>
                {p.seatsTotal != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> {p.seatsTotal} seats
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4" /> Certificate on completion
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
              {p.coverImageUrl ? (
                <div className="relative aspect-[4/3] w-full rounded-site-lg overflow-hidden">
                  <Image
                    src={p.coverImageUrl}
                    alt={p.title}
                    fill
                    className="object-cover"
                    sizes="(max-width:1024px) 100vw, 40vw"
                    priority
                  />
                </div>
              ) : (
                /* The fallback for a program with no hero image. It was
                   `bg-gradient-to-br` with no colour stops — which Tailwind
                   resolves to `background-image: none` — under `text-white`,
                   so it rendered as white text on the page ground. */
                <div className="relative aspect-[4/3] w-full rounded-site-lg overflow-hidden site-surface">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                    {/* No cover image yet, so the mascot holds the slot — one
                        per page, where the hero has no real imagery. */}
                    <BrainMark pose="teaching" width={150} className="mb-6" />
                    <div className="text-site-h3 font-site-display text-site-text mb-2 leading-tight" style={{ textAlign: 'center' }}>
                      {isBundle ? 'All six courses' : p.title}
                    </div>
                    <span className="tag">FM Academy &middot; Creator Program</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── BODY ────────────────────────────────────────────── */}
      <section className="pb-32 lg:pb-16">
        <div className="site-measure">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* ── Main column ─────────────────────────────── */}
            <div className="lg:col-span-2 space-y-10">
              {p.longDescription && (
                <div className="site-surface rounded-site-lg p-6 md:p-8">
                  <p className="text-site-text whitespace-pre-line leading-relaxed text-base md:text-lg">
                    {p.longDescription}
                  </p>
                </div>
              )}

              {p.outcomes && p.outcomes.length > 0 && (
                <SubSection title="What you&rsquo;ll be able to do">
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {p.outcomes.map((o, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-site-accent mt-0.5 shrink-0" />
                        <span className="text-site-text">{o}</span>
                      </li>
                    ))}
                  </ul>
                </SubSection>
              )}

              {p.syllabus && p.syllabus.length > 0 && (
                <SubSection title={isBundle ? 'Modules covered' : 'Syllabus'}>
                  <div className="space-y-5">
                    {p.syllabus.map((m, i) => (
                      <div
                        key={i}
                        className="border-l-2 border-site-accent pl-5 py-1"
                      >
                        <div className="flex items-baseline gap-3 flex-wrap mb-2">
                          <h3 className="font-site-sans font-semibold text-site-text text-lg">{m.title}</h3>
                          {m.durationLabel && (
                            <span className="text-xs font-medium text-site-accent bg-site-raised px-2 py-0.5 rounded-full">
                              {m.durationLabel}
                            </span>
                          )}
                        </div>
                        {m.items && m.items.length > 0 && (
                          <ul className="space-y-1.5">
                            {m.items.map((it, j) => (
                              <li key={j} className="text-sm text-site-muted flex items-start gap-2">
                                <ChevronRight className="w-3.5 h-3.5 text-site-accent mt-1 shrink-0" />
                                <span>{it}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </SubSection>
              )}

              {p.schedule && p.schedule.length > 0 && (
                <SubSection title="Schedule">
                  <div className="space-y-2">
                    {p.schedule.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <Calendar className="w-4 h-4 text-site-accent" />
                        <span className="font-medium text-site-text">
                          {s.date && new Date(s.date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short',
                          })}
                        </span>
                        {s.time && (
                          <span className="text-site-muted inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {s.time}
                          </span>
                        )}
                        {s.topic && <span className="text-site-text">— {s.topic}</span>}
                      </div>
                    ))}
                  </div>
                </SubSection>
              )}

              {p.instructorName && (
                <SubSection title="Who you&rsquo;ll learn from">
                  <div className="flex items-start gap-4">
                    {p.instructorImageUrl && (
                      <div className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 bg-site-raised">
                        <Image
                          src={p.instructorImageUrl}
                          alt={p.instructorName}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="font-site-sans font-semibold text-site-text text-lg">{p.instructorName}</h3>
                      {p.instructorBio && (
                        <p className="text-site-muted mt-2 whitespace-pre-line leading-relaxed">
                          {p.instructorBio}
                        </p>
                      )}
                    </div>
                  </div>
                </SubSection>
              )}

              {p.testimonials && p.testimonials.length > 0 && (
                <SubSection title="What past learners say">
                  <div className="space-y-5">
                    {p.testimonials.map((t, i) => (
                      <blockquote
                        key={i}
                        className="border-l-4 border-site-accent pl-5 py-2"
                      >
                        <p className="text-site-text italic text-lg leading-relaxed">
                          &ldquo;{t.quote}&rdquo;
                        </p>
                        <footer className="text-sm text-site-muted mt-3">
                          — {t.name}{t.role && `, ${t.role}`}
                        </footer>
                      </blockquote>
                    ))}
                  </div>
                </SubSection>
              )}

              {p.faq && p.faq.length > 0 && (
                <SubSection title="FAQ">
                  <div className="space-y-5">
                    {p.faq.map((f, i) => (
                      <div key={i}>
                        <h3 className="font-site-sans font-semibold text-site-text">{f.q}</h3>
                        <p className="text-site-muted mt-1.5 whitespace-pre-line leading-relaxed">
                          {f.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </SubSection>
              )}

            </div>

            {/* ── Checkout ────────────────────────────────── */}
            {/*
              ONE instance, not two. This page used to render the whole panel
              twice — a `lg:hidden` copy at the end of the content column and a
              `hidden lg:block` copy here — identical but for the seat count,
              which only the desktop copy had. They had already drifted once.

              A grid item that is static on mobile stacks after the column
              beside it, which is exactly where the mobile copy sat, so the
              duplicate bought nothing.

              A sticky block taller than the space it sticks in has its bottom
              permanently below the fold — you scroll, it stays put, and the
              submit button never arrives. Measured on a 1366x768 laptop
              (~660px of real browser viewport): the aside is 641px and only
              564px is available once stuck, so 77px of the checkout form was
              unreachable. It now scrolls its own overflow instead.
            */}
            {/* A section, not <aside>: a complementary landmark must not sit
                inside <main>. Labelled so it is still reachable as a region. */}
            <section
              id="reserve"
              aria-label="Reserve a seat"
              className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start space-y-4 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto"
            >
              <div className="site-surface rounded-site-lg p-6 space-y-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-site-muted mb-1">
                    {price.earlyBirdActive ? 'Early-bird price' : 'Program fee'}
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-site-h3 font-bold text-site-accent">{price.current}</span>
                    {price.earlyBirdActive && (
                      <span className="text-sm text-site-muted line-through">{price.original}</span>
                    )}
                  </div>
                  {price.earlyBirdActive && p.earlyBirdUntil && (
                    <p className="text-xs text-site-text mt-1.5 inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Early-bird ends {new Date(p.earlyBirdUntil).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short',
                      })}
                    </p>
                  )}
                </div>

                  <div className="flex items-start gap-3 p-3 rounded-site-md bg-site-raised">
                  <Calendar className="w-5 h-5 text-site-accent shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-semibold text-site-text">
                      {schedule.isUpcoming ? 'Batch starts' : 'Intake'}
                    </div>
                    <div className="text-site-muted">
                      {schedule.isUpcoming ? schedule.long : BATCH_CADENCE}
                    </div>
                  </div>
                </div>

                {(isSoldOut || scarcity.show) && (
                  <div className="text-sm">
                    {isSoldOut ? (
                      <p className="text-site-accent font-medium inline-flex items-center gap-1">
                        <Users className="w-4 h-4" /> Sold out
                      </p>
                    ) : (
                      <p className="text-site-text inline-flex items-center gap-1">
                        <Users className="w-4 h-4 text-site-accent" />
                        <strong className="text-site-text">{scarcity.remaining}</strong>
                        <span className="ml-1">of {p.seatsTotal} seats remaining</span>
                      </p>
                    )}
                  </div>
                )}

                {!isSoldOut ? (
                  <ReserveSeatForm
                    programId={p.id}
                    programTitle={p.title}
                    amountInr={buyerAmount}
                  />
                ) : (
                  <Link href="/contact" className="btn btn--ghost w-full">
                    Notify me of the next batch
                  </Link>
                )}

                <p className="text-xs text-site-muted">
                  Indian GST applies. Razorpay receipt issued on payment.
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* ── Mobile sticky CTA bar ─────────────────────────── */}
      {!isSoldOut && (
        <MobileStickyBar
          program={p}
          price={price.current}
          originalPrice={price.earlyBirdActive ? price.original : undefined}
        />
      )}
    </main>
      <SiteFooter />
    </SiteShell>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      {/* h2 (and h3 for the items inside): these follow the page's h1
          directly, so an h3 here skipped a level. */}
      <h2 className="text-site-h3 font-site-display font-bold text-site-text mb-5">
        {title}
      </h2>
      <div className="site-surface rounded-site-lg p-6 md:p-8">{children}</div>
    </div>
  );
}

/** The bar is an anchor to the checkout below, so it needs no amount itself. */
function MobileStickyBar({
  program,
  price,
  originalPrice,
}: {
  program: Program;
  price: string;
  originalPrice?: string;
}) {
  // The right padding keeps "Book now" clear of the chat bubble, which sits
  // over the bar's bottom-right corner (the cookie banner reserves the same
  // 88px). The bottom padding clears the home indicator on notched phones.
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-site-raised border-t border-site-line shadow-[0_-8px_24px_rgba(0,0,0,0.08)] p-3 pr-[88px] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 max-w-screen-sm">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-site-accent">{price}</span>
            {originalPrice && (
              <span className="text-xs text-site-muted line-through">{originalPrice}</span>
            )}
          </div>
          <span className="text-[11px] text-site-muted leading-none">
            {batchSchedule(program.startsAt).shortLabel}
          </span>
        </div>
        <a
          href="#reserve"
          className="ml-auto btn btn--primary inline-flex items-center gap-2 flex-shrink-0"
          aria-label={`Book a seat on ${program.title} for ${price}`}
        >
          Book now
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
