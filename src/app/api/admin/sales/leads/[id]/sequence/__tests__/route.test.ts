import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fake, payloadOf } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';
import type { LeadRow } from '@/lib/sales/types';

const mocks = vi.hoisted(() => ({
  user: { id: 'u-mgr', name: 'Maya', role: 'manager', permissions: ['sales.read', 'sales.write'] },
  send: vi.fn<(event: unknown) => Promise<unknown>>(async () => undefined),
}));

vi.mock('@/lib/admin-auth-middleware', () => ({
  requirePermission: vi.fn(async () => ({ user: mocks.user })),
}));
vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: mocks.send } }));

import { POST } from '../route';

const context = { params: Promise.resolve({ id: 'lead_1' }) };

function postBody(body: unknown) {
  return new NextRequest('http://localhost/api/admin/sales/leads/lead_1/sequence', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Wires the fake Supabase client for a lead with the given overrides.
 * `suppressed` controls every `suppression_list` lookup; `automationEnabled`
 * controls the `admin_settings` row.
 */
function respond(
  options: { lead?: Partial<LeadRow>; suppressed?: boolean; automationEnabled?: boolean; lastStartedAt?: string | null } = {}
) {
  const { lead: leadOverrides = {}, suppressed = false, automationEnabled = true, lastStartedAt = null } = options;
  fake.respond((call) => {
    if (call.table === 'leads' && call.op === 'select') return { data: leadRow({ owner_id: null, ...leadOverrides }), error: null };
    if (call.table === 'leads' && call.op === 'update') return { data: [{ id: 'lead_1' }], error: null };
    if (call.table === 'suppression_list') return { data: suppressed ? [{ id: 'sup_1' }] : [], error: null };
    if (call.table === 'admin_settings') return { data: { sales: { automationEnabled } }, error: null };
    if (call.table === 'lead_activities' && call.op === 'select') {
      return { data: lastStartedAt ? [{ occurred_at: lastStartedAt }] : [], error: null };
    }
    if (call.table === 'lead_activities') return { data: null, error: null };
    return { data: null, error: null };
  });
}

beforeEach(() => {
  fake.reset();
  mocks.send.mockClear();
});

describe('POST /api/admin/sales/leads/[id]/sequence — stop (unchanged)', () => {
  it('stops the active sequence and returns { stopped }', async () => {
    respond({ lead: { sequence_status: 'active' } });

    const res = await POST(postBody({ action: 'stop' }), context);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({ stopped: true });
    expect(fake.callsTo('leads', 'update').map(payloadOf)).toContainEqual({
      sequence_status: 'stopped',
      sequence_stop_reason: 'manual',
    });
  });

  it('hides another person\'s lead from a manager (404) on stop, as before', async () => {
    respond({ lead: { owner_id: 'someone-else' } });
    const res = await POST(postBody({ action: 'stop' }), context);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/admin/sales/leads/[id]/sequence — start refusals', () => {
  it('refuses a lead with no email address', async () => {
    respond({ lead: { email: null } });
    const res = await POST(postBody({ action: 'start', sequenceKey: 'enquiry-v1' }), context);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/no email address/i);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('refuses a suppressed address', async () => {
    respond({ suppressed: true });
    const res = await POST(postBody({ action: 'start', sequenceKey: 'enquiry-v1' }), context);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/do-not-contact/i);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('refuses a lead with no consent basis', async () => {
    respond({ lead: { consent_basis: 'none' } });
    const res = await POST(postBody({ action: 'start', sequenceKey: 'enquiry-v1' }), context);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/consent/i);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('refuses a lead that already had a sequence, even a stopped one', async () => {
    respond({ lead: { sequence_status: 'stopped' } });
    const res = await POST(postBody({ action: 'start', sequenceKey: 'enquiry-v1' }), context);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/already had a follow-up sequence/i);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('refuses when automation is switched off', async () => {
    respond({ automationEnabled: false });
    const res = await POST(postBody({ action: 'start', sequenceKey: 'enquiry-v1' }), context);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/automation is switched off/i);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('rejects an unknown sequenceKey at the schema, before touching the database', async () => {
    const res = await POST(postBody({ action: 'start', sequenceKey: 'not-a-real-sequence' }), context);
    expect(res.status).toBe(400);
    expect(fake.calls).toHaveLength(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('refuses an ad-platform test lead', async () => {
    respond({ lead: { source: 'google_lead_form', tags: ['test'] } });
    const res = await POST(postBody({ action: 'start', sequenceKey: 'ad-lead-v1' }), context);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('This is a test lead from an ad platform, so follow-ups are switched off for it.');
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('refuses a lead that booked a call directly', async () => {
    respond({ lead: { source: 'cal_booking' } });
    const res = await POST(postBody({ action: 'start', sequenceKey: 'enquiry-v1' }), context);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("This lead booked a call directly, so there's no follow-up sequence to run.");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("404s for a lead a manager may not touch, exactly like stop", async () => {
    respond({ lead: { owner_id: 'someone-else' } });
    const res = await POST(postBody({ action: 'start', sequenceKey: 'enquiry-v1' }), context);
    expect(res.status).toBe(404);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/sales/leads/[id]/sequence — start success', () => {
  it('sends sales/sequence.start with the chosen key and records who started it', async () => {
    respond({ lead: { sequence_status: null } });

    const res = await POST(postBody({ action: 'start', sequenceKey: 'brief-v1' }), context);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toMatchObject({ started: true, sequenceKey: 'brief-v1' });

    // No fixed event id: a retry after a start that never enrolled must not be deduplicated away.
    expect(mocks.send).toHaveBeenCalledWith({
      name: 'sales/sequence.start',
      data: { leadId: 'lead_1', sequenceKey: 'brief-v1' },
    });

    const activityCall = fake.callsTo('lead_activities', 'insert')[0];
    expect(activityCall).toBeDefined();
    expect(payloadOf(activityCall)).toMatchObject({
      lead_id: 'lead_1',
      type: 'sequence_started',
      actor_id: 'u-mgr',
      actor_name: 'Maya',
      metadata: { sequenceKey: 'brief-v1' },
    });
  });

  it('accepts every key in the registry', async () => {
    for (const key of ['brief-v1', 'enquiry-v1', 'ad-lead-v1', 'scorecard-v1']) {
      respond({ lead: { sequence_status: null } });
      const res = await POST(postBody({ action: 'start', sequenceKey: key }), context);
      expect(res.status).toBe(200);
    }
  });
});

describe('POST /api/admin/sales/leads/[id]/sequence — start failure', () => {
  it('returns 503 and records no activity when the start event cannot be queued', async () => {
    respond({ lead: { sequence_status: null } });
    mocks.send.mockRejectedValueOnce(new Error('Inngest unreachable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await POST(postBody({ action: 'start', sequenceKey: 'brief-v1' }), context);

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("Couldn't start follow-ups right now. Try again in a minute.");
    expect(fake.callsTo('lead_activities', 'insert')).toHaveLength(0);
    consoleError.mockRestore();
  });

  it('records the sequence_started activity only after the event is queued', async () => {
    respond({ lead: { sequence_status: null } });
    let activitiesWhenSent = -1;
    mocks.send.mockImplementationOnce(async () => {
      activitiesWhenSent = fake.callsTo('lead_activities', 'insert').length;
      return undefined;
    });

    await POST(postBody({ action: 'start', sequenceKey: 'brief-v1' }), context);

    expect(activitiesWhenSent).toBe(0);
    expect(fake.callsTo('lead_activities', 'insert')).toHaveLength(1);
  });
});

describe('POST /api/admin/sales/leads/[id]/sequence — a start already in flight', () => {
  const NOW = new Date('2026-09-17T06:00:00.000Z');
  const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('refuses with 409 and sends nothing while a start from the last ten minutes has not enrolled', async () => {
    respond({ lead: { sequence_status: null }, lastStartedAt: minutesAgo(4) });

    const res = await POST(postBody({ action: 'start', sequenceKey: 'brief-v1' }), context);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('Follow-ups are already starting for this lead. Give it a minute, then refresh.');
    expect(mocks.send).not.toHaveBeenCalled();
    expect(fake.callsTo('lead_activities', 'insert')).toHaveLength(0);
  });

  it('looks up only sequence_started activities for this lead', async () => {
    respond({ lead: { sequence_status: null }, lastStartedAt: minutesAgo(4) });
    await POST(postBody({ action: 'start', sequenceKey: 'brief-v1' }), context);

    const lookup = fake.callsTo('lead_activities', 'select')[0];
    expect(lookup?.filters).toContainEqual({ method: 'eq', args: ['lead_id', 'lead_1'] });
    expect(lookup?.filters).toContainEqual({ method: 'eq', args: ['type', 'sequence_started'] });
  });

  it('allows a retry once the window has passed, and sends a fresh event', async () => {
    respond({ lead: { sequence_status: null }, lastStartedAt: minutesAgo(11) });

    const res = await POST(postBody({ action: 'start', sequenceKey: 'brief-v1' }), context);

    expect(res.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith({ name: 'sales/sequence.start', data: { leadId: 'lead_1', sequenceKey: 'brief-v1' } });
    expect(fake.callsTo('lead_activities', 'insert')).toHaveLength(1);
  });

  it('allows the retry exactly when the clock reaches ten minutes', async () => {
    respond({ lead: { sequence_status: null }, lastStartedAt: NOW.toISOString() });

    vi.setSystemTime(new Date(NOW.getTime() + 9 * 60_000 + 59_000));
    expect((await POST(postBody({ action: 'start', sequenceKey: 'brief-v1' }), context)).status).toBe(409);

    vi.setSystemTime(new Date(NOW.getTime() + 10 * 60_000));
    expect((await POST(postBody({ action: 'start', sequenceKey: 'brief-v1' }), context)).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it('keeps the seven start refusals ahead of the in-flight check', async () => {
    respond({ lead: { sequence_status: null }, automationEnabled: false, lastStartedAt: minutesAgo(2) });
    const res = await POST(postBody({ action: 'start', sequenceKey: 'brief-v1' }), context);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/automation is switched off/i);
  });

  it('returns 503 and sends nothing when the in-flight lookup fails', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select') return { data: leadRow({ owner_id: null }), error: null };
      if (call.table === 'suppression_list') return { data: [], error: null };
      if (call.table === 'admin_settings') return { data: { sales: { automationEnabled: true } }, error: null };
      if (call.table === 'lead_activities' && call.op === 'select') return { data: null, error: { message: 'timeout' } };
      return { data: null, error: null };
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await POST(postBody({ action: 'start', sequenceKey: 'brief-v1' }), context);

    expect(res.status).toBe(503);
    expect(mocks.send).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
