import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eqValue, fake, payloadOf } from '@/test-utils/fake-supabase';
import type { IntakeLead } from '@/lib/sales/types';

const mocks = vi.hoisted(() => ({
  send: vi.fn(async (_event: unknown) => undefined),
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: mocks.send } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));

import { ingestLead } from '../ingest';
import { IntakeError } from '../../errors';

const consent = { basis: 'inbound_request' as const, evidence: {}, capturedAt: '2026-09-15T04:00:00.000Z' };
const intake = (overrides: Partial<IntakeLead> = {}): IntakeLead => ({ source: 'website_form', consent, ...overrides });

beforeEach(() => {
  fake.reset();
  mocks.send.mockClear();
});

describe('ingestLead', () => {
  it('rejects a lead with no email and no phone', async () => {
    await expect(ingestLead(intake({ name: 'Nobody' }))).rejects.toBeInstanceOf(IntakeError);
    expect(fake.calls).toHaveLength(0);
  });

  it('creates, scores, records and announces a new lead', async () => {
    fake.respond((call) => (call.table === 'leads' && call.op === 'select' ? { data: [], error: null } : { data: null, error: null }));

    const result = await ingestLead(intake({ name: 'Priya', email: 'Priya@X.com', message: 'Need SEO' }));

    expect(result.created).toBe(true);
    expect(result.leadId).toMatch(/^lead_/);
    const [insert] = fake.callsTo('leads', 'insert');
    expect(payloadOf(insert)).toMatchObject({ email: 'priya@x.com', source: 'website_form', lead_score: 50, status: 'new' });
    expect(fake.callsTo('lead_activities', 'insert').map((c) => payloadOf(c).type)).toContain('form_submitted');
    expect(mocks.send).toHaveBeenCalledWith({
      name: 'sales/lead.created',
      data: { leadId: result.leadId, source: 'website_form' },
    });
  });

  it('merges a returning person into their existing lead', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select' && eqValue(call, 'email') === 'priya@x.com') {
        return { data: [{ id: 'lead_old', email: 'priya@x.com', company: null, custom_fields: {} }], error: null };
      }
      if (call.table === 'leads' && call.op === 'select') return { data: [], error: null };
      return { data: null, error: null };
    });

    const result = await ingestLead(intake({ email: 'priya@x.com', company: 'Acme' }));

    expect(result).toEqual({ leadId: 'lead_old', created: false });
    expect(fake.callsTo('leads', 'insert')).toHaveLength(0);
    const update = fake.callsTo('leads', 'update').map(payloadOf).find((p) => p.company === 'Acme');
    expect(update).toBeDefined();
    expect(mocks.send).toHaveBeenCalledWith({
      name: 'sales/lead.resubmitted',
      data: { leadId: 'lead_old', source: 'website_form' },
    });
  });

  it('never fills the email of a lead matched by phone, but records what was submitted', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select' && eqValue(call, 'phone_e164') === '+919833257659') {
        return {
          data: [{ id: 'lead_old', email: null, phone: '98332 57659', phone_e164: '+919833257659', company: null, custom_fields: {} }],
          error: null,
        };
      }
      if (call.table === 'leads' && call.op === 'select') return { data: [], error: null };
      return { data: null, error: null };
    });

    const result = await ingestLead(intake({ email: 'stranger@x.com', phone: '9833257659', company: 'Acme' }));

    expect(result).toEqual({ leadId: 'lead_old', created: false });
    const [update] = fake.callsTo('leads', 'update').map(payloadOf);
    expect(update).toMatchObject({ company: 'Acme' });
    expect(update).not.toHaveProperty('email');
    const submission = fake.callsTo('lead_activities', 'insert').map(payloadOf).find((p) => p.type === 'form_submitted');
    expect(submission?.metadata).toMatchObject({ submittedEmail: 'stranger@x.com' });
  });

  it('never fills the phone of a lead matched by email', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select' && eqValue(call, 'email') === 'priya@x.com') {
        return { data: [{ id: 'lead_old', email: 'priya@x.com', phone: null, phone_e164: null, custom_fields: {} }], error: null };
      }
      if (call.table === 'leads' && call.op === 'select') return { data: [], error: null };
      return { data: null, error: null };
    });

    await ingestLead(intake({ email: 'priya@x.com', phone: '9833257659' }));

    const [update] = fake.callsTo('leads', 'update').map(payloadOf);
    expect(update).not.toHaveProperty('phone');
    expect(update).not.toHaveProperty('phone_e164');
    const submission = fake.callsTo('lead_activities', 'insert').map(payloadOf).find((p) => p.type === 'form_submitted');
    expect(submission?.metadata).toMatchObject({ submittedPhone: '9833257659' });
  });

  it('recovers when a concurrent delivery inserted the same external lead first', async () => {
    let selects = 0;
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select') {
        selects += 1;
        return selects <= 2 ? { data: [], error: null } : { data: [{ id: 'lead_winner', custom_fields: {} }], error: null };
      }
      if (call.table === 'leads' && call.op === 'insert') return { data: null, error: { code: '23505', message: 'duplicate' } };
      return { data: null, error: null };
    });

    const result = await ingestLead(intake({ source: 'google_lead_form', externalSourceId: 'G1', email: 'p@x.com' }));
    expect(result).toEqual({ leadId: 'lead_winner', created: false });
  });
});
