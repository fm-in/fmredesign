import { describe, it, expect, afterEach } from 'vitest';
import { connectorAdapter, mapConnectorLead } from '../connector';
import { WebhookRejection } from '@/lib/sales/errors';

afterEach(() => {
  delete process.env.LEAD_CONNECTOR_SECRET;
});

describe('connectorAdapter.verify', () => {
  it('requires the bearer secret', () => {
    process.env.LEAD_CONNECTOR_SECRET = 'connector-secret';
    const good = new Request('http://localhost', { method: 'POST', headers: { authorization: 'Bearer connector-secret' } });
    const bad = new Request('http://localhost', { method: 'POST', headers: { authorization: 'Bearer nope' } });
    expect(connectorAdapter.verify({ request: good, rawBody: '{}' })).toBe(true);
    expect(connectorAdapter.verify({ request: bad, rawBody: '{}' })).toBe(false);
  });
});

describe('mapConnectorLead', () => {
  it('namespaces the external id by platform', () => {
    const lead = mapConnectorLead({
      platform: 'LinkedIn',
      externalId: 'abc',
      name: 'Priya',
      email: 'p@x.com',
      campaign: 'Q4 Growth',
      formName: 'Audit offer',
    });
    expect(lead).toMatchObject({
      source: 'connector',
      externalSourceId: 'linkedin:abc',
      sourceDetail: 'linkedin · Audit offer',
      attribution: { utmSource: 'linkedin', utmCampaign: 'Q4 Growth' },
    });
    expect(connectorAdapter.describe({ platform: 'LinkedIn', externalId: 'abc' }).externalId).toBe('linkedin:abc');
  });

  it('stores the posted campaign under custom_fields.connectorCampaign', () => {
    const lead = mapConnectorLead({ platform: 'quora', email: 'p@x.com', campaign: '  Growth   audit ' });
    expect(lead.customFields).toEqual({ platform: 'quora', connectorCampaign: 'Growth audit' });
  });

  it('always sets connectorCampaign, as null when no campaign was posted, so a merge can never fill it', () => {
    expect(mapConnectorLead({ platform: 'quora', email: 'p@x.com' }).customFields).toEqual({ platform: 'quora', connectorCampaign: null });
    expect(mapConnectorLead({ platform: 'quora', email: 'p@x.com', campaign: '   ' }).customFields).toEqual({
      platform: 'quora',
      connectorCampaign: null,
    });
  });

  it('rejects a payload without a platform', () => {
    expect(() => mapConnectorLead({ email: 'p@x.com' })).toThrow(WebhookRejection);
  });
});
