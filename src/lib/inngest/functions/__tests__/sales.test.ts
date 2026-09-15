import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fake, payloadOf } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';
import type { LeadRow } from '@/lib/sales/types';

interface FakeStep {
  run: <T>(...args: [string, () => Promise<T> | T]) => Promise<T>;
  sendEvent: (...args: [string, unknown]) => Promise<void>;
}
type CapturedHandler = (ctx: { event: { data: Record<string, unknown> }; step: FakeStep }) => Promise<unknown>;
interface CapturedFunction {
  config: { id: string; onFailure?: unknown };
  handler: CapturedHandler;
}

const mocks = vi.hoisted(() => ({
  functions: new Map<string, CapturedFunction>(),
  loadLead: vi.fn<(leadId: string) => Promise<LeadRow | null>>(),
  loadOwner: vi.fn(async () => null),
  assignOwner: vi.fn(async () => null),
  generateLeadBrief: vi.fn(async () => ({ brief: 'Priya from Acme wants SEO help.', draft: 'Hi Priya, could we talk today?', aiGenerated: false })),
  recordActivity: vi.fn(async () => 'act_1'),
  createTask: vi.fn(async () => 'task_1'),
  hasOpenTask: vi.fn(async () => false),
  notifyAdmins: vi.fn(async () => undefined),
}));

// Capture each function's config and handler instead of registering it with Inngest.
vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: vi.fn(async () => undefined),
    createFunction: (config: CapturedFunction['config'], ...rest: [unknown, CapturedHandler]) => {
      mocks.functions.set(config.id, { config, handler: rest[1] });
      return config;
    },
  },
}));
vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));
vi.mock('@/lib/sales/lead-store', () => ({ loadLead: mocks.loadLead, loadOwner: mocks.loadOwner }));
vi.mock('@/lib/sales/assignment', () => ({ assignOwner: mocks.assignOwner }));
vi.mock('@/lib/sales/brief', () => ({ generateLeadBrief: mocks.generateLeadBrief }));
vi.mock('@/lib/sales/activity', () => ({ recordActivity: mocks.recordActivity }));
vi.mock('@/lib/sales/tasks', () => ({ createTask: mocks.createTask, hasOpenTask: mocks.hasOpenTask }));
vi.mock('@/lib/notifications', () => ({ notifyAdmins: mocks.notifyAdmins }));

import { reportMetaLeadgenFailure } from '../sales';

function registered(id: string): CapturedFunction {
  const fn = mocks.functions.get(id);
  if (!fn) throw new Error(`Inngest function ${id} was not registered`);
  return fn;
}

function fakeStep() {
  const results = new Map<string, unknown>();
  const sendEvent = vi.fn<(...args: [string, unknown]) => Promise<void>>(async () => undefined);
  const step: FakeStep = {
    run: async <T>(...args: [string, () => Promise<T> | T]): Promise<T> => {
      const result = await args[1]();
      results.set(args[0], result);
      return result;
    },
    sendEvent,
  };
  return { step, results, sendEvent };
}

beforeEach(() => {
  fake.reset();
  vi.clearAllMocks();
  mocks.loadLead.mockResolvedValue(leadRow());
});

describe('sales-lead-created', () => {
  it('assigns, briefs and creates the first-touch task, but starts no sequence for a test lead', async () => {
    mocks.loadLead.mockResolvedValue(leadRow({ tags: ['test'] }));
    const { step, sendEvent } = fakeStep();

    const result = await registered('sales-lead-created').handler({ event: { data: { leadId: 'lead_1' } }, step });

    expect(mocks.assignOwner).toHaveBeenCalledWith('lead_1');
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ leadId: 'lead_1', type: 'ai_brief' }));
    expect(mocks.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'First touch within the hour', draftBody: 'Hi Priya, could we talk today?' })
    );
    expect(sendEvent).not.toHaveBeenCalled();
    expect(result).toEqual({ sequence: false });
  });

  it('starts the follow-up sequence for a lead with an email', async () => {
    const { step, sendEvent } = fakeStep();

    const result = await registered('sales-lead-created').handler({ event: { data: { leadId: 'lead_1' } }, step });

    expect(sendEvent).toHaveBeenCalledWith('start-sequence', { name: 'sales/sequence.start', data: { leadId: 'lead_1' } });
    expect(result).toEqual({ sequence: true });
  });

  it('keeps the brief and draft out of step results', async () => {
    const { step, results } = fakeStep();

    await registered('sales-lead-created').handler({ event: { data: { leadId: 'lead_1' } }, step });

    expect(results.get('write-brief')).toEqual({ written: true });
    expect(JSON.stringify([...results.values()])).not.toMatch(/Priya|Acme/);
  });

  it('records no ai_brief activity when creating the first-touch task fails, so a retry cannot double it up', async () => {
    mocks.createTask.mockRejectedValueOnce(new Error('task insert failed'));
    const { step } = fakeStep();

    await expect(
      registered('sales-lead-created').handler({ event: { data: { leadId: 'lead_1' } }, step })
    ).rejects.toThrow('task insert failed');

    expect(mocks.recordActivity).not.toHaveBeenCalled();
  });
});

describe('sales-meta-leadgen failure', () => {
  it('reports the original event ids when the function fails', async () => {
    const onFailure = registered('sales-meta-leadgen').config.onFailure;
    if (typeof onFailure !== 'function') throw new Error('sales-meta-leadgen has no onFailure handler');

    await onFailure({
      event: { data: { event: { name: 'sales/meta.leadgen', data: { leadgenId: '444', pageId: '123' } } } },
      error: new Error('Graph API error 190: token expired'),
    });

    expect(payloadOf(fake.callsTo('webhook_logs', 'insert')[0])).toMatchObject({
      payload: { leadgenId: '444', pageId: '123' },
      error: 'Graph API error 190: token expired',
    });
  });

  it('notifies admins and logs the failure without lead data', async () => {
    await reportMetaLeadgenFailure({ leadgenId: '444', pageId: '123', message: 'Graph API error 190: token expired' });

    expect(mocks.notifyAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'A Meta lead could not be fetched', message: 'Graph API error 190: token expired' })
    );
    expect(payloadOf(fake.callsTo('webhook_logs', 'insert')[0])).toEqual({
      provider: 'sales:meta',
      event_type: 'leadgen_fetch_failed',
      payload: { leadgenId: '444', pageId: '123' },
      headers: {},
      signature_valid: true,
      processed: false,
      error: 'Graph API error 190: token expired',
      external_id: 'leadgen-fetch-failed:444',
    });
  });

  it('ignores a failure that was already logged', async () => {
    fake.respond((call) =>
      call.table === 'webhook_logs' ? { data: null, error: { code: '23505', message: 'duplicate key value' } } : { data: null, error: null }
    );

    await expect(
      reportMetaLeadgenFailure({ leadgenId: '444', pageId: '123', message: 'Graph API error 190: token expired' })
    ).resolves.toBeUndefined();
  });

  it('resolves without throwing on a non-unique insert error, notifying admins exactly once', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fake.respond((call) =>
      call.table === 'webhook_logs' ? { data: null, error: { code: '55000', message: 'no space left on device' } } : { data: null, error: null }
    );

    // This runs inside Inngest's onFailure handler: throwing here would retry the
    // handler itself and repeat the admin notification above.
    await expect(
      reportMetaLeadgenFailure({ leadgenId: '444', pageId: '123', message: 'Graph API error 190: token expired' })
    ).resolves.toBeUndefined();

    expect(mocks.notifyAdmins).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
