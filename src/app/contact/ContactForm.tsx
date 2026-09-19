'use client';

import { useState } from 'react';
import { Honeypot, SelectField, SubmitButton, TextAreaField, TextField } from '@/components/site/Field';
import { SERVICE_ENQUIRY_OPTIONS } from '@/lib/services-catalogue';
import { HONEYPOT_FIELD } from '@/lib/spam-guard-field';
import { INBOUND_CONSENT_TEXT } from '@/lib/sales/consent';
import { readFirstTouchSafely } from '@/lib/attribution';

/**
 * The contact enquiry form.
 *
 * Split out of the page so the page itself can be a server component. The
 * POST body is unchanged from the version this replaces — field for field,
 * including `attribution`, `consentText` and the honeypot — because that
 * shape is a contract with `/api/leads`, `ingestLead()` and the receipt
 * renderer, not a detail of the form.
 *
 * What did change: every input is now labelled with a real `<label for>`
 * rather than a placeholder, and errors are announced.
 */

const BUDGET_RANGES = [
  'Not sure yet',
  '₹25,000 - ₹50,000',
  '₹50,000 - ₹1,00,000',
  '₹1,00,000 - ₹2,50,000',
  '₹2,50,000+',
] as const;

/** The API's enum. The labels above are what a person reads. */
const BUDGET_VALUES: Record<string, string> = {
  'Not sure yet': 'not_disclosed',
  '₹25,000 - ₹50,000': '25k_50k',
  '₹50,000 - ₹1,00,000': '50k_100k',
  '₹1,00,000 - ₹2,50,000': '100k_250k',
  '₹2,50,000+': 'over_250k',
};

const EMPTY = { name: '', email: '', phone: '', company: '', service: '', budget: '', message: '' };

export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [honeypot, setHoneypot] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const set = (key: keyof typeof EMPTY) => (event: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: event.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company || 'Not specified',
          projectType: form.service ? 'digital_marketing' : 'consultation',
          projectDescription: form.message,
          budgetRange: BUDGET_VALUES[form.budget] || 'not_disclosed',
          timeline: 'flexible',
          primaryChallenge: form.message,
          companySize: 'small_business',
          source: 'website_form',
          [HONEYPOT_FIELD]: honeypot,
          attribution: readFirstTouchSafely(),
          consentText: INBOUND_CONSENT_TEXT,
          customFields: { formName: 'Contact page', service: form.service || null },
        }),
      });
      if (!response.ok) throw new Error('Failed to submit');
      setStatus('success');
      setForm(EMPTY);
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'success') {
    return (
      <div className="site-surface" style={{ padding: 'clamp(28px, 4vw, 48px)' }}>
        <p className="tag tag--a">Message sent</p>
        <p className="d mt-5" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
          Thanks — we have it.
        </p>
        <p className="lede mt-4">
          Someone from the team will reply within 24 hours. If it is urgent, call{' '}
          <a href="tel:+919833257659" style={{ color: 'var(--site-accent)' }}>
            +91 98332 57659
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
      <Honeypot value={honeypot} onChange={setHoneypot} />

      <TextField label="Name" required value={form.name} onChange={set('name')} autoComplete="name" />
      <TextField
        label="Email"
        type="email"
        required
        value={form.email}
        onChange={set('email')}
        autoComplete="email"
      />
      <TextField label="Phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
      <TextField
        label="Company"
        value={form.company}
        onChange={set('company')}
        autoComplete="organization"
      />
      <SelectField
        label="What do you need?"
        value={form.service}
        onChange={set('service')}
        placeholder="Not sure yet"
        options={SERVICE_ENQUIRY_OPTIONS}
      />
      <SelectField
        label="Budget"
        value={form.budget}
        onChange={set('budget')}
        placeholder="Prefer not to say"
        options={BUDGET_RANGES}
      />

      <div className="sm:col-span-2">
        <TextAreaField
          label="What are you trying to move?"
          required
          rows={5}
          value={form.message}
          onChange={set('message')}
        />
      </div>

      {status === 'error' && (
        <p role="alert" className="sm:col-span-2 font-site-sans text-site-body text-site-text">
          That did not send. Try again, or email freakingmindsdigital@gmail.com directly.
        </p>
      )}

      <div className="sm:col-span-2 flex flex-wrap items-center gap-5">
        <SubmitButton busy={busy}>Send enquiry</SubmitButton>
        <p className="tag" style={{ textTransform: 'none', letterSpacing: 0 }}>
          {INBOUND_CONSENT_TEXT}
        </p>
      </div>
    </form>
  );
}
