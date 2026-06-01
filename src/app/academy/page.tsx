/**
 * FM Academy — public listing.
 *
 * Server-rendered with 60s revalidation. Layout strategy:
 *   1. Hero with "Creator Program" framing and batch-start urgency.
 *   2. Featured Bundle card — the highest-margin product up top, with a
 *      bold "save vs individual" callout.
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
import { V2PageWrapper } from '@/components/layouts/V2PageWrapper';
import {
  formatProgramPrice,
  type Program,
  transformProgramRow,
} from '@/lib/admin/academy-types';
import { getSupabaseAdmin } from '@/lib/supabase';

export const revalidate = 60;
export const metadata = {
  title: 'FM Academy — Creator Program | Freaking Minds',
  description:
    'Learn digital marketing, performance ads, design, video editing, AI filmmaking and web design — in person, from the Freaking Minds team. New batch starts 5 June 2026.',
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

function formatStartDate(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 86400000) : 0;
}

export default async function AcademyPage() {
  const programs = await getOpenPrograms();
  const bundle = programs.find((p) => p.slug === BUNDLE_SLUG);
  const courses = programs.filter((p) => p.slug !== BUNDLE_SLUG);
  const batchStart = bundle?.startsAt || courses[0]?.startsAt;
  const startDateStr = formatStartDate(batchStart);
  const daysLeft = daysUntil(batchStart);

  if (programs.length === 0) {
    return (
      <V2PageWrapper>
        <section className="v2-section">
          <div className="v2-container">
            <div className="v2-paper rounded-3xl p-12 max-w-2xl mx-auto" style={{ textAlign: 'center' }}>
              <GraduationCap className="w-12 h-12 text-fm-neutral-400 mx-auto mb-4" />
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-3">
                New programs launching soon
              </h2>
              <p className="text-fm-neutral-600 mb-6">
                We&apos;re putting the finishing touches on our upcoming batch.
                Drop us a line if you&apos;d like early access.
              </p>
              <Link href="/contact" className="v2-btn v2-btn-magenta">
                Get notified
              </Link>
            </div>
          </div>
        </section>
      </V2PageWrapper>
    );
  }

  return (
    <V2PageWrapper>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="v2-section pt-24">
        <div className="v2-container">
          <div className="max-w-4xl mx-auto" style={{ textAlign: 'center' }}>
            <div className="v2-badge v2-badge-glass mb-6 inline-flex">
              <GraduationCap className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">FM Academy &middot; Creator Program</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-bold v2-text-primary mb-6 leading-[1.05]">
              Learn the skills that build <span className="v2-accent">careers, brands & businesses</span>.
            </h1>
            <p className="text-lg md:text-xl v2-text-secondary leading-relaxed max-w-2xl mx-auto mb-8">
              Six in-person courses by the Freaking Minds team — digital marketing,
              performance ads, design, video editing, AI filmmaking and web design.
              Taught in our Bhopal studio.
            </p>

            {startDateStr && (
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-amber-50 border border-amber-200">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span className="text-sm font-semibold text-amber-900">
                  New batch starts {startDateStr}
                  {daysLeft != null && daysLeft > 0 && daysLeft <= 30 && (
                    <span className="text-amber-700 font-normal"> &middot; {daysLeft} days to go</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Featured Bundle ──────────────────────────────────── */}
      {bundle && (
        <section className="py-12">
          <div className="v2-container">
            <BundleCard p={bundle} />
          </div>
        </section>
      )}

      {/* ── Individual courses ──────────────────────────────── */}
      {courses.length > 0 && (
        <section className="py-12">
          <div className="v2-container">
            <div className="max-w-3xl mx-auto mb-10" style={{ textAlign: 'center' }}>
              <h2 className="font-display text-3xl md:text-4xl font-bold v2-text-primary mb-4">
                Or pick a single course
              </h2>
              <p className="text-base md:text-lg v2-text-secondary leading-relaxed">
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
      <section className="py-16">
        <div className="v2-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
    </V2PageWrapper>
  );
}

function BundleCard({ p }: { p: Program }) {
  const price = formatProgramPrice(p);
  const seatsRemaining =
    p.seatsTotal != null ? Math.max(0, p.seatsTotal - (p.seatsTaken || 0)) : null;

  return (
    <Link
      href={`/academy/${p.slug}`}
      className="group block relative overflow-hidden rounded-3xl bg-gradient-to-br from-fm-magenta-700 via-fm-magenta-600 to-fm-purple-700 p-10 md:p-14 hover:shadow-2xl transition-shadow"
    >
      {/* glow / pattern */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.5),transparent_50%)]" />

      <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
        <div className="lg:col-span-3 space-y-5 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Most popular &middot; All 6 courses
          </div>
          <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            The full Creator Program
          </h3>
          <p className="text-white/85 text-base md:text-lg leading-relaxed max-w-xl">
            Everything in one batch — digital marketing, performance ads, design,
            video editing, AI filmmaking and web design. Save ₹30,000 vs buying
            the courses individually.
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
              <span className="text-4xl md:text-5xl font-bold text-white">{price.current}</span>
              {price.earlyBirdActive && (
                <span className="text-white/60 line-through text-lg">{price.original}</span>
              )}
            </div>
            {seatsRemaining != null && seatsRemaining > 0 && (
              <div className="text-amber-200 text-sm font-medium inline-flex items-center gap-1 lg:justify-end">
                <Users className="w-4 h-4" />
                {seatsRemaining} of {p.seatsTotal} seats remaining
              </div>
            )}
          </div>

          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-fm-magenta-700 font-semibold group-hover:translate-x-1 transition-transform">
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
  const seatsRemaining =
    p.seatsTotal != null ? Math.max(0, p.seatsTotal - (p.seatsTaken || 0)) : null;
  const startStr = p.startsAt
    ? new Date(p.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null;

  return (
    <Link
      href={`/academy/${p.slug}`}
      className="group block v2-paper rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all"
    >
      {p.coverImageUrl ? (
        <div className="relative h-44 w-full bg-fm-neutral-100">
          <Image
            src={p.coverImageUrl}
            alt={p.title}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 33vw"
          />
        </div>
      ) : (
        <div className="relative h-44 w-full bg-gradient-to-br from-fm-magenta-100 via-fm-magenta-50 to-fm-purple-100 flex items-center justify-center overflow-hidden">
          <GraduationCap className="w-14 h-14 text-fm-magenta-600 opacity-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(201,50,93,0.15),transparent_50%)]" />
        </div>
      )}

      <div className="p-6 space-y-3">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {startStr && (
            <span className="text-fm-neutral-500 inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Starts {startStr}
            </span>
          )}
          {seatsRemaining != null && seatsRemaining > 0 && seatsRemaining <= 10 && (
            <span className="text-amber-700 inline-flex items-center gap-1 font-medium">
              <Users className="w-3 h-3" />
              {seatsRemaining} seats left
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold text-fm-neutral-900 group-hover:text-fm-magenta-700 transition-colors">
          {p.title}
        </h3>

        {p.shortDescription && (
          <p className="text-sm text-fm-neutral-600 line-clamp-2">{p.shortDescription}</p>
        )}

        <div className="flex items-baseline gap-2 pt-3 border-t border-fm-neutral-100">
          <span className="text-2xl font-bold text-fm-magenta-700">{price.current}</span>
          {price.earlyBirdActive && (
            <span className="text-sm text-fm-neutral-400 line-through">{price.original}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-sm text-fm-magenta-700 font-medium pt-1">
          Reserve your seat
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

function TrustItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="v2-paper rounded-2xl p-6 space-y-3">
      <div className="w-12 h-12 rounded-xl bg-fm-magenta-50 text-fm-magenta-600 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-semibold text-fm-neutral-900 text-lg">{title}</h3>
      <p className="text-sm text-fm-neutral-600 leading-relaxed">{body}</p>
    </div>
  );
}
