import { describe, it, expect } from 'vitest';
import type { IntakeLead } from '@/lib/sales/types';
import {
  hasContact,
  matchKeys,
  mergeEmptyFields,
  normaliseEmail,
  normaliseIntake,
  toLeadRecord,
} from '../normalise';

const consent = { basis: 'inbound_request' as const, evidence: { form: 'contact' }, capturedAt: '2026-09-15T10:00:00.000Z' };

function intake(overrides: Partial<IntakeLead> = {}): IntakeLead {
  return { source: 'website_form', consent, ...overrides };
}

describe('normaliseEmail', () => {
  it('lowercases and trims valid addresses', () => {
    expect(normaliseEmail('  Priya@Example.COM ')).toBe('priya@example.com');
  });
  it('drops invalid addresses', () => {
    expect(normaliseEmail('not-an-email')).toBeUndefined();
    expect(normaliseEmail('')).toBeUndefined();
  });
});

describe('normaliseIntake', () => {
  it('strips tags and collapses whitespace in single-line fields', () => {
    const lead = normaliseIntake(intake({ name: ' <b>Priya</b>   Shah ', company: 'Acme  <i>Co</i>', email: 'p@x.com' }));
    expect(lead.name).toBe('Priya Shah');
    expect(lead.company).toBe('Acme Co');
  });

  it('keeps line breaks in the message', () => {
    expect(normaliseIntake(intake({ email: 'p@x.com', message: 'Line one\nLine two' })).message).toBe('Line one\nLine two');
  });

  it('derives a name from the email when none is given', () => {
    expect(normaliseIntake(intake({ email: 'rahul.k@x.com' })).name).toBe('rahul.k');
  });

  it('computes phoneE164', () => {
    expect(normaliseIntake(intake({ phone: '98332 57659' })).phoneE164).toBe('+919833257659');
  });

  it('caps attribution values', () => {
    const lead = normaliseIntake(intake({ email: 'p@x.com', attribution: { utmCampaign: 'c'.repeat(1000) } }));
    expect(lead.attribution?.utmCampaign).toHaveLength(300);
  });
});

describe('hasContact', () => {
  it('needs an email or a phone', () => {
    expect(hasContact(normaliseIntake(intake({ name: 'No Contact' })))).toBe(false);
    expect(hasContact(normaliseIntake(intake({ phone: '9833257659' })))).toBe(true);
  });
});

describe('matchKeys', () => {
  it('orders external id, then email, then phone', () => {
    const keys = matchKeys(
      normaliseIntake(intake({ source: 'meta_lead_ads', externalSourceId: 'L1', email: 'p@x.com', phone: '9833257659' }))
    );
    expect(keys).toEqual([
      { kind: 'external', source: 'meta_lead_ads', value: 'L1' },
      { kind: 'email', value: 'p@x.com' },
      { kind: 'phone', value: '+919833257659' },
    ]);
  });
});

describe('mergeEmptyFields', () => {
  it('fills only empty columns and never overwrites', () => {
    const updates = mergeEmptyFields(
      { company: 'Acme', phone: null, website: '' },
      { company: 'Other', phone: '9833257659', website: 'acme.in', name: 'Ignored' }
    );
    expect(updates).toEqual({ phone: '9833257659', website: 'acme.in' });
  });

  it('adds new custom field keys without replacing existing ones', () => {
    const updates = mergeEmptyFields(
      { custom_fields: { budget: '50k' } },
      { custom_fields: { budget: '10k', city: 'Pune' } }
    );
    expect(updates).toEqual({ custom_fields: { budget: '50k', city: 'Pune' } });
  });
});

describe('toLeadRecord', () => {
  it('maps intake fields to columns', () => {
    const record = toLeadRecord(
      normaliseIntake(
        intake({
          name: 'Priya',
          email: 'p@x.com',
          message: 'Need SEO',
          sourceDetail: 'Contact page',
          attribution: { utmSource: 'google', gclid: 'g1' },
        })
      ),
      'lead_1',
      '2026-09-15T10:00:00.000Z'
    );
    expect(record).toMatchObject({
      id: 'lead_1',
      name: 'Priya',
      email: 'p@x.com',
      project_description: 'Need SEO',
      status: 'new',
      source: 'website_form',
      source_detail: 'Contact page',
      utm_source: 'google',
      gclid: 'g1',
      consent_basis: 'inbound_request',
      consent_evidence: { form: 'contact' },
      last_activity_at: '2026-09-15T10:00:00.000Z',
    });
  });
});
