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
import {
  formatProgramPrice,
  type Program,
  transformProgramRow,
} from '@/lib/admin/academy-types';
import { getSupabaseAdmin } from '@/lib/supabase';
import { batchSchedule, seatScarcity } from '@/lib/academy/schedule';

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
          <div className="eyebrow">
            <span className="tag tag--a">FM Academy &middot; Creator Program</span>
          </div>
          <h1 className="d" style={{ maxWidth: '20ch' }}>
            Learn the skills that build careers, brands &amp; businesses.
          </h1>
          <p className="lede" style={{ marginTop: 'clamp(22px, 2.6vw, 34px)' }}>
            Six in-person courses by the Freaking Minds team &mdash; digital marketing,
            performance ads, design, video editing, AI filmmaking and web design. Taught in our
            Bhopal studio.
          </p>
          <p className="tag" style={{ marginTop: 26 }}>
            {schedule.label}
            {schedule.isUpcoming && schedule.daysUntil != null && schedule.daysUntil <= 30 && (
              <span className="tag--a"> &middot; {schedule.daysUntil} days to go</span>
            )}
          </p>
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

function BundleCard({ p, saving }: { p: Program; saving: string | null }) {
  const price = formatProgramPrice(p);
  const scarcity = seatScarcity(p.seatsTotal, p.seatsTaken);

  return (
    <Link
      href={`/academy/${p.slug}`}
      className="group block relative overflow-hidden rounded-site-lg bg-gradient-to-br p-10 md:p-6 md:p-8 hover:shadow-2xl transition-shadow"
    >
      {/* glow / pattern */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.5),transparent_50%)]" />

      <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
        <div className="lg:col-span-3 space-y-5 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Most popular &middot; All 6 courses
          </div>
          <h3 className="text-site-h2 font-site-display font-bold leading-tight">
            The full Creator Program
          </h3>
          <p className="text-white/85 text-base md:text-lg leading-relaxed max-w-xl">
            Everything in one batch — digital marketing, performance ads, design,
            video editing, AI filmmaking and web design.
            {saving && <> Save {saving} vs buying the courses individually.</>}
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80 pt-2">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> All 6 modules
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Single integrated certificate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Small batch ({p.seatsTotal} seats)
            </span>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4 lg:text-right">
          <div className="space-y-1">
            <div className="text-white/70 text-xs uppercase tracking-wider font-semibold">
              {price.earlyBirdActive ? 'Early-bird price' : 'Program fee'}
            </div>
            <div className="flex items-baseline gap-3 lg:justify-end">
              <span className="text-site-h2 font-bold text-white">{price.current}</span>
              {price.earlyBirdActive && (
                <span className="text-white/60 line-through text-lg">{price.original}</span>
              )}
            </div>
            {scarcity.show && (
              <div className="text-site-accent text-sm font-medium inline-flex items-center gap-1 lg:justify-end">
                <Users className="w-4 h-4" />
                {scarcity.remaining} of {p.seatsTotal} seats remaining
              </div>
            )}
          </div>

          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-site-accent font-semibold group-hover:translate-x-1 transition-transform">
            See the full curriculum
            <ArrowRight className="w-4 h-4" />
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
      className="group block site-surface rounded-site-lg overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all"
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
