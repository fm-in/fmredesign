/**
 * FM Academy — public listing.
 *
 * Server component, fetches the open programs at request time (with 60s
 * revalidation in the API route). Renders cards grouped roughly by what
 * matters most to a buyer: upcoming first, then self-paced / 1:1.
 *
 * Visual language matches the rest of the marketing site (V2PageWrapper).
 */

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, Sparkles, ArrowRight, GraduationCap } from 'lucide-react';
import { V2PageWrapper } from '@/components/layouts/V2PageWrapper';
import {
  FORMAT_LABELS,
  formatProgramPrice,
  type Program,
} from '@/lib/admin/academy-types';
import { getSupabaseAdmin } from '@/lib/supabase';
import { transformProgramRow } from '@/lib/admin/academy-types';

export const revalidate = 60;
export const metadata = {
  title: 'FM Academy — Workshops, Cohorts & Courses | Freaking Minds',
  description:
    'Learn the marketing playbooks we use with our clients. Workshops, multi-week cohorts, and self-paced courses by the Freaking Minds team.',
};

async function getOpenPrograms(): Promise<Program[]> {
  // Server-side direct read — same source the public API uses, but skips
  // an unnecessary HTTP hop when we're rendering on the server anyway.
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

function ProgramCard({ p }: { p: Program }) {
  const price = formatProgramPrice(p);
  const seatsRemaining =
    p.seatsTotal != null ? Math.max(0, p.seatsTotal - (p.seatsTaken || 0)) : null;

  return (
    <Link
      href={`/academy/${p.slug}`}
      className="group block v2-paper rounded-2xl overflow-hidden hover:shadow-xl transition-shadow"
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
        <div className="h-44 w-full bg-gradient-to-br from-fm-magenta-100 to-fm-purple-100 flex items-center justify-center">
          <GraduationCap className="w-12 h-12 text-fm-magenta-600 opacity-60" />
        </div>
      )}

      <div className="p-6 space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-fm-magenta-50 text-fm-magenta-700 font-medium">
            {FORMAT_LABELS[p.format]}
          </span>
          {p.startsAt && (
            <span className="text-fm-neutral-500 inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(p.startsAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short',
              })}
            </span>
          )}
          {seatsRemaining != null && seatsRemaining > 0 && seatsRemaining <= 10 && (
            <span className="text-amber-700 inline-flex items-center gap-1">
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

        <div className="flex items-baseline gap-2 pt-2">
          <span className="text-2xl font-bold text-fm-magenta-700">{price.current}</span>
          {price.earlyBirdActive && (
            <>
              <span className="text-sm text-fm-neutral-400 line-through">{price.original}</span>
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Early bird
              </span>
            </>
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

export default async function AcademyPage() {
  const programs = await getOpenPrograms();

  // Group by format for the section breakdown, but keep "Upcoming live"
  // (workshops + cohorts with a start date) at the top — that's where
  // urgency and revenue live for Phase 1.
  const upcoming = programs.filter(
    (p) =>
      (p.format === 'workshop' || p.format === 'cohort') &&
      p.startsAt &&
      new Date(p.startsAt).getTime() > Date.now(),
  );
  const selfPaced = programs.filter((p) => p.format === 'self_paced');
  const oneOnOne = programs.filter((p) => p.format === 'one_on_one');
  const other = programs.filter((p) => !upcoming.includes(p) && !selfPaced.includes(p) && !oneOnOne.includes(p));

  return (
    <V2PageWrapper>
      <section className="v2-section">
        <div className="v2-container">
          <div className="max-w-3xl" style={{ textAlign: 'center', margin: '0 auto 64px' }}>
            <div className="v2-badge v2-badge-glass mb-6 inline-flex">
              <GraduationCap className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">FM Academy</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-6 leading-tight">
              Learn the playbooks <span className="v2-accent">we run with clients</span>.
            </h1>
            <p className="text-lg md:text-xl v2-text-secondary leading-relaxed">
              Workshops, cohorts and self-paced courses by the Freaking Minds team —
              the exact systems we use to grow brands, taught by the people who built them.
            </p>
          </div>

          {programs.length === 0 ? (
            <div className="v2-paper rounded-3xl p-12" style={{ textAlign: 'center' }}>
              <GraduationCap className="w-12 h-12 text-fm-neutral-400 mx-auto mb-4" />
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-3">
                New programs launching soon
              </h2>
              <p className="text-fm-neutral-600 mb-6 max-w-lg mx-auto">
                We&apos;re putting the finishing touches on our first workshops. Drop us
                a line if you&apos;d like early access.
              </p>
              <Link href="/contact" className="v2-btn v2-btn-magenta">
                Get notified
              </Link>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <Section title="Upcoming live programs" programs={upcoming} />
              )}
              {selfPaced.length > 0 && (
                <Section title="Self-paced courses" programs={selfPaced} />
              )}
              {oneOnOne.length > 0 && (
                <Section title="1:1 strategy calls" programs={oneOnOne} />
              )}
              {other.length > 0 && <Section title="More" programs={other} />}
            </>
          )}
        </div>
      </section>
    </V2PageWrapper>
  );
}

function Section({ title, programs }: { title: string; programs: Program[] }) {
  return (
    <div className="mb-16">
      <h2 className="font-display text-2xl md:text-3xl font-bold v2-text-primary mb-8">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((p) => (
          <ProgramCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
