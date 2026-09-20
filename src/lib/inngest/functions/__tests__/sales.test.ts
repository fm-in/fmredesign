import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fake, payloadOf } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';
import type { LeadRow } from '@/lib/sales/types';
import { SEQUENCES, type SequenceStep } from '@/lib/sales/sequence';
import type { ContinueDecision } from '@/lib/sales/sequence';
import type { StepResult } from '@/lib/sales/sequence-runner';

interface FakeStep {
  run: <T>(...args: [string, () => Promise<T> | T]) => Promise<T>;
  sendEvent: (...args: [string, unknown]) => Promise<void>;
  sleep: (...args: [string, string]) => Promise<void>;
  sleepUntil: (...args: [string, string]) => Promise<void>;
}
type CapturedHandler = (ctx: { event: { data: Record<string, unknown> }; step: FakeStep }) => Promise<unknown>;
interface CapturedFunction {
  config: { id: string; onFailure?: unknown; cancelOn?: unknown };
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
  markSequenceActive: vi.fn<(leadId: string, key: string) => Promise<boolean>>(async () => true),
  markSequenceCompleted: vi.fn(async () => undefined),
  evaluateContinue: vi.fn<() => Promise<ContinueDecision>>(async () => ({ ok: true })),
  runSequenceStep: vi.fn<(leadId: string, step: SequenceStep) => Promise<StepResult>>(async () => ({ done: true })),
  recordStepProgress: vi.fn(async () => undefined),
  sendTemplateToLead: vi.fn<() => Promise<{ sent: boolean; reason?: string }>>(async () => ({ sent: true })),
}));

vi.mock('@/lib/whatsapp/send', async () => {
  const actual = await vi.importActual<typeof import('@/lib/whatsapp/send')>('@/lib/whatsapp/send');
  return { ...actual, sendTemplateToLead: mocks.sendTemplateToLead };
});

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
vi.mock('@/lib/sales/sequence-runner', () => ({
  markSequenceActive: mocks.markSequenceActive,
  markSequenceCompleted: mocks.markSequenceCompleted,
  evaluateContinue: mocks.evaluateContinue,
  runSequenceStep: mocks.runSequenceStep,
  recordStepProgress: mocks.recordStepProgress,
}));

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
    sleep: vi.fn(async () => undefined),
    sleepUntil: vi.fn(async () => undefined),
  };
  return { step, results, sendEvent };
}

beforeEach(() => {
  fake.reset();
  vi.clearAllMocks();
  mocks.loadLead.mockResolvedValue(leadRow());
});

describe('sales-lead-created', () => {
  it('assigns an owner, writes the brief and creates the first-touch task', async () => {
    const { step, sendEvent } = fakeStep();

    const result = await registered('sales-lead-created').handler({ event: { data: { leadId: 'lead_1' } }, step });

    expect(mocks.assignOwner).toHaveBeenCalledWith('lead_1');
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ leadId: 'lead_1', type: 'ai_brief' }));
    expect(mocks.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'First touch within the hour', draftBody: 'Hi Priya, could we talk today?' })
    );
    expect(sendEvent).not.toHaveBeenCalled();
    expect(result).toEqual({ written: true, whatsapp: { sent: true } });
  });

  it('sends the WhatsApp first touch, waiving only the sending-hours rule', async () => {
    const { step } = fakeStep();
    await registered('sales-lead-created').handler({ event: { data: { leadId: 'lead_1' } }, step });

    expect(mocks.sendTemplateToLead).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'marketing',
        // Someone who filled the form at 02:00 is awake and waiting; every
        // other gate still applies inside sendTemplateToLead.
        respondingToAction: true,
        template: expect.objectContaining({ name: 'enquiry_first_touch', language: 'en' }),
      })
    );
  });

  it('sends nothing when the lead left no phone number', async () => {
    mocks.loadLead.mockResolvedValue(leadRow({ phone_e164: null }));
    const { step } = fakeStep();
    const result = await registered('sales-lead-created').handler({ event: { data: { leadId: 'lead_1' } }, step });

    expect(mocks.sendTemplateToLead).not.toHaveBeenCalled();
    expect(result).toEqual({ written: true, whatsapp: { sent: false, reason: 'no_phone' } });
  });

  it('keeps the refusal reason but no lead content in the step result', async () => {
    // Inngest keeps step results in its run history, so a customer's name or
    // message must never be part of one.
    mocks.sendTemplateToLead.mockResolvedValue({ sent: false, reason: 'suppressed' });
    const { step } = fakeStep();
    const result = await registered('sales-lead-created').handler({ event: { data: { leadId: 'lead_1' } }, step });

    expect(result).toEqual({ written: true, whatsapp: { sent: false, reason: 'suppressed' } });
    expect(JSON.stringify(result)).not.toContain('Priya');
  });

  it('never sends sales/sequence.start — a lead no longer enrols itself, for a normal lead or a test-tagged one', async () => {
    const overridesList: Partial<LeadRow>[] = [{}, { tags: ['test'] }, { email: null }];
    for (const overrides of overridesList) {
      mocks.loadLead.mockResolvedValue(leadRow(overrides));
      const { step, sendEvent } = fakeStep();

      await registered('sales-lead-created').handler({ event: { data: { leadId: 'lead_1' } }, step });

      expect(sendEvent).not.toHaveBeenCalled();
    }
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

describe('sales-sequence', () => {
  it('is registered as sales-sequence, cancelled on sales/sequence.stop matching data.leadId', () => {
    expect(registered('sales-sequence').config).toMatchObject({
      id: 'sales-sequence',
      cancelOn: [{ event: 'sales/sequence.stop', match: 'data.leadId' }],
    });
  });

  it.each(Object.keys(SEQUENCES))('runs the %s steps, in order, and passes the key to markSequenceActive', async (key) => {
    const { step } = fakeStep();
    const seen: SequenceStep[] = [];
    mocks.runSequenceStep.mockImplementation(async (_leadId, sequenceStep) => {
      seen.push(sequenceStep);
      return { done: true };
    });

    const result = await registered('sales-sequence').handler({ event: { data: { leadId: 'lead_1', sequenceKey: key } }, step });

    expect(mocks.markSequenceActive).toHaveBeenCalledWith('lead_1', key);
    expect(seen).toEqual([...SEQUENCES[key]]);
    expect(mocks.markSequenceCompleted).toHaveBeenCalledWith('lead_1');
    expect(result).toEqual({ completed: true });
  });

  it('stops cleanly on an unknown key: no enrolment, no step run, and no throw', async () => {
    const { step } = fakeStep();

    const result = await registered('sales-sequence').handler({
      event: { data: { leadId: 'lead_1', sequenceKey: 'not-a-real-key' } },
      step,
    });

    expect(mocks.markSequenceActive).not.toHaveBeenCalled();
    expect(mocks.runSequenceStep).not.toHaveBeenCalled();
    expect(mocks.evaluateContinue).not.toHaveBeenCalled();
    expect(result).toEqual({ skipped: 'unknown_sequence' });
  });

  it('does not enrol twice: when markSequenceActive returns false, it runs no steps', async () => {
    mocks.markSequenceActive.mockResolvedValueOnce(false);
    const { step } = fakeStep();

    const result = await registered('sales-sequence').handler({
      event: { data: { leadId: 'lead_1', sequenceKey: 'enquiry-v1' } },
      step,
    });

    expect(mocks.runSequenceStep).not.toHaveBeenCalled();
    expect(result).toEqual({ skipped: 'already_enrolled' });
  });

  it('stops at the step where evaluateContinue refuses, without completing', async () => {
    mocks.evaluateContinue
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, reason: 'booked' });
    const { step } = fakeStep();

    const result = await registered('sales-sequence').handler({
      event: { data: { leadId: 'lead_1', sequenceKey: 'enquiry-v1' } },
      step,
    });

    expect(result).toEqual({ stopped: 'booked', atStep: 1 });
    expect(mocks.markSequenceCompleted).not.toHaveBeenCalled();
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
