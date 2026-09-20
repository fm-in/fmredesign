import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fake, type FakeCall } from '@/test-utils/fake-supabase';

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});

import { listConversations, loadThread, windowStateFor, WINDOW_HOURS } from '../conversations';

const NOW = new Date('2026-09-20T12:00:00.000Z');
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3_600_000).toISOString();

beforeEach(() => {
  fake.reset();
  vi.useFakeTimers().setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('the 24-hour reply window', () => {
  it('is open while their last message is recent', async () => {
    fake.respond(() => ({ data: [{ occurred_at: hoursAgo(2) }], error: null }));
    const state = await windowStateFor('lead_1');
    expect(state.open).toBe(true);
    expect(state.lastInboundAt).toBe(hoursAgo(2));
  });

  it('is shut once more than 24 hours have passed', async () => {
    fake.respond(() => ({ data: [{ occurred_at: hoursAgo(WINDOW_HOURS + 1) }], error: null }));
    expect((await windowStateFor('lead_1')).open).toBe(false);
  });

  it('is shut when they have never messaged us', async () => {
    // We may have sent them a template, but that does not open anything.
    fake.respond(() => ({ data: [], error: null }));
    const state = await windowStateFor('lead_1');
    expect(state).toEqual({ open: false, expiresAt: null, lastInboundAt: null });
  });

  it('measures from their message, not ours', async () => {
    const calls: FakeCall[] = [];
    fake.respond((call) => {
      calls.push(call);
      return { data: [], error: null };
    });
    await windowStateFor('lead_1');

    const filters = calls[0].filters.map((f) => `${f.method}:${f.args[0]}=${f.args[1]}`);
    expect(filters).toContain('eq:direction=in');
    expect(filters).toContain('eq:channel=whatsapp');
  });
});

describe('loadThread', () => {
  it('returns messages oldest first, however the query sorted them', async () => {
    fake.respond((call) =>
      call.table === 'lead_activities'
        ? {
            data: [
              { id: 'a2', type: 'message_sent', direction: 'out', body: 'Second', occurred_at: hoursAgo(1), metadata: {}, actor_name: 'Asha' },
              { id: 'a1', type: 'message_received', direction: 'in', body: 'First', occurred_at: hoursAgo(2), metadata: {}, actor_name: null },
            ],
            error: null,
          }
        : { data: [], error: null }
    );

    const thread = await loadThread('lead_1');
    expect(thread.map((m) => m.body)).toEqual(['First', 'Second']);
  });

  it('surfaces the template name, the delivery state and whether it was automatic', async () => {
    fake.respond(() => ({
      data: [
        {
          id: 'a1',
          type: 'message_sent',
          direction: 'out',
          body: null,
          occurred_at: hoursAgo(1),
          metadata: { template: 'enquiry_first_touch', deliveryStatus: 'read', automatic: true },
          actor_name: 'System',
          subject: 'enquiry_first_touch',
        },
      ],
      error: null,
    }));

    const [message] = await loadThread('lead_1');
    expect(message).toMatchObject({
      templateName: 'enquiry_first_touch',
      deliveryStatus: 'read',
      automatic: true,
    });
  });
});

describe('listConversations', () => {
  it('shows one row per lead, with their latest message', async () => {
    fake.respond((call) => {
      if (call.table === 'lead_activities') {
        return {
          data: [
            { lead_id: 'lead_1', direction: 'in', body: 'Newest', occurred_at: hoursAgo(1), type: 'message_received' },
            { lead_id: 'lead_1', direction: 'out', body: 'Older', occurred_at: hoursAgo(5), type: 'message_sent' },
            { lead_id: 'lead_2', direction: 'out', body: 'Ours', occurred_at: hoursAgo(3), type: 'message_sent' },
          ],
          error: null,
        };
      }
      return { data: [{ id: 'lead_1', name: 'Priya', phone_e164: '+91983' }, { id: 'lead_2', name: 'Raj', phone_e164: '+91984' }], error: null };
    });

    const list = await listConversations();
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ leadId: 'lead_1', name: 'Priya', lastMessage: 'Newest', awaitingReply: true });
    // Ours was the last word, so nobody is waiting on us.
    expect(list[1]).toMatchObject({ leadId: 'lead_2', awaitingReply: false });
  });

  it('computes each row’s window from that lead’s own last inbound message', async () => {
    fake.respond((call) => {
      if (call.table === 'lead_activities') {
        return {
          data: [
            { lead_id: 'fresh', direction: 'in', body: 'hi', occurred_at: hoursAgo(1), type: 'message_received' },
            { lead_id: 'stale', direction: 'in', body: 'hi', occurred_at: hoursAgo(WINDOW_HOURS + 2), type: 'message_received' },
          ],
          error: null,
        };
      }
      return { data: [{ id: 'fresh', name: 'A', phone_e164: null }, { id: 'stale', name: 'B', phone_e164: null }], error: null };
    });

    const list = await listConversations();
    expect(list.find((c) => c.leadId === 'fresh')?.window.open).toBe(true);
    expect(list.find((c) => c.leadId === 'stale')?.window.open).toBe(false);
  });

  it('is empty when nobody has used WhatsApp', async () => {
    fake.respond(() => ({ data: [], error: null }));
    expect(await listConversations()).toEqual([]);
  });
});
