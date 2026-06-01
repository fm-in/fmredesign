/**
 * FM Academy — public program detail page.
 *
 * Rendered on the server with 60s revalidation. Surfaces every customer-
 * facing field the admin filled in: hero, outcomes, syllabus, schedule,
 * FAQ, testimonials, instructor — then a sticky "Reserve seat" panel on
 * the right with price + early-bird + seats remaining.
 *
 * Reservation flow (Phase 1): the CTA opens an embedded form modal — but
 * for simplicity we use an inline form here so there's no JS dependency
 * for the first conversion step. Submission hits /api/academy/enroll.
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

export default async function ProgramDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const p = await getProgramBySlug(slug);
  if (!p) notFound();

  const price = formatProgramPrice(p);
  const seatsRemaining =
    p.seatsTotal != null ? Math.max(0, p.seatsTotal - (p.seatsTaken || 0)) : null;
  const isSoldOut = seatsRemaining === 0;

  return (
    <V2PageWrapper>
      <section className="v2-section">
        <div className="v2-container">
          <Link
            href="/academy"
            className="inline-flex items-center gap-1 text-sm v2-text-secondary hover:v2-text-primary mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to FM Academy
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* ── Main column ────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-3 py-1 rounded-full bg-fm-magenta-50 text-fm-magenta-700 font-medium">
                    {FORMAT_LABELS[p.format]}
                  </span>
                  {p.startsAt && (
                    <span className="v2-text-secondary inline-flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Starts {new Date(p.startsAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                <h1 className="font-display text-4xl md:text-5xl font-bold v2-text-primary leading-tight">
                  {p.title}
                </h1>

                {p.shortDescription && (
                  <p className="text-xl v2-text-secondary leading-relaxed">{p.shortDescription}</p>
                )}
              </div>

              {p.coverImageUrl && (
                <div className="relative h-80 w-full rounded-2xl overflow-hidden">
                  <Image
                    src={p.coverImageUrl}
                    alt={p.title}
                    fill
                    className="object-cover"
                    sizes="(max-width:1024px) 100vw, 66vw"
                    priority
                  />
                </div>
              )}

              {p.longDescription && (
                <div className="v2-paper rounded-2xl p-8">
                  <p className="text-fm-neutral-700 whitespace-pre-line leading-relaxed">
                    {p.longDescription}
                  </p>
                </div>
              )}

              {p.outcomes && p.outcomes.length > 0 && (
                <SubSection title="What you'll be able to do">
                  <ul className="space-y-3">
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
                <SubSection title="Syllabus">
                  <div className="space-y-4">
                    {p.syllabus.map((m, i) => (
                      <div key={i} className="border-l-2 border-fm-magenta-500 pl-4">
                        <h4 className="font-semibold text-fm-neutral-900">{m.title}</h4>
                        {m.durationLabel && (
                          <p className="text-xs text-fm-neutral-500 mt-1">{m.durationLabel}</p>
                        )}
                        {m.items && m.items.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {m.items.map((it, j) => (
                              <li key={j} className="text-sm text-fm-neutral-600">• {it}</li>
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
                <SubSection title="Your instructor">
                  <div className="flex items-start gap-4">
                    {p.instructorImageUrl && (
                      <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 bg-fm-neutral-100">
                        <Image
                          src={p.instructorImageUrl}
                          alt={p.instructorName}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-fm-neutral-900">{p.instructorName}</h4>
                      {p.instructorBio && (
                        <p className="text-sm text-fm-neutral-600 mt-1 whitespace-pre-line">
                          {p.instructorBio}
                        </p>
                      )}
                    </div>
                  </div>
                </SubSection>
              )}

              {p.testimonials && p.testimonials.length > 0 && (
                <SubSection title="What past learners say">
                  <div className="space-y-4">
                    {p.testimonials.map((t, i) => (
                      <blockquote
                        key={i}
                        className="border-l-4 border-fm-magenta-500 pl-4 py-2"
                      >
                        <p className="text-fm-neutral-700 italic">&ldquo;{t.quote}&rdquo;</p>
                        <footer className="text-sm text-fm-neutral-500 mt-2">
                          — {t.name}{t.role && `, ${t.role}`}
                        </footer>
                      </blockquote>
                    ))}
                  </div>
                </SubSection>
              )}

              {p.faq && p.faq.length > 0 && (
                <SubSection title="FAQ">
                  <div className="space-y-4">
                    {p.faq.map((f, i) => (
                      <div key={i}>
                        <h4 className="font-semibold text-fm-neutral-900">{f.q}</h4>
                        <p className="text-fm-neutral-600 mt-1 whitespace-pre-line">{f.a}</p>
                      </div>
                    ))}
                  </div>
                </SubSection>
              )}
            </div>

            {/* ── Sticky CTA column ─────────────────────────────── */}
            <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
              <div className="v2-paper rounded-2xl p-6 space-y-5">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-fm-magenta-700">{price.current}</span>
                    {price.earlyBirdActive && (
                      <span className="text-sm text-fm-neutral-400 line-through">{price.original}</span>
                    )}
                  </div>
                  {price.earlyBirdActive && p.earlyBirdUntil && (
                    <p className="text-xs text-amber-700 mt-1 inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Early bird until {new Date(p.earlyBirdUntil).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short',
                      })}
                    </p>
                  )}
                </div>

                {seatsRemaining != null && (
                  <div className="text-sm">
                    {isSoldOut ? (
                      <p className="text-red-700 font-medium inline-flex items-center gap-1">
                        <Users className="w-4 h-4" /> Sold out
                      </p>
                    ) : (
                      <p className="text-fm-neutral-700 inline-flex items-center gap-1">
                        <Users className="w-4 h-4 text-fm-magenta-600" />
                        <strong className="text-fm-neutral-900">{seatsRemaining}</strong> seats remaining
                      </p>
                    )}
                  </div>
                )}

                {!isSoldOut ? (
                  <ReserveSeatForm
                    programId={p.id}
                    programTitle={p.title}
                    paymentLinkUrl={p.paymentLinkUrl}
                    amountInr={
                      price.earlyBirdActive && p.earlyBirdPriceInr
                        ? p.earlyBirdPriceInr
                        : p.priceInr
                    }
                  />
                ) : (
                  <Link href="/contact" className="v2-btn v2-btn-outline w-full" style={{ textAlign: 'center' }}>
                    Notify me of the next batch
                  </Link>
                )}

                <p className="text-xs text-fm-neutral-500" style={{ textAlign: 'center' }}>
                  Indian GST applies as per government norms. Receipt issued on payment.
                </p>
              </div>

              <div className="v2-paper rounded-2xl p-5">
                <h4 className="font-semibold text-fm-neutral-900 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-fm-magenta-600" />
                  This is a {FORMAT_LABELS[p.format]}
                </h4>
                <p className="text-sm text-fm-neutral-600">
                  {p.format === 'workshop' && 'One-time, live, limited seats.'}
                  {p.format === 'cohort' && 'Multi-week, structured, learning alongside a small group.'}
                  {p.format === 'self_paced' && 'Pre-recorded — start anytime, finish at your pace.'}
                  {p.format === 'one_on_one' && 'Private 1:1 sessions with a strategist.'}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </V2PageWrapper>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-xl font-bold v2-text-primary mb-4">{title}</h3>
      <div className="v2-paper rounded-2xl p-6">{children}</div>
    </div>
  );
}
