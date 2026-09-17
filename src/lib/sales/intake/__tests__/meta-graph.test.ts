import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fake, eqValue } from '@/test-utils/fake-supabase';

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/social/token-crypto', () => ({ decryptToken: (value: string) => `decrypted:${value}` }));

import { getPageAccessToken, mapMetaLead } from '../meta-graph';
import { WebhookRejection } from '../../errors';

beforeEach(() => fake.reset());

describe('mapMetaLead', () => {
  it('maps standard fields and keeps custom questions', () => {
    const lead = mapMetaLead(
      {
        id: '444',
        created_time: '2026-09-15T04:00:00+0000',
        ad_name: 'SEO audit offer',
        campaign_name: 'Pune SMB Sept',
        form_id: '555',
        platform: 'ig',
        field_data: [
          { name: 'full_name', values: ['Priya Shah'] },
          { name: 'email', values: ['priya@example.com'] },
          { name: 'phone_number', values: ['+919833257659'] },
          { name: 'what_is_your_monthly_marketing_budget?', values: ['₹50,000–₹1,00,000'] },
        ],
      },
      '1234567890',
      new Date('2026-09-15T04:00:00.000Z')
    );

    expect(lead).toMatchObject({
      source: 'meta_lead_ads',
      externalSourceId: '444',
      name: 'Priya Shah',
      email: 'priya@example.com',
      phone: '+919833257659',
      sourceDetail: 'SEO audit offer',
      attribution: { utmSource: 'instagram', utmMedium: 'lead_ads', utmCampaign: 'Pune SMB Sept' },
      customFields: { 'what_is_your_monthly_marketing_budget?': '₹50,000–₹1,00,000' },
    });
    expect(lead.consent.evidence).toMatchObject({ platform: 'meta', pageId: '1234567890', formId: '555' });
  });

  it('rejects a lead without an id', () => {
    expect(() => mapMetaLead({ field_data: [] }, '1')).toThrow(WebhookRejection);
  });
});

describe('getPageAccessToken', () => {
  it('decrypts the stored page token, filtering by page_id and is_active', async () => {
    fake.respond(() => ({ data: { access_token: 'enc' }, error: null }));
    await expect(getPageAccessToken('1234567890')).resolves.toBe('decrypted:enc');

    const call = fake.callsTo('social_accounts', 'select')[0];
    expect(eqValue(call, 'page_id')).toBe('1234567890');
    expect(eqValue(call, 'is_active')).toBe(true);
  });

  it('rejects when the page is not connected', async () => {
    fake.respond(() => ({ data: null, error: null }));
    await expect(getPageAccessToken('1234567890')).rejects.toBeInstanceOf(WebhookRejection);
  });
});
