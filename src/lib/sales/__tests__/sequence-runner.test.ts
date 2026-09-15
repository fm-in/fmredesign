import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fake, payloadOf } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';
import type { SendOutcome } from '../send-email';

const mocks = vi.hoisted(() => ({
  send: vi.fn(async (_event: unknown) => undefined),
  sendSalesEmail: vi.fn(async (_args: unknown): Promise<SendOutcome> => ({ sent: true, messageId: 'm1' })),
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: mocks.send } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));
vi.mock('../send-email', () => ({ sendSalesEmail: mocks.sendSalesEmail }));

import { evaluateContinue, markSequenceActive, recordStepProgress, runSequenceStep } from '../sequence-runner';

beforeEach(() => {
  fake.reset();
  mocks.send.mockClear();
  mocks.sendSalesEmail.mockClear();
});

function respondWithLead(overrides: Parameters<typeof leadRow>[0] = {}, extra: { meetings?: unknown[] } = {}) {
  fake.respond((call) => {
    if (call.table === 'leads' && call.op === 'select' && call.single) return { data: leadRow(overrides), error: null };
    if (call.table === 'leads' && call.op === 'select') return { data: { status: overrides.status ?? 'new' }, error: null };
    if (call.table === 'leads' && call.op === 'update') return { data: [{ id: 'lead_1' }], error: null };
    if (call.table === 'admin_settings') return { data: { sales: { automationEnabled: true } }, error: null };
    if (call.table === 'meetings') return { data: extra.meetings ?? [], error: null };
    if (call.table === 'suppression_list') return { data: [], error: null };
    if (call.table === 'authorized_users') return { data: { id: 'user-1', name: 'Asha', email: 'asha@fm.in' }, error: null };
    return { data: null, error: null };
  });
}

describe('markSequenceActive', () => {
  it('refuses to enrol a lead twice', async () => {
    fake.respond(() => ({ data: [], error: null }));
    await expect(markSequenceActive('lead_1', 'inbound-v1')).resolves.toBe(false);
  });
});

describe('evaluateContinue', () => {
  it('continues for an active lead', async () => {
    respondWithLead({ sequence_status: 'active', status: 'contacted' });
    await expect(evaluateContinue('lead_1')).resolves.toEqual({ ok: true });
  });

  it('stops the sequence once a meeting is booked', async () => {
    respondWithLead({ sequence_status: 'active', status: 'contacted' }, { meetings: [{ id: 'meet_1' }] });
    await expect(evaluateContinue('lead_1')).resolves.toEqual({ ok: false, reason: 'booked' });
    expect(fake.callsTo('leads', 'update').map(payloadOf)).toContainEqual({ sequence_status: 'stopped', sequence_stop_reason: 'booked' });
  });
});

describe('runSequenceStep', () => {
  it('sends the first email but leaves all sequence bookkeeping untouched', async () => {
    respondWithLead({ status: 'new', sequence_status: 'active' });
    const result = await runSequenceStep('lead_1', { kind: 'email', template: 'instant_reply', waitBefore: '0s' }, 0);
    expect(result).toEqual({ done: true });
    expect(mocks.sendSalesEmail).toHaveBeenCalledWith(expect.objectContaining({ template: 'instant_reply', ownerName: 'Asha' }));

    const updates = fake.callsTo('leads', 'update').map(payloadOf);
    expect(updates.some((p) => 'first_response_at' in p)).toBe(false);
    expect(updates.some((p) => 'sequence_step' in p)).toBe(false);
    expect(updates.some((p) => p.status === 'contacted')).toBe(false);
  });

  it('stops the sequence when the address is suppressed', async () => {
    respondWithLead({ sequence_status: 'active' });
    mocks.sendSalesEmail.mockResolvedValueOnce({ sent: false, reason: 'suppressed' });
    const result = await runSequenceStep('lead_1', { kind: 'email', template: 'follow_up_proof', waitBefore: '2d' }, 1);
    expect(result).toEqual({ done: false, stopped: 'unsubscribed' });
  });

  it('creates a task for task steps', async () => {
    respondWithLead({ sequence_status: 'active', status: 'contacted' });
    await runSequenceStep('lead_1', { kind: 'task', taskType: 'call', title: 'Call or WhatsApp follow-up', dueInHours: 4, waitBefore: '2d' }, 2);
    expect(payloadOf(fake.callsTo('sales_tasks', 'insert')[0])).toMatchObject({ type: 'call', title: 'Call or WhatsApp follow-up' });
    expect(mocks.sendSalesEmail).not.toHaveBeenCalled();
  });
});

describe('recordStepProgress', () => {
  it('stamps first_response_at guarded by is-null and moves a new lead to contacted', async () => {
    respondWithLead({ status: 'new' });
    await recordStepProgress('lead_1', { kind: 'email', template: 'instant_reply', waitBefore: '0s' }, 0);

    const updateCalls = fake.callsTo('leads', 'update');
    const stamp = updateCalls.find((c) => 'first_response_at' in payloadOf(c));
    expect(stamp).toBeDefined();
    expect(stamp?.filters).toContainEqual({ method: 'is', args: ['first_response_at', null] });

    const updates = updateCalls.map(payloadOf);
    expect(updates.some((p) => p.status === 'contacted')).toBe(true);
    expect(updates.some((p) => p.sequence_step === 1)).toBe(true);
  });

  it('does not call changeStage when the fresh status is already past new', async () => {
    respondWithLead({ status: 'contacted' });
    await recordStepProgress('lead_1', { kind: 'email', template: 'instant_reply', waitBefore: '0s' }, 0);

    const updates = fake.callsTo('leads', 'update').map(payloadOf);
    expect(updates.some((p) => 'first_response_at' in p)).toBe(true);
    expect(updates.some((p) => p.status === 'contacted')).toBe(false);
    expect(updates.some((p) => p.sequence_step === 1)).toBe(true);
  });

  it('only advances sequence_step for a task step', async () => {
    respondWithLead({ status: 'contacted' });
    await recordStepProgress(
      'lead_1',
      { kind: 'task', taskType: 'call', title: 'Call or WhatsApp follow-up', dueInHours: 4, waitBefore: '2d' },
      2
    );

    const updates = fake.callsTo('leads', 'update').map(payloadOf);
    expect(updates).toEqual([{ sequence_step: 3 }]);
  });

  it('throws when the sequence_step update returns an error', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'update' && 'sequence_step' in payloadOf(call)) {
        return { data: null, error: { message: 'boom' } };
      }
      return { data: [{ id: 'lead_1' }], error: null };
    });

    await expect(
      recordStepProgress('lead_1', { kind: 'task', taskType: 'call', title: 'Call', dueInHours: 4, waitBefore: '2d' }, 2)
    ).rejects.toMatchObject({ message: 'boom' });
  });
});
