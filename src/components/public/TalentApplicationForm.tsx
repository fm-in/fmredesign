'use client';

/**
 * The CreativeMinds application.
 *
 * Was four steps and thirty-five fields, of which a portfolio link was not
 * one — on a marketplace whose entire pitch is "portfolio-reviewed talent".
 * It required a rate card instead: a min AND a max across hourly, project and
 * retainer, at step four of four.
 *
 * That form selected for patience rather than talent. Someone good, with a
 * full pipeline, reaches a demand to name an hourly rate for a company they
 * have never worked with and closes the tab. Naming your price before you
 * know the work is what you do when you need the work.
 *
 * So: two steps, and the portfolio is the one thing that is mandatory beyond
 * being contactable. Pricing stays — the pool is shared with other businesses
 * and a profile nobody can filter by budget is a profile nobody browses — but
 * it is asked as a band, in two taps, after they have shown their work.
 *
 * Everything cut from here (city, state, languages, tools, subcategories,
 * per-model rates, notice period) is onboarding for someone who is in, not a
 * gate for someone applying. It belongs in the portal, where completeness
 * earns better placement in the pool.
 */

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { HONEYPOT_FIELD } from '@/lib/spam-guard-field';
import {
  TALENT_CATEGORIES,
  type TalentApplication,
  type TalentCategory,
} from '@/lib/admin/talent-types';
import { COUNTRIES, DEFAULT_COUNTRY, localeFor } from '@/lib/talent/locale';
import {
  bandsFor,
  findBand,
  PRICING_MODELS,
  toPricingInfo,
  type PricingModel,
} from '@/lib/talent/pricing-bands';

interface TalentApplicationFormProps {
  /**
   * `honeypot` carries the decoy field's value. `POST /api/talent` reads it
   * from the top level of the body, so it cannot travel inside `application`.
   */
  onSubmit: (application: TalentApplication, honeypot: string) => Promise<void>;
  onCancel: () => void;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

const CATEGORY_IDS = Object.keys(TALENT_CATEGORIES) as TalentCategory[];

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Accepts a bare domain too: people paste "behance.net/priya" as often as a full URL. */
function isUsableLink(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return url.hostname.includes('.');
  } catch {
    return false;
  }
}

function normaliseLink(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

export function TalentApplicationForm({ onSubmit, onCancel }: TalentApplicationFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  /*
   * The decoy. `POST /api/talent` has always checked for it; this form never
   * rendered one, so the check read `undefined` and could never fire.
   */
  const [honeypot, setHoneypot] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [category, setCategory] = useState<TalentCategory | ''>('');
  const [portfolio, setPortfolio] = useState('');
  const [bio, setBio] = useState('');

  const [model, setModel] = useState<PricingModel | ''>('');
  const [bandId, setBandId] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');

  const locale = localeFor(country);

  // A guess, shown in an editable field. Failure leaves the default in place.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/geo');
        const json = await res.json();
        if (!cancelled && typeof json?.country === 'string') setCountry(json.country);
      } catch {
        // Keep the default.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The bands differ per currency, so a country change invalidates the choice.
  useEffect(() => {
    setBandId('');
  }, [country, model]);

  function validateStep1(): boolean {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = 'Your name, please';
    if (!email.trim()) next.email = 'We reply by email';
    else if (!isValidEmail(email)) next.email = 'That does not look like an email';
    if (!phone.trim()) next.phone = 'A number we can reach you on';
    if (!category) next.category = 'Pick the closest one';
    if (!portfolio.trim()) next.portfolio = 'A link to your work — this is what we review';
    else if (!isUsableLink(portfolio)) next.portfolio = 'That does not look like a link';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateStep2(): boolean {
    const next: Record<string, string> = {};
    if (!model) next.model = 'How do you usually charge?';
    if (!bandId) next.band = 'Pick the range you usually work in';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validateStep2()) return;
    const band = model ? findBand(model, locale.currency, bandId) : null;
    if (!model || !band) return;

    setStatus('submitting');
    setSubmitError('');

    /*
     * The stored shape is unchanged, so the admin grid and the public profile
     * need no edits — they already read every field defensively. What this
     * form no longer collects is written as empty rather than omitted, so
     * nothing downstream meets an undefined where it expected an object.
     */
    const application = {
      personalInfo: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: `${locale.dialCode} ${phone.trim()}`.trim(),
        location: { city: '', state: '', country: locale.name },
        bio: bio.trim(),
        languages: [],
      },
      professionalDetails: {
        category,
        subcategories: [],
        skills: [],
        tools: [],
        certifications: [],
        education: [],
        workExperience: [],
      },
      portfolioLinks: { websiteUrl: normaliseLink(portfolio), workSampleUrls: [] },
      socialMedia: {},
      availability: { hoursPerWeek: Number(hoursPerWeek) || 0 },
      preferences: {},
      pricing: { ...toPricingInfo(model, band), currency: locale.currency },
    } as unknown as TalentApplication;

    try {
      await onSubmit(application, honeypot);
      setStatus('success');
    } catch (err) {
      console.error('Error submitting application:', err);
      setStatus('error');
      setSubmitError('Could not send that. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-fm-neutral-200 bg-white p-10">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-fm-neutral-900">That&rsquo;s in.</h2>
        <p className="text-fm-neutral-600">
          We read every portfolio ourselves, and you&rsquo;ll hear from us within 48 hours &mdash;
          either way. Check your email for a confirmation.
        </p>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-fm-neutral-300 px-4 py-3 text-base text-fm-neutral-900 placeholder:text-fm-neutral-400 focus:border-fm-magenta-500 focus:outline-none focus:ring-2 focus:ring-fm-magenta-100';
  const errorClass = 'mt-1.5 text-sm text-fm-magenta-700';

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-1.5 flex-grow rounded-full bg-fm-magenta-600" />
        <div className={`h-1.5 flex-grow rounded-full ${step === 2 ? 'bg-fm-magenta-600' : 'bg-fm-neutral-200'}`} />
        <span className="shrink-0 text-sm text-fm-neutral-500">Step {step} of 2</span>
      </div>

      <div className="rounded-2xl border border-fm-neutral-200 bg-white p-6 sm:p-8">
        {step === 1 ? (
          <>
            <h2 className="mb-1 text-2xl font-bold text-fm-neutral-900">You, and your work</h2>
            <p className="mb-7 text-fm-neutral-600">Your portfolio is what we actually review.</p>

            <div className="space-y-5">
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-fm-neutral-700">Name</label>
                <input id="fullName" className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                {errors.fullName && <p className={errorClass}>{errors.fullName}</p>}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-fm-neutral-700">Email</label>
                  <input id="email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  {errors.email && <p className={errorClass}>{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-fm-neutral-700">Country</label>
                  <select id="country" className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-fm-neutral-700">Phone</label>
                <div className="flex gap-2">
                  <span className="flex items-center rounded-lg border border-fm-neutral-300 bg-fm-neutral-50 px-3 text-base text-fm-neutral-600">{locale.dialCode}</span>
                  <input id="phone" type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel-national" />
                </div>
                {errors.phone && <p className={errorClass}>{errors.phone}</p>}
              </div>

              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-fm-neutral-700">What do you do?</legend>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCategory(id)}
                      className={`min-h-[44px] rounded-full border px-4 py-2 text-sm transition-colors ${
                        category === id
                          ? 'border-fm-magenta-600 bg-fm-magenta-600 text-white'
                          : 'border-fm-neutral-300 text-fm-neutral-700 hover:border-fm-neutral-400'
                      }`}
                    >
                      {TALENT_CATEGORIES[id].label}
                    </button>
                  ))}
                </div>
                {errors.category && <p className={errorClass}>{errors.category}</p>}
              </fieldset>

              <div>
                <label htmlFor="portfolio" className="mb-1.5 block text-sm font-medium text-fm-neutral-700">Portfolio link</label>
                <input id="portfolio" className={inputClass} value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="behance.net/you, your site, a Drive folder" />
                {errors.portfolio && <p className={errorClass}>{errors.portfolio}</p>}
              </div>

              <div>
                <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-fm-neutral-700">
                  One line about your work <span className="font-normal text-fm-neutral-400">(optional)</span>
                </label>
                <input id="bio" className={inputClass} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="I shoot food and interiors." />
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-1 text-2xl font-bold text-fm-neutral-900">How you work</h2>
            <p className="mb-7 text-fm-neutral-600">
              A guide so clients can find you &mdash; not a quote. You price every job yourself.
            </p>

            <div className="space-y-7">
              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-fm-neutral-700">How do you usually charge?</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PRICING_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModel(m.id)}
                      className={`min-h-[44px] rounded-lg border px-4 py-3 text-left transition-colors ${
                        model === m.id
                          ? 'border-fm-magenta-600 bg-fm-magenta-50'
                          : 'border-fm-neutral-300 hover:border-fm-neutral-400'
                      }`}
                    >
                      <span className="block text-sm font-medium text-fm-neutral-900">{m.label}</span>
                      <span className="block text-xs text-fm-neutral-500">{m.hint}</span>
                    </button>
                  ))}
                </div>
                {errors.model && <p className={errorClass}>{errors.model}</p>}
              </fieldset>

              {model && (
                <fieldset>
                  <legend className="mb-2 block text-sm font-medium text-fm-neutral-700">What range do you usually work in?</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {bandsFor(model, locale.currency).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBandId(b.id)}
                        className={`min-h-[44px] rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                          bandId === b.id
                            ? 'border-fm-magenta-600 bg-fm-magenta-50 font-medium text-fm-neutral-900'
                            : 'border-fm-neutral-300 text-fm-neutral-700 hover:border-fm-neutral-400'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                  {errors.band && <p className={errorClass}>{errors.band}</p>}
                </fieldset>
              )}

              <div>
                <label htmlFor="hours" className="mb-1.5 block text-sm font-medium text-fm-neutral-700">
                  Hours a week you have spare <span className="font-normal text-fm-neutral-400">(optional)</span>
                </label>
                <input id="hours" type="number" min={0} max={80} className={inputClass} value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} placeholder="10" />
              </div>
            </div>
          </>
        )}

        {/*
          The decoy. Clipped rather than `display:none`: a bot that parses
          styles skips anything obviously hidden but fills a field it can still
          see in the DOM. `tabIndex={-1}` and `aria-hidden` keep it off the
          keyboard path and out of screen readers; `autoComplete="off"` stops a
          browser filling it in and failing a real person's submission.
        */}
        <div aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
          <label htmlFor={HONEYPOT_FIELD}>Company website</label>
          <input
            id={HONEYPOT_FIELD}
            name={HONEYPOT_FIELD}
            type="text"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {submitError && <p className="mt-6 text-sm text-fm-magenta-700">{submitError}</p>}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-fm-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={step === 1 ? onCancel : () => setStep(1)}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-fm-neutral-300 px-6 py-3 text-sm text-fm-neutral-700 transition-colors hover:bg-fm-neutral-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step === 1 ? (
            <button
              type="button"
              onClick={() => { if (validateStep1()) { setErrors({}); setStep(2); } }}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-fm-magenta-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-fm-magenta-700"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={status === 'submitting'}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-fm-magenta-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-fm-magenta-700 disabled:opacity-60"
            >
              {status === 'submitting' && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === 'submitting' ? 'Sending…' : 'Send application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
