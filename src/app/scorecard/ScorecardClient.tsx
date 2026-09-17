'use client';

/**
 * Marketing health scorecard — interaction layer.
 *
 * Flow: intro -> one question per screen -> score reveal -> email -> full
 * report. The score is computed locally so the reveal is instant; the server
 * recomputes it from the same answers on submit and that result is what gets
 * stored and rendered in the report.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2, RotateCcw } from 'lucide-react';
import { QUESTIONS, DIMENSIONS } from '@/lib/scorecard/questions';
import { scoreScorecard, BAND_LABELS } from '@/lib/scorecard/scoring';
import type { AnswerMap, Band, ScorecardResult } from '@/lib/scorecard/types';
import { HONEYPOT_FIELD } from '@/lib/spam-guard-field';

type Phase = 'intro' | 'quiz' | 'score' | 'report';

/**
 * Band colours. A diagnostic has to be readable at a glance, so these carry
 * honest semantic meaning rather than brand magenta — a weak score shown in
 * the brand colour reads as decoration instead of a warning.
 */
const BAND_STYLE: Record<Band, { text: string; bar: string; ring: string }> = {
  at_risk: { text: 'text-rose-600', bar: 'bg-rose-500', ring: 'text-rose-500' },
  patchy: { text: 'text-amber-600', bar: 'bg-amber-500', ring: 'text-amber-500' },
  solid: { text: 'text-sky-600', bar: 'bg-sky-500', ring: 'text-sky-500' },
  strong: { text: 'text-emerald-600', bar: 'bg-emerald-500', ring: 'text-emerald-500' },
};

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-fm-neutral-200 bg-white text-fm-neutral-900 text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent disabled:opacity-50';

export default function ScorecardClient() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverResult, setServerResult] = useState<ScorecardResult | null>(null);

  // Local preview of the result. Replaced by the server's own calculation
  // once submitted — the two agree, but the stored one is authoritative.
  const localResult = useMemo(() => scoreScorecard(answers), [answers]);
  const result = serverResult ?? localResult;

  const question = QUESTIONS[index];
  const progress = Math.round((index / QUESTIONS.length) * 100);

  function choose(value: string) {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    // Small pause so the selection is visibly registered before moving on.
    window.setTimeout(() => {
      if (index + 1 < QUESTIONS.length) setIndex(index + 1);
      else setPhase('score');
    }, 180);
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setServerResult(null);
    setError(null);
    setPhase('intro');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company: company || undefined,
          answers,
          [HONEYPOT_FIELD]: honeypot,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.error || 'Something went wrong. Please try again.');
        return;
      }
      setServerResult(json.data.result as ScorecardResult);
      setPhase('report');
    } catch {
      setError('Could not reach the server. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="v2-container v2-container-narrow v2-section">
      {/* ------------------------------------------------------------ intro */}
      {phase === 'intro' && (
        <div className="v2-paper rounded-3xl p-8 md:p-12" style={{ textAlign: 'center' }}>
          <div className="v2-badge v2-badge-outline mb-6 inline-flex">
            <span className="text-fm-magenta-600">Free · 2 minutes · No sign-up to start</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-fm-neutral-900 mb-6 leading-tight">
            How healthy is your <span className="text-fm-magenta-600">marketing</span>?
          </h1>
          <p className="text-fm-neutral-600 text-base md:text-lg mb-4 max-w-xl mx-auto leading-relaxed">
            Eleven questions about how you actually run things — not what you wish you were
            doing. You get a score out of 100, the area costing you the most, and what to do
            about it.
          </p>
          <p className="text-fm-neutral-500 text-sm mb-8 max-w-xl mx-auto">
            Most of the advice you will get back is work you can do yourself.
          </p>
          <button onClick={() => setPhase('quiz')} className="v2-btn v2-btn-magenta">
            Start the scorecard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- quiz */}
      {phase === 'quiz' && question && (
        <div className="v2-paper rounded-3xl p-6 md:p-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-fm-neutral-500">
              Question {index + 1} of {QUESTIONS.length}
            </span>
            {index > 0 && (
              <button
                onClick={() => setIndex(index - 1)}
                className="text-xs text-fm-neutral-500 hover:text-fm-magenta-600 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
          </div>

          <div
            className="h-1 w-full bg-fm-neutral-100 rounded-full mb-8 overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-fm-magenta-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <fieldset>
            <legend className="font-display text-xl md:text-2xl font-bold text-fm-neutral-900 mb-2 leading-snug">
              {question.prompt}
            </legend>
            {question.hint && (
              <p className="text-sm text-fm-neutral-500 mb-6">{question.hint}</p>
            )}
            {!question.hint && <div className="mb-6" />}

            <div className="space-y-3">
              {question.options.map((option) => {
                const selected = answers[question.id] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => choose(option.value)}
                    aria-pressed={selected}
                    className={[
                      'w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200',
                      'flex items-center justify-between gap-3',
                      selected
                        ? 'border-fm-magenta-600 bg-fm-magenta-50 text-fm-neutral-900'
                        : 'border-fm-neutral-200 hover:border-fm-magenta-300 hover:bg-fm-neutral-50 text-fm-neutral-700',
                    ].join(' ')}
                  >
                    <span className="text-sm md:text-base">{option.label}</span>
                    {selected && (
                      <Check className="w-4 h-4 text-fm-magenta-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}

      {/* ------------------------------------------------------------ score */}
      {phase === 'score' && (
        <div className="space-y-6">
          <div className="v2-paper rounded-3xl p-8 md:p-12" style={{ textAlign: 'center' }}>
            <p className="text-xs uppercase tracking-widest text-fm-neutral-500 mb-4">
              Your marketing health score
            </p>
            <div className="flex items-baseline justify-center gap-1 mb-3">
              <span
                className={`font-display text-6xl md:text-7xl font-bold ${BAND_STYLE[result.band].text}`}
              >
                {result.overall}
              </span>
              <span className="text-2xl text-fm-neutral-400 font-medium">/100</span>
            </div>
            <p className={`text-lg font-semibold mb-8 ${BAND_STYLE[result.band].text}`}>
              {BAND_LABELS[result.band]}
            </p>

            {result.dimensions[0] && (
              <div className="border-t border-fm-neutral-100 pt-6 max-w-lg mx-auto">
                <p className="text-xs uppercase tracking-widest text-fm-neutral-500 mb-2">
                  Costing you the most
                </p>
                <p className="font-display text-xl font-bold text-fm-neutral-900 mb-3">
                  {result.dimensions[0].label} — {result.dimensions[0].score}/100
                </p>
                <p className="text-sm text-fm-neutral-600 leading-relaxed">
                  {result.dimensions[0].recommendation}
                </p>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------- email */}
          <div className="v2-paper rounded-3xl p-6 md:p-10">
            <h2 className="font-display text-xl md:text-2xl font-bold text-fm-neutral-900 mb-2">
              See all six areas
            </h2>
            <p className="text-sm text-fm-neutral-600 mb-6">
              The full breakdown, with what to do about each one. We will email you a copy so
              you have it to hand.
            </p>

            <form onSubmit={submit} className="space-y-3">
              {/*
                Honeypot. Hidden from sighted users and from screen readers, and
                removed from the tab order, so no human can reach it — anything
                that fills it is automated. Inline styles rather than a class so
                a bot parsing class names cannot trivially detect it.
              */}
              <input
                type="text"
                name={HONEYPOT_FIELD}
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0,0,0,0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              />
              <input
                type="text"
                className={inputCls}
                placeholder="Your name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                disabled={submitting}
              />
              <input
                type="email"
                className={inputCls}
                placeholder="Email *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={submitting}
              />
              <input
                type="text"
                className={inputCls}
                placeholder="Business name (optional)"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                autoComplete="organization"
                disabled={submitting}
              />

              {error && (
                <p className="text-sm text-rose-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="v2-btn v2-btn-magenta w-full inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Preparing your report
                  </>
                ) : (
                  <>
                    Show me the full report <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-xs text-fm-neutral-500" style={{ textAlign: 'center' }}>
                No newsletter, no sales sequence. We will email the report and that is it.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- report */}
      {phase === 'report' && (
        <div className="space-y-6">
          <div className="v2-paper rounded-3xl p-8 md:p-10" style={{ textAlign: 'center' }}>
            <p className="text-xs uppercase tracking-widest text-fm-neutral-500 mb-3">
              Your marketing health score
            </p>
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span
                className={`font-display text-5xl md:text-6xl font-bold ${BAND_STYLE[result.band].text}`}
              >
                {result.overall}
              </span>
              <span className="text-xl text-fm-neutral-400 font-medium">/100</span>
            </div>
            <p className={`font-semibold ${BAND_STYLE[result.band].text}`}>
              {BAND_LABELS[result.band]}
            </p>
          </div>

          {result.dimensions.map((dimension, position) => {
            const meta = DIMENSIONS.find((d) => d.id === dimension.id);
            const style = BAND_STYLE[dimension.band];
            return (
              <div key={dimension.id} className="v2-paper rounded-2xl p-6 md:p-8">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <h3 className="font-display text-lg font-bold text-fm-neutral-900">
                    {position === 0 && (
                      <span className="text-xs font-sans font-semibold uppercase tracking-widest text-fm-magenta-600 block mb-1">
                        Fix this first
                      </span>
                    )}
                    {dimension.label}
                  </h3>
                  <span className={`text-2xl font-bold shrink-0 ${style.text}`}>
                    {dimension.score}
                  </span>
                </div>

                {meta && (
                  <p className="text-xs text-fm-neutral-500 mb-3">{meta.description}</p>
                )}

                <div className="h-1.5 w-full bg-fm-neutral-100 rounded-full mb-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${style.bar}`}
                    style={{ width: `${dimension.score}%` }}
                  />
                </div>

                <p className="text-sm text-fm-neutral-600 leading-relaxed">
                  {dimension.recommendation}
                </p>
              </div>
            );
          })}

          <div className="v2-paper rounded-3xl p-8 md:p-10" style={{ textAlign: 'center' }}>
            <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-3">
              Want a hand with any of it?
            </h2>
            <p className="text-fm-neutral-600 text-sm mb-6 max-w-md mx-auto">
              Most of the above you can do yourself. If you would rather not, that is what we
              do — no obligation either way.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/get-started" className="v2-btn v2-btn-magenta">
                Talk to us
              </Link>
              <button onClick={restart} className="v2-btn v2-btn-outline inline-flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Start again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
