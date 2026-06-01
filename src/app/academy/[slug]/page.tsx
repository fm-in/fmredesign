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
 *   3. Mobile sticky bottom CTA bar so the price + "Reserve" is always
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
  GraduationCap,
  Sparkles,
  ArrowLeft,
  MapPin,
  BadgeCheck,
  ChevronRight,
} from 'lucide-react';
import { V2PageWrapper } from '@/components/layouts/V2PageWrapper';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  FORMAT_LABELS,
  formatProgramPrice,
  transformProgramRow,
  type Program,
} from '@/lib/admin/academy-types';
import { ReserveSeatForm } from '@/components/academy/ReserveSeatForm';

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
  return {
    title: `${p.title} — FM Academy | Freaking Minds`,
    description:
      p.shortDescription ||
      p.longDescription?.slice(0, 160) ||
      `Reserve your seat for ${p.title} by the Freaking Minds team.`,
    openGraph: p.coverImageUrl ? { images: [{ url: p.coverImageUrl }] } : undefined,
  };
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 86400000) : 0;
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const p = await getProgramBySlug(slug);
  if (!p) notFound();

  const price = formatProgramPrice(p);
  const seatsRemaining =
    p.seatsTotal != null ? Math.max(0, p.seatsTotal - (p.seatsTaken || 0)) : null;
  const isSoldOut = seatsRemaining === 0;
  const daysLeft = daysUntil(p.startsAt);
  const startDateLong = p.startsAt
    ? new Date(p.startsAt).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;
  const buyerAmount =
    price.earlyBirdActive && p.earlyBirdPriceInr ? p.earlyBirdPriceInr : p.priceInr;
  const isBundle = p.slug === 'creator-program-full';

  return (
    <V2PageWrapper>
      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="pt-24 pb-12 md:pb-16">
        <div className="v2-container">
          <Link
            href="/academy"
            className="inline-flex items-center gap-1 text-sm v2-text-secondary hover:v2-text-primary mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to FM Academy
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 font-medium">
                  {isBundle ? 'Creator Program — Full Bundle' : FORMAT_LABELS[p.format]}
                </span>
                {p.startsAt && (
                  <span className="v2-text-secondary inline-flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Starts {new Date(p.startsAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                )}
                {daysLeft != null && daysLeft > 0 && daysLeft <= 30 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    {daysLeft} {daysLeft === 1 ? 'day' : 'days'} to go
                  </span>
                )}
              </div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary leading-[1.05]">
                {p.title}
              </h1>

              {p.shortDescription && (
                <p className="text-lg md:text-xl v2-text-secondary leading-relaxed max-w-xl">
                  {p.shortDescription}
                </p>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm v2-text-secondary pt-2">
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
                <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden shadow-2xl">
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
                <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-fm-magenta-700 via-fm-magenta-600 to-fm-purple-700">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_50%)]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8" style={{ textAlign: 'center' }}>
                    <GraduationCap className="w-20 h-20 mb-4 opacity-90" />
                    <div className="font-display text-3xl font-bold mb-2 leading-tight">
                      {isBundle ? 'All 6 Courses' : p.title}
                    </div>
                    <div className="text-white/80 text-sm">FM Academy &middot; Creator Program</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── BODY ────────────────────────────────────────────── */}
      <section className="pb-32 lg:pb-16">
        <div className="v2-container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* ── Main column ─────────────────────────────── */}
            <div className="lg:col-span-2 space-y-10">
              {p.longDescription && (
                <div className="v2-paper rounded-2xl p-8 md:p-10">
                  <p className="text-fm-neutral-700 whitespace-pre-line leading-relaxed text-base md:text-lg">
                    {p.longDescription}
                  </p>
                </div>
              )}

              {p.outcomes && p.outcomes.length > 0 && (
                <SubSection title="What you&rsquo;ll be able to do">
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {p.outcomes.map((o, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-fm-magenta-600 mt-0.5 shrink-0" />
                        <span className="text-fm-neutral-700">{o}</span>
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
                        className="border-l-2 border-fm-magenta-500 pl-5 py-1"
                      >
                        <div className="flex items-baseline gap-3 flex-wrap mb-2">
                          <h4 className="font-semibold text-fm-neutral-900 text-lg">{m.title}</h4>
                          {m.durationLabel && (
                            <span className="text-xs font-medium text-fm-magenta-700 bg-fm-magenta-50 px-2 py-0.5 rounded-full">
                              {m.durationLabel}
                            </span>
                          )}
                        </div>
                        {m.items && m.items.length > 0 && (
                          <ul className="space-y-1.5">
                            {m.items.map((it, j) => (
                              <li key={j} className="text-sm text-fm-neutral-600 flex items-start gap-2">
                                <ChevronRight className="w-3.5 h-3.5 text-fm-magenta-400 mt-1 shrink-0" />
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
                        <Calendar className="w-4 h-4 text-fm-magenta-600" />
                        <span className="font-medium text-fm-neutral-900">
                          {s.date && new Date(s.date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short',
                          })}
                        </span>
                        {s.time && (
                          <span className="text-fm-neutral-600 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {s.time}
                          </span>
                        )}
                        {s.topic && <span className="text-fm-neutral-700">— {s.topic}</span>}
                      </div>
                    ))}
                  </div>
                </SubSection>
              )}

              {p.instructorName && (
                <SubSection title="Who you&rsquo;ll learn from">
                  <div className="flex items-start gap-4">
                    {p.instructorImageUrl && (
                      <div className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 bg-fm-neutral-100">
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
                      <h4 className="font-semibold text-fm-neutral-900 text-lg">{p.instructorName}</h4>
                      {p.instructorBio && (
                        <p className="text-fm-neutral-600 mt-2 whitespace-pre-line leading-relaxed">
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
                        className="border-l-4 border-fm-magenta-500 pl-5 py-2"
                      >
                        <p className="text-fm-neutral-700 italic text-lg leading-relaxed">
                          &ldquo;{t.quote}&rdquo;
                        </p>
                        <footer className="text-sm text-fm-neutral-500 mt-3">
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
                        <h4 className="font-semibold text-fm-neutral-900">{f.q}</h4>
                        <p className="text-fm-neutral-600 mt-1.5 whitespace-pre-line leading-relaxed">
                          {f.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </SubSection>
              )}

              {/* ── Mobile inline reserve form ─────────────────
                  Hidden on desktop (sticky aside covers it). On mobile this
                  is where the bottom sticky bar scrolls to. */}
              {!isSoldOut && (
                <div id="reserve" className="lg:hidden v2-paper rounded-2xl p-6 space-y-5 scroll-mt-24">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-fm-neutral-500 mb-1">
                      {price.earlyBirdActive ? 'Early-bird price' : 'Program fee'}
                    </div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl font-bold text-fm-magenta-700">{price.current}</span>
                      {price.earlyBirdActive && (
                        <span className="text-sm text-fm-neutral-400 line-through">{price.original}</span>
                      )}
                    </div>
                    {price.earlyBirdActive && p.earlyBirdUntil && (
                      <p className="text-xs text-amber-700 mt-1.5 inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Early-bird ends {new Date(p.earlyBirdUntil).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short',
                        })}
                      </p>
                    )}
                  </div>

                  {startDateLong && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-fm-magenta-50">
                      <Calendar className="w-5 h-5 text-fm-magenta-600 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-semibold text-fm-neutral-900">Batch starts</div>
                        <div className="text-fm-neutral-600">{startDateLong}</div>
                      </div>
                    </div>
                  )}

                  <ReserveSeatForm
                    programId={p.id}
                    programTitle={p.title}
                    paymentLinkUrl={p.paymentLinkUrl}
                    amountInr={buyerAmount}
                  />

                  <p className="text-xs text-fm-neutral-500" style={{ textAlign: 'center' }}>
                    Indian GST applies. Razorpay receipt issued on payment.
                  </p>
                </div>
              )}
            </div>

            {/* ── Sticky CTA column (desktop only) ────────── */}
            <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start space-y-4">
              <div className="v2-paper rounded-2xl p-6 space-y-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-fm-neutral-500 mb-1">
                    {price.earlyBirdActive ? 'Early-bird price' : 'Program fee'}
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-bold text-fm-magenta-700">{price.current}</span>
                    {price.earlyBirdActive && (
                      <span className="text-sm text-fm-neutral-400 line-through">{price.original}</span>
                    )}
                  </div>
                  {price.earlyBirdActive && p.earlyBirdUntil && (
                    <p className="text-xs text-amber-700 mt-1.5 inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Early-bird ends {new Date(p.earlyBirdUntil).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short',
                      })}
                    </p>
                  )}
                </div>

                {startDateLong && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-fm-magenta-50">
                    <Calendar className="w-5 h-5 text-fm-magenta-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-semibold text-fm-neutral-900">Batch starts</div>
                      <div className="text-fm-neutral-600">{startDateLong}</div>
                    </div>
                  </div>
                )}

                {seatsRemaining != null && (
                  <div className="text-sm">
                    {isSoldOut ? (
                      <p className="text-red-700 font-medium inline-flex items-center gap-1">
                        <Users className="w-4 h-4" /> Sold out
                      </p>
                    ) : (
                      <p className="text-fm-neutral-700 inline-flex items-center gap-1">
                        <Users className="w-4 h-4 text-fm-magenta-600" />
                        <strong className="text-fm-neutral-900">{seatsRemaining}</strong>
                        <span className="ml-1">of {p.seatsTotal} seats remaining</span>
                      </p>
                    )}
                  </div>
                )}

                {!isSoldOut ? (
                  <ReserveSeatForm
                    programId={p.id}
                    programTitle={p.title}
                    paymentLinkUrl={p.paymentLinkUrl}
                    amountInr={buyerAmount}
                  />
                ) : (
                  <Link href="/contact" className="v2-btn v2-btn-outline w-full" style={{ textAlign: 'center' }}>
                    Notify me of the next batch
                  </Link>
                )}

                <p className="text-xs text-fm-neutral-500" style={{ textAlign: 'center' }}>
                  Indian GST applies. Razorpay receipt issued on payment.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Mobile sticky CTA bar ─────────────────────────── */}
      {!isSoldOut && (
        <MobileStickyBar
          program={p}
          price={price.current}
          originalPrice={price.earlyBirdActive ? price.original : undefined}
          amountInr={buyerAmount}
        />
      )}
    </V2PageWrapper>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-2xl md:text-3xl font-bold v2-text-primary mb-5">
        {title}
      </h3>
      <div className="v2-paper rounded-2xl p-6 md:p-8">{children}</div>
    </div>
  );
}

function MobileStickyBar({
  program,
  price,
  originalPrice,
  amountInr,
}: {
  program: Program;
  price: string;
  originalPrice?: string;
  amountInr: number;
}) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-fm-neutral-200 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] p-3">
      <div className="flex items-center gap-3 max-w-screen-sm mx-auto">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-fm-magenta-700">{price}</span>
            {originalPrice && (
              <span className="text-xs text-fm-neutral-400 line-through">{originalPrice}</span>
            )}
          </div>
          <span className="text-[11px] text-fm-neutral-500 leading-none">
            {program.startsAt
              ? `Starts ${new Date(program.startsAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short',
                })}`
              : 'Reserve your seat'}
          </span>
        </div>
        <a
          href="#reserve"
          className="ml-auto v2-btn v2-btn-magenta inline-flex items-center gap-2 flex-shrink-0"
          aria-label={`Reserve seat for ${program.title} at ${price}`}
        >
          Reserve
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
