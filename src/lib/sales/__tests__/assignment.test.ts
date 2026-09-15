import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eqValue, fake, payloadOf } from '@/test-utils/fake-supabase';

const mocks = vi.hoisted(() => ({ send: vi.fn(async (_event: unknown) => undefined) }));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: mocks.send } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));

import { assignOwner } from '../assignment';

beforeEach(() => {
  fake.reset();
  mocks.send.mockClear();
});

function notificationSends() {
  return mocks.send.mock.calls
    .map(([event]) => event)
    .filter((event): event is { name: string; data: Record<string, unknown> } =>
      typeof event === 'object' && event !== null && 'name' in event && event.name === 'notification/send'
    );
}

describe('assignOwner', () => {
  it('assigns the least recently assigned rotation member and notifies them', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select' && eqValue(call, 'id') === 'lead_1') {
        return { data: { id: 'lead_1', name: 'Priya', company: 'Acme', owner_id: null }, error: null };
      }
      if (call.table === 'authorized_users') {
        return { data: [{ id: 'u1', name: 'Asha', email: 'asha@fm.in' }, { id: 'u2', name: 'Ben', email: null }], error: null };
      }
      if (call.table === 'leads' && call.op === 'select' && eqValue(call, 'owner_id') === 'u1') {
        return { data: [{ created_at: '2026-09-14T10:00:00Z' }], error: null };
      }
      if (call.table === 'leads' && call.op === 'select') return { data: [], error: null };
      if (call.table === 'leads' && call.op === 'update') return { data: [{ id: 'lead_1' }], error: null };
      return { data: null, error: null };
    });

    const owner = await assignOwner('lead_1');

    expect(owner?.id).toBe('u2');
    const update = fake.callsTo('leads', 'update').map(payloadOf).find((p) => p.owner_id === 'u2');
    expect(update).toMatchObject({ owner_id: 'u2', assigned_to: 'Ben' });
    expect(fake.callsTo('lead_activities', 'insert').map((c) => payloadOf(c).type)).toContain('owner_changed');
    expect(notificationSends()[0]?.data).toMatchObject({ recipientType: 'admin', recipientId: 'u2' });
  });

  it('leaves an owned lead alone', async () => {
    fake.respond((call) =>
      call.table === 'leads' ? { data: { id: 'lead_1', name: 'Priya', company: null, owner_id: 'u9' }, error: null } : { data: null, error: null }
    );
    await expect(assignOwner('lead_1')).resolves.toBeNull();
    expect(fake.callsTo('leads', 'update')).toHaveLength(0);
  });

  it('alerts admins when nobody is in the rotation', async () => {
    fake.respond((call) => {
      if (call.table === 'leads') return { data: { id: 'lead_1', name: 'Priya', company: null, owner_id: null }, error: null };
      if (call.table === 'authorized_users') return { data: [], error: null };
      return { data: null, error: null };
    });
    await expect(assignOwner('lead_1')).resolves.toBeNull();
    const [notification] = notificationSends();
    expect(notification?.data).toMatchObject({ recipientType: 'admin', title: 'New lead needs an owner' });
    expect(notification?.data.recipientId).toBeUndefined();
  });
});
