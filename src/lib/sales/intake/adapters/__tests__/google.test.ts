import { describe, it, expect, afterEach } from 'vitest';
import { googleAdapter, mapGoogleLead } from '../google';
import { WebhookRejection } from '@/lib/sales/errors';

const payload = {
  lead_id: 'TeSter-123-ABCDEFGHIJKLMNOPQRSTUVWXYZ-abcdefghijklmnopqrstuvwxyz-0123456789',
  api_version: '1.0',
  form_id: 40000000000,
  campaign_id: 20000000000,
  google_key: 'secret-key',
  is_test: true,
  gcl_id: 'gclid-1',
  user_column_data: [
    { column_id: 'FULL_NAME', string_value: 'Priya Shah', column_name: 'Full Name' },
    { column_id: 'EMAIL', string_value: 'priya@example.com', column_name: 'User Email' },
    { column_id: 'PHONE_NUMBER', string_value: '+919833257659', column_name: 'User Phone' },
    { column_id: 'COMPANY_NAME', string_value: 'Acme', column_name: 'Company Name' },
    { column_id: 'monthly_budget', string_value: '₹50,000', column_name: 'What is your monthly budget?' },
  ],
};

afterEach(() => {
  delete process.env.GOOGLE_ADS_LEAD_KEY;
});

describe('mapGoogleLead', () => {
  it('maps standard columns and keeps other answers as custom fields', () => {
    const lead = mapGoogleLead(payload, new Date('2026-09-15T04:00:00.000Z'));
    expect(lead).toMatchObject({
      source: 'google_lead_form',
      externalSourceId: payload.lead_id,
      name: 'Priya Shah',
      email: 'priya@example.com',
      phone: '+919833257659',
      company: 'Acme',
      tags: ['test'],
      attribution: { utmSource: 'google', utmMedium: 'lead_form', utmCampaign: '20000000000', gclid: 'gclid-1' },
      customFields: { 'What is your monthly budget?': '₹50,000' },
    });
    expect(lead.consent.basis).toBe('inbound_request');
  });

  it('joins first and last name columns', () => {
    const lead = mapGoogleLead({
      lead_id: 'L2',
      user_column_data: [
        { column_id: 'FIRST_NAME', string_value: 'Rahul' },
        { column_id: 'LAST_NAME', string_value: 'K' },
        { column_id: 'EMAIL', string_value: 'r@x.com' },
      ],
    });
    expect(lead.name).toBe('Rahul K');
  });

  it('rejects a payload without lead_id', () => {
    expect(() => mapGoogleLead({ user_column_data: [] })).toThrow(WebhookRejection);
  });
});

describe('googleAdapter.verify', () => {
  const request = new Request('http://localhost', { method: 'POST' });

  it('accepts the configured key and rejects anything else', () => {
    process.env.GOOGLE_ADS_LEAD_KEY = 'secret-key';
    expect(googleAdapter.verify({ request, rawBody: JSON.stringify(payload) })).toBe(true);
    expect(googleAdapter.verify({ request, rawBody: JSON.stringify({ ...payload, google_key: 'wrong' }) })).toBe(false);
  });

  it('rejects when no key is configured', () => {
    expect(googleAdapter.verify({ request, rawBody: JSON.stringify(payload) })).toBe(false);
  });

  it('never logs the key', () => {
    expect(googleAdapter.redact?.(payload)).toMatchObject({ google_key: '[redacted]' });
  });
});
