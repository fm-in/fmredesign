/**
 * FM Academy — public listing.
 *
 * Server-rendered with 60s revalidation. Layout strategy:
 *   1. Hero with"Creator Program" framing and batch-start urgency.
 *   2. Featured Bundle card — the highest-margin product up top, with a
 *      bold"save vs individual" callout.
 *   3. Six individual course cards in a clean 3-column grid.
 *   4. Trust band reinforcing why an agency-run program > a YouTube
 *      course or an online cert.
 */

import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar, Users, Sparkles, ArrowRight, GraduationCap,
  CheckCircle2, Building2, Award,
} from 'lucide-react';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Rule } from '@/components/site/primitives';
import {
  formatProgramPrice,
  type Program,
  transformProgramRow,
} from '@/lib/admin/academy-types';
import { getSupabaseAdmin } from '@/lib/supabase';
import { BATCH_CADENCE, batchSchedule, seatScarcity, type BatchSchedule } from '@/lib/academy/schedule';

export const revalidate = 60;
export const metadata = {
  // The root layout applies the template '%s | Freaking Minds' — restating it
  // here produced"... | Freaking Minds | Freaking Minds".
  title: 'FM Academy — Marketing, Design & Video',
  // Without this the page inherits the root's canonical of '/' and declares
  // itself a duplicate of the home page.
  alternates: { canonical: '/academy' },
  description:
    'Learn digital marketing, performance ads, design, video editing and AI filmmaking in person, from the Freaking Minds agency team in Bhopal.',
};

const BUNDLE_SLUG = 'creator-program-full';

async function getOpenPrograms(): Promise<Program[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('programs_public')
      .select('*')
      .order('starts_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Academy listing fetch error:', error);
      return [];
    }
    return (data || []).map(transformProgramRow);
  } catch (e) {
    console.error('Academy listing fetch threw:', e);
    return [];
  }
}

export default async function AcademyPage() {
  const programs = await getOpenPrograms();
  const bundle = programs.find((p) => p.slug === BUNDLE_SLUG);
  const courses = programs.filter((p) => p.slug !== BUNDLE_SLUG);
  const batchStart = bundle?.startsAt || courses[0]?.startsAt;
  const schedule = batchSchedule(batchStart);
  // Derived, not hardcoded. The old copy said"Save ₹30,000" as literal text,
  // so it would have kept saying so through any price change.
  const bundleSaving = bundleSavingLabel(bundle, courses);

  if (programs.length === 0) {
    return (
      <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <section className="py-site-section">
          <div className="site-measure">
            <div className="site-surface rounded-site-lg p-12 lay-measure">
              <GraduationCap className="w-12 h-12 text-site-muted mb-4" />
              <h2 className="text-site-h3 font-site-display font-bold text-site-text mb-3">
                New programs launching soon
              </h2>
              <p className="text-site-muted mb-6">
                We&apos;re putting the finishing touches on our upcoming batch.
                Drop us a line if you&apos;d like early access.
              </p>
              <Link href="/contact" className="btn btn--primary">
                Get notified
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </SiteShell>
    );
  }

  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
      {/* ── Hero ─────────────────────────────────────────────── */}
      {/* Left-aligned like every other page on the site. The centred stack
          with a pill above it was the V2 pattern; nothing else here uses it. */}
      <section className="sec" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <div className="lay-split">
            <div>
              <div className="eyebrow">
                <span className="tag tag--a">FM Academy &middot; Creator Program</span>
              </div>
              <h1 className="d" style={{ maxWidth: '20ch' }}>
                Learn the skills that build careers, brands &amp; businesses.
              </h1>
              <p className="lede" style={{ marginTop: 'clamp(22px, 2.6vw, 34px)' }}>
                Six in-person courses by the Freaking Minds team &mdash; digital marketing,
                performance ads, design, video editing, AI filmmaking and web design. Taught in
                our Bhopal studio.
              </p>
              <p className="tag" style={{ marginTop: 26 }}>
                {schedule.label}
                {schedule.isUpcoming && schedule.daysUntil != null && schedule.daysUntil <= 30 && (
                  <span className="tag--a"> &middot; {schedule.daysUntil} days to go</span>
                )}
              </p>
            </div>

            {/* The facts a prospective student checks before reading anything
                else. They were scattered down the page; the hero's right half
                was empty at every width above 900px. */}
            <dl className="acad-facts">
              {heroFacts(programs, courses, schedule).map(([term, value]) => (
                <div key={term}>
                  <dt className="tag">{term}</dt>
                  <dd className="font-site-sans text-site-body text-site-text">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Featured Bundle ──────────────────────────────────── */}
      {bundle && (
        <section className="sec" style={{ paddingBottom: 0 }}>
          <div className="wrap">
            <BundleCard p={bundle} saving={bundleSaving} />
          </div>
        </section>
      )}

      {/* ── Individual courses ──────────────────────────────── */}
      {courses.length > 0 && (
        <section className="sec">
          <div className="wrap">
            <div className="sec-head">
              <h2 className="d" data-mask style={{ fontSize: 'clamp(1.9rem, 3.6vw, 3.2rem)' }}>
                Or pick a single course.
              </h2>
              <p className="text-base md:text-lg text-site-muted leading-relaxed">
                Want to go deep on just one craft? Each course runs as its own cohort
                in the same batch — pick the one that fits where you&apos;re heading.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((p) => (
                <CourseCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Trust band ──────────────────────────────────────── */}
      <section className="sec">
        <div className="wrap">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TrustItem
              icon={<Building2 className="w-6 h-6" />}
              title="Agency-led"
              body="Taught by the team running real brand campaigns for Indian & international clients."
            />
            <TrustItem
              icon={<Users className="w-6 h-6" />}
              title="Small batches"
              body="15-25 seats per cohort. Real attention, real feedback, real portfolio work."
            />
            <TrustItem
              icon={<Award className="w-6 h-6" />}
              title="Career-ready"
              body="Practical assignments on live briefs. You walk out with a portfolio, not just notes."
            />
          </div>
        </div>
      </section>
    </main>
      <SiteFooter />
    </SiteShell>
  );
}

/** Effective price now, honouring an open early-bird window. */
function effectivePrice(p: Program): number {
  const active =
    !!p.earlyBirdPriceInr &&
    !!p.earlyBirdUntil &&
    new Date(p.earlyBirdUntil).getTime() > Date.now();
  return active && p.earlyBirdPriceInr ? p.earlyBirdPriceInr : p.priceInr;
}

/**
 * Saving of the bundle vs the six courses bought individually, rounded down to
 * the nearest 100 so the figure can never overstate. Returns null when the
 * bundle does not actually undercut them.
 */
function bundleSavingLabel(bundle: Program | undefined, courses: Program[]): string | null {
  if (!bundle || !courses.length) return null;
  const saving = courses.reduce((n, c) => n + effectivePrice(c), 0) - effectivePrice(bundle);
  const rounded = Math.floor(saving / 100) * 100;
  if (rounded <= 0) return null;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(rounded);
}

/**
 * The hero's right column.
 *
 * Every figure is derived from the rows that were just fetched — seat counts
 * from `seats_total`, the cheapest course from its own price — so it cannot
 * drift from what the cards below say. Terms with nothing real behind them are
 * dropped rather than filled with a placeholder.
 */
function heroFacts(
  programs: Program[],
  courses: Program[],
  schedule: BatchSchedule,
): [string, string][] {
  const facts: [string, string][] = [
    ['Next batch', schedule.isUpcoming && schedule.long ? schedule.long : BATCH_CADENCE],
    ['Format', 'In person, Bhopal studio'],
    ['Courses', `${courses.length} individual, or the full program`],
  ];

  const seats = programs.map((p) => p.seatsTotal).filter((n): n is number => n != null);
  if (seats.length) {
    const low = Math.min(...seats);
    const high = Math.max(...seats);
    facts.push(['Seats per cohort', low === high ? String(low) : `${low}–${high}`]);
  }

  if (courses.length) {
    const cheapest = courses.reduce((a, b) => (effectivePrice(a) <= effectivePrice(b) ? a : b));
    facts.push(['From', formatProgramPrice(cheapest).current]);
  }

  return facts;
}

/**
 * The featured bundle.
 *
 * Rebuilt because it was invisible. The card carried `bg-gradient-to-br` with
 * no `from-`/`to-` stops, which resolves to `background-image: none` — so the
 * whole panel was transparent — and every label inside it was `text-white` or
 * `text-white/85`. Measured on the default theme: white text at 85% alpha on
 * rgb(247,244,239). The highest-margin product on the page could not be read.
 *
 * It is a raised surface with ink text now, and the price carries the accent.
 */
function BundleCard({ p, saving }: { p: Program; saving: string | null }) {
  const price = formatProgramPrice(p);
  const scarcity = seatScarcity(p.seatsTotal, p.seatsTaken);

  return (
    <Link
      href={`/academy/${p.slug}`}
      className="group block site-surface rounded-site-lg p-6 md:p-10"
    >
      <div className="lay-split">
        <div>
          <div className="eyebrow">
            <span className="tag tag--a">
              <Sparkles className="w-3.5 h-3.5 inline-block align-[-2px] mr-1.5" aria-hidden />
              Most popular &middot; all six courses
            </span>
          </div>

          <h3 className="d" style={{ fontSize: 'clamp(1.7rem, 3.2vw, 2.8rem)', marginTop: 16 }}>
            The full Creator Program
          </h3>

          <p className="mt-6 font-site-sans text-site-lead text-site-muted lay-measure">
            Everything in one batch &mdash; digital marketing, performance ads, design, video
            editing, AI filmmaking and web design.
            {saving && <> Save {saving} against buying the courses individually.</>}
          </p>

          <ul
            className="mt-8 flex flex-wrap gap-x-7 gap-y-3"
            style={{ listStyle: 'none', padding: 0, margin: '2rem 0 0' }}
          >
            {[
              'All 6 modules',
              'Single integrated certificate',
              `Small batch (${p.seatsTotal} seats)`,
            ].map((item) => (
              <li key={item} className="inline-flex items-center gap-2 font-site-sans text-site-label text-site-muted">
                <CheckCircle2 className="w-4 h-4 text-site-accent" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <Rule />
          <div className="mt-6">
            <span className="tag">{price.earlyBirdActive ? 'Early-bird price' : 'Program fee'}</span>
            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
              <span className="font-site-display text-site-h2 text-site-accent">{price.current}</span>
              {price.earlyBirdActive && (
                <span className="font-site-sans text-site-body text-site-muted line-through">
                  {price.original}
                </span>
              )}
            </div>
            {scarcity.show && (
              <p className="mt-3 inline-flex items-center gap-1.5 font-site-sans text-site-label text-site-muted">
                <Users className="w-4 h-4 text-site-accent" aria-hidden />
                {scarcity.remaining} of {p.seatsTotal} seats remaining
              </p>
            )}
          </div>

          <div className="mt-8">
            <span className="link-u">
              See the full curriculum{' '}
              <ArrowRight className="w-4 h-4 inline-block align-[-3px] transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CourseCard({ p }: { p: Program }) {
  const price = formatProgramPrice(p);
  const cardScarcity = seatScarcity(p.seatsTotal, p.seatsTaken);
  const cardSchedule = batchSchedule(p.startsAt);

  return (
    <Link
      href={`/academy/${p.slug}`}
      className="group block site-surface rounded-site-lg overflow-hidden hover:-translate-y-0.5 transition-all"
    >
      {p.coverImageUrl ? (
        <div className="relative h-44 w-full bg-site-raised">
          <Image
            src={p.coverImageUrl}
            alt={p.title}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 33vw"
          />
        </div>
      ) : (
        <div className="relative h-44 w-full bg-gradient-to-br flex items-center justify-center overflow-hidden">
          <GraduationCap className="w-14 h-14 text-site-accent opacity-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,color-mix(in srgb, var(--site-accent) 0.1500%, transparent),transparent_50%)]" />
        </div>
      )}

      <div className="p-6 space-y-3">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-site-muted inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {cardSchedule.shortLabel}
          </span>
          {cardScarcity.show && cardScarcity.remaining != null && cardScarcity.remaining <= 10 && (
            <span className="text-site-text inline-flex items-center gap-1 font-medium">
              <Users className="w-3 h-3" />
              {cardScarcity.remaining} seats left
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold text-site-text group-hover:text-site-accent transition-colors">
          {p.title}
        </h3>

        {p.shortDescription && (
          <p className="text-sm text-site-muted line-clamp-2">{p.shortDescription}</p>
        )}

        <div className="flex items-baseline gap-2 pt-3 border-t border-site-line">
          <span className="text-site-h3 font-bold text-site-accent">{price.current}</span>
          {price.earlyBirdActive && (
            <span className="text-sm text-site-muted line-through">{price.original}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-sm text-site-accent font-medium pt-1">
          Book your seat
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

function TrustItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="site-surface rounded-site-lg p-6 space-y-3">
      <div className="w-12 h-12 rounded-site-md bg-site-raised text-site-accent flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-semibold text-site-text text-lg">{title}</h3>
      <p className="text-sm text-site-muted leading-relaxed">{body}</p>
    </div>
  );
}
