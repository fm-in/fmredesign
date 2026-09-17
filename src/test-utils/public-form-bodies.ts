/**
 * Request bodies exactly as the public pages build them, for tests. Each
 * mirrors the page's own code — change it when the page changes — and goes
 * through JSON so `undefined` fields vanish the way `fetch` sends them.
 */

import { INBOUND_CONSENT_TEXT } from '@/lib/sales/consent';
import { HONEYPOT_FIELD } from '@/lib/spam-guard-field';

type Json = Record<string, unknown> & { customFields?: Record<string, unknown> };

function asSent(body: Record<string, unknown>): Json {
  return JSON.parse(JSON.stringify(body)) as Json;
}

/** src/app/contact/page.tsx `handleSubmit`, for the given form state. */
export function contactPageBody(form: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service?: string;
  budget?: string;
  message?: string;
}): Json {
  const message = form.message ?? 'We want more enquiries from Instagram.';
  return asSent({
    name: form.name,
    email: form.email,
    phone: form.phone ?? '',
    company: form.company || 'Not specified',
    projectType: form.service ? 'digital_marketing' : 'consultation',
    projectDescription: message,
    budgetRange: form.budget || 'not_disclosed',
    timeline: 'flexible',
    primaryChallenge: message,
    companySize: 'small_business',
    source: 'website_form',
    [HONEYPOT_FIELD]: '',
    attribution: undefined,
    consentText: INBOUND_CONSENT_TEXT,
    customFields: { formName: 'Contact page', service: form.service || null },
  });
}

/** src/app/get-started/page.tsx `submitForm`: the four steps' `formData`, spread, plus what the page adds. */
export function getStartedBody(form: {
  name: string;
  email: string;
  projectType: string;
  company?: string;
  timeline?: string;
}): Json {
  const formData = {
    name: form.name,
    email: form.email,
    phone: '+91 99001 12233',
    company: form.company ?? 'Iyer Studio',
    jobTitle: 'Founder',
    website: 'https://iyerstudio.example',
    projectType: form.projectType,
    projectDescription: 'We need a new site before the festive season.',
    budgetRange: '50k_100k',
    timeline: form.timeline ?? '1_month',
    primaryChallenge: 'Our site does not convert',
    companySize: 'small_business',
    industry: 'Food & Beverage',
  };
  return asSent({
    ...formData,
    source: 'website_form',
    [HONEYPOT_FIELD]: '',
    attribution: undefined,
    consentText: INBOUND_CONSENT_TEXT,
    customFields: { formName: 'Get started' },
  });
}

/** src/components/academy/ReserveSeatForm.tsx, for the given form state. */
export function reserveSeatBody(form: {
  programId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
}): Json {
  return asSent({
    programId: form.programId,
    buyerName: form.name.trim(),
    buyerEmail: form.email.trim(),
    buyerPhone: form.phone?.trim() || undefined,
    buyerCompany: form.company?.trim() || undefined,
    buyerMessage: form.message?.trim() || undefined,
    [HONEYPOT_FIELD]: '',
  });
}
