import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eqValue, fake, payloadOf } from '@/test-utils/fake-supabase';

const mocks = vi.hoisted(() => ({
  send: vi.fn(async (_event: unknown) => undefined),
  emitEvent: vi.fn(async (_type: string, _payload: unknown) => undefined),
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: mocks.send } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: mocks.emitEvent }));

import { changeStage, recordActivity, stopSequence } from '../activity';
import { completeTask, createTask } from '../tasks';

const actor = { id: 'user-1', name: 'Asha' };

beforeEach(() => {
  fake.reset();
  mocks.send.mockClear();
  mocks.emitEvent.mockClear();
});

describe('recordActivity', () => {
  it('inserts an activity and bumps last_activity_at', async () => {
    const id = await recordActivity({ leadId: 'lead_1', type: 'note', body: 'Called, no answer', actor });
    expect(id).toMatch(/^act_/);
    const [insert] = fake.callsTo('lead_activities', 'insert');
    expect(payloadOf(insert)).toMatchObject({
      lead_id: 'lead_1',
      type: 'note',
      body: 'Called, no answer',
      actor_id: 'user-1',
      actor_name: 'Asha',
    });
    const [bump] = fake.callsTo('leads', 'update');
    expect(eqValue(bump, 'id')).toBe('lead_1');
  });

  it('returns null instead of throwing when the insert fails', async () => {
    fake.respond((call) =>
      call.table === 'lead_activities' ? { data: null, error: { message: 'boom' } } : { data: null, error: null }
    );
    await expect(recordActivity({ leadId: 'lead_1', type: 'note' })).resolves.toBeNull();
  });
});

describe('stopSequence', () => {
  it('records and sends a stop event when an active sequence was stopped', async () => {
    fake.respond((call) =>
      call.table === 'leads' && call.op === 'update' && eqValue(call, 'sequence_status') === 'active'
        ? { data: [{ id: 'lead_1' }], error: null }
        : { data: null, error: null }
    );
    await expect(stopSequence('lead_1', 'replied')).resolves.toBe(true);
    expect(fake.callsTo('lead_activities', 'insert').map((c) => payloadOf(c).type)).toContain('sequence_stopped');
    expect(mocks.send).toHaveBeenCalledWith({ name: 'sales/sequence.stop', data: { leadId: 'lead_1', reason: 'replied' } });
  });

  it('does nothing when no sequence is active', async () => {
    fake.respond(() => ({ data: [], error: null }));
    await expect(stopSequence('lead_1', 'replied')).resolves.toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe('changeStage', () => {
  it('is a no-op when the stage is unchanged', async () => {
    fake.respond((call) =>
      call.table === 'leads' && call.op === 'select' ? { data: { status: 'contacted' }, error: null } : { data: null, error: null }
    );
    await expect(changeStage('lead_1', 'contacted', actor)).resolves.toEqual({ from: 'contacted', to: 'contacted', changed: false });
    expect(fake.callsTo('leads', 'update')).toHaveLength(0);
  });

  it('updates the stage, records it, stops the sequence and emits status_changed', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select') return { data: { status: 'new' }, error: null };
      if (call.table === 'leads' && call.op === 'update' && eqValue(call, 'sequence_status') === 'active') {
        return { data: [{ id: 'lead_1' }], error: null };
      }
      return { data: null, error: null };
    });

    const result = await changeStage('lead_1', 'discovery_scheduled', actor, { reason: 'Booked via Cal.com' });

    expect(result).toEqual({ from: 'new', to: 'discovery_scheduled', changed: true });
    const stageUpdate = fake.callsTo('leads', 'update').map(payloadOf).find((p) => p.status === 'discovery_scheduled');
    expect(stageUpdate).toMatchObject({ status: 'discovery_scheduled', discovery_scheduled: true });
    expect(fake.callsTo('lead_activities', 'insert').map((c) => payloadOf(c).type)).toEqual(
      expect.arrayContaining(['stage_changed', 'sequence_stopped'])
    );
    expect(mocks.send).toHaveBeenCalledWith({
      name: 'sales/sequence.stop',
      data: { leadId: 'lead_1', reason: 'stage_advanced' },
    });
    expect(mocks.emitEvent).toHaveBeenCalledWith('lead.status_changed', expect.objectContaining({ entityId: 'lead_1' }));
  });

  it('emits status_changed with the updated lead, as the leads API did before', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select') return { data: { status: 'new' }, error: null };
      if (call.table === 'leads' && call.op === 'update' && payloadOf(call).status === 'contacted') {
        return { data: { id: 'lead_1', status: 'contacted', lead_score: 60, custom_fields: {} }, error: null };
      }
      return { data: null, error: null };
    });

    await changeStage('lead_1', 'contacted', actor);

    expect(mocks.emitEvent).toHaveBeenCalledWith(
      'lead.status_changed',
      expect.objectContaining({
        data: {
          previousStatus: 'new',
          newStatus: 'contacted',
          lead: expect.objectContaining({ id: 'lead_1', status: 'contacted', leadScore: 60 }),
        },
      })
    );
  });

  it('stores the lost reason', async () => {
    fake.respond((call) =>
      call.table === 'leads' && call.op === 'select' ? { data: { status: 'contacted' }, error: null } : { data: [], error: null }
    );
    await changeStage('lead_1', 'lost', actor, { lostReason: 'Went with another agency' });
    const update = fake.callsTo('leads', 'update').map(payloadOf).find((p) => p.status === 'lost');
    expect(update).toMatchObject({ lost_reason: 'Went with another agency' });
  });
});

describe('tasks', () => {
  it('creates a task and records it on the timeline', async () => {
    const id = await createTask({
      leadId: 'lead_1',
      ownerId: 'user-1',
      type: 'whatsapp',
      title: 'First touch within the hour',
      draftBody: 'Hi Priya…',
      dueAt: '2026-09-15T05:00:00.000Z',
    });
    expect(id).toMatch(/^task_/);
    expect(payloadOf(fake.callsTo('sales_tasks', 'insert')[0])).toMatchObject({ status: 'open', type: 'whatsapp' });
    expect(fake.callsTo('lead_activities', 'insert').map((c) => payloadOf(c).type)).toContain('task_created');
  });

  it('completes only an open task', async () => {
    fake.respond((call) =>
      call.table === 'sales_tasks' && call.op === 'update'
        ? { data: { id: 'task_1', lead_id: 'lead_1', title: 'Call', status: 'done' }, error: null }
        : { data: null, error: null }
    );
    const task = await completeTask('task_1', 'done', actor);
    expect(task?.lead_id).toBe('lead_1');
    expect(eqValue(fake.callsTo('sales_tasks', 'update')[0], 'status')).toBe('open');
  });
});
