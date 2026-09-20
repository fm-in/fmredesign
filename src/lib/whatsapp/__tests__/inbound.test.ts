import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fake, eqValue, payloadOf, type FakeCall } from '@/test-utils/fake-supabase';

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});

const sendWhatsAppText = vi.fn().mockResolvedValue({ ok: true, wamid: 'wamid.OUT' });
vi.mock('@/lib/whatsapp/client', () => ({ sendWhatsAppText: (...a: unknown[]) => sendWhatsAppText(...a) }));

const addSuppression = vi.fn().mockResolvedValue(undefined);
const isSuppressed = vi.fn().mockResolvedValue(false);
vi.mock('@/lib/sales/suppression', () => ({
  addSuppression: (...a: unknown[]) => addSuppression(...a),
  isSuppressed: (...a: unknown[]) => isSuppressed(...a),
}));

const stopSequence = vi.fn().mockResolvedValue(true);
const recordActivity = vi.fn().mockResolvedValue('act_1');
vi.mock('@/lib/sales/activity', () => ({
  recordActivity: (...a: unknown[]) => recordActivity(...a),
  stopSequence: (...a: unknown[]) => stopSequence(...a),
}));

const createTask = vi.fn().mockResolvedValue(undefined);
const hasOpenTask = vi.fn().mockResolvedValue(false);
vi.mock('@/lib/sales/tasks', () => ({
  createTask: (...a: unknown[]) => createTask(...a),
  hasOpenTask: (...a: unknown[]) => hasOpenTask(...a),
}));

const ingestLead = vi.fn();
vi.mock('@/lib/sales/intake/ingest', () => ({ ingestLead: (...a: unknown[]) => ingestLead(...a) }));

const notifyAdmins = vi.fn().mockResolvedValue(undefined);
const createNotification = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/notifications', () => ({
  notifyAdmins: (...a: unknown[]) => notifyAdmins(...a),
  createNotification: (...a: unknown[]) => createNotification(...a),
}));

vi.mock('@/lib/sales/lead-store', () => ({ loadOwner: vi.fn().mockResolvedValue(null) }));

import { handleWhatsAppEvents } from '../inbound';

/** Wednesday 14:00 IST (open) and Sunday 03:00 IST (very much not). */
const OPEN_HOURS = new Date('2026-09-23T08:30:00Z');
const CLOSED_HOURS = new Date('2026-09-27T21:30:00Z');

const LEAD = { id: 'lead_1', name: 'Priya Shah', phone_e164: '+919833257659', owner_id: null, status: 'new' };

function message(text: string | undefined, id = 'wamid.IN') {
  return { id, from: '919833257659', type: 'text', timestamp: '1700000000', text };
}

/** A leads table holding `lead`, and a lead_activities table holding `outbound` prior sends. */
function tables(options: { lead?: typeof LEAD | null; recentOutbound?: boolean } = {}) {
  const lead = options.lead === undefined ? LEAD : options.lead;
  fake.respond((call: FakeCall) => {
    if (call.table === 'leads' && call.op === 'select') return { data: lead ? [lead] : [], error: null };
    if (call.table === 'lead_activities' && call.op === 'select') {
      return { data: options.recentOutbound ? [{ id: 'act_prev' }] : [], error: null };
    }
    return { data: null, error: null };
  });
}

beforeEach(() => {
  fake.reset();
  vi.clearAllMocks();
  sendWhatsAppText.mockResolvedValue({ ok: true, wamid: 'wamid.OUT' });
  isSuppressed.mockResolvedValue(false);
  hasOpenTask.mockResolvedValue(false);
});

describe('an ordinary message from a known lead', () => {
  it('records it, stops the sequence, opens a task and answers automatically', async () => {
    tables();
    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message('Hi, are you free this week?')], statuses: [] });

    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead_1',
        type: 'message_received',
        channel: 'whatsapp',
        direction: 'in',
        body: 'Hi, are you free this week?',
        providerMessageId: 'wamid.IN',
      })
    );
    expect(stopSequence).toHaveBeenCalledWith('lead_1', 'replied');
    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ leadId: 'lead_1', type: 'whatsapp' }));
    expect(sendWhatsAppText).toHaveBeenCalledTimes(1);
    expect(notifyAdmins).toHaveBeenCalled();
  });

  it('writes the automatic reply to the timeline as an outbound message', async () => {
    tables();
    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message('Hello')], statuses: [] });

    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'message_sent',
        channel: 'whatsapp',
        direction: 'out',
        providerMessageId: 'wamid.OUT',
      })
    );
  });

  it('does not answer twice in one conversation', async () => {
    // The second message of a back-and-forth must not draw another identical
    // automatic reply — that is worse than staying quiet.
    tables({ recentOutbound: true });
    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message('And one more thing')], statuses: [] });

    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ type: 'message_received' }));
    expect(sendWhatsAppText).not.toHaveBeenCalled();
  });

  it('records the failure when the reply cannot be sent', async () => {
    tables();
    sendWhatsAppText.mockResolvedValue({ ok: false, error: 'Outside the 24 hour window' });
    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message('Hello')], statuses: [] });

    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'message_failed', metadata: { automatic: true, error: 'Outside the 24 hour window' } })
    );
  });

  it('stays quiet when the number is already suppressed for WhatsApp', async () => {
    tables();
    isSuppressed.mockResolvedValue(true);
    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message('Hello')], statuses: [] });
    expect(sendWhatsAppText).not.toHaveBeenCalled();
  });
});

describe('the automatic reply tells the truth about when we will answer', () => {
  it('promises "shortly" during business hours', async () => {
    vi.useFakeTimers().setSystemTime(OPEN_HOURS);
    tables();
    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message('Hello')], statuses: [] });

    expect(sendWhatsAppText.mock.calls[0][1]).toContain('shortly');
    vi.useRealTimers();
  });

  it('does not promise "shortly" in the middle of the night', async () => {
    // A promise that breaks by morning reads worse than an honest wait.
    vi.useFakeTimers().setSystemTime(CLOSED_HOURS);
    tables();
    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message('Hello')], statuses: [] });

    const body = sendWhatsAppText.mock.calls[0][1] as string;
    expect(body).not.toContain('shortly');
    expect(body).toContain('offline');
    vi.useRealTimers();
  });
});

describe('opt-out', () => {
  it('suppresses WhatsApp only — not the person’s email', async () => {
    tables();
    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message('STOP')], statuses: [] });

    expect(addSuppression).toHaveBeenCalledWith({
      phoneE164: '+919833257659',
      reason: 'unsubscribed',
      leadId: 'lead_1',
      channel: 'whatsapp',
    });
    expect(stopSequence).toHaveBeenCalledWith('lead_1', 'unsubscribed');
  });

  it('never answers an opt-out, and opens no task', async () => {
    tables();
    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message('unsubscribe')], statuses: [] });
    expect(sendWhatsAppText).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
  });

  it.each(['STOP', 'stop', ' Stop ', 'Unsubscribe', 'CANCEL'])('treats %o as an opt-out', async (text) => {
    tables();
    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message(text)], statuses: [] });
    expect(addSuppression).toHaveBeenCalled();
  });

  it('does not opt out a sentence that merely contains the word', async () => {
    // "please don't stop sending these" means the opposite of STOP.
    tables();
    await handleWhatsAppEvents({
      phoneNumberId: '1',
      messages: [message('please don’t stop sending these')],
      statuses: [],
    });
    expect(addSuppression).not.toHaveBeenCalled();
  });
});

describe('a number we have never heard from', () => {
  it('creates a lead with the whatsapp source and an inbound-request consent basis', async () => {
    let created = false;
    fake.respond((call: FakeCall) => {
      if (call.table === 'leads' && call.op === 'select') {
        return { data: created ? [LEAD] : [], error: null };
      }
      if (call.table === 'lead_activities' && call.op === 'select') return { data: [], error: null };
      return { data: null, error: null };
    });
    ingestLead.mockImplementation(async () => {
      created = true;
      return { leadId: 'lead_1' };
    });

    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message('Hi, I need a website')], statuses: [] });

    expect(ingestLead).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'whatsapp',
        phone: '+919833257659',
        message: 'Hi, I need a website',
        consent: expect.objectContaining({ basis: 'inbound_request' }),
      })
    );
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ type: 'message_received' }));
  });

  it('tells a human rather than dropping the message when intake refuses it', async () => {
    tables({ lead: null });
    ingestLead.mockRejectedValue(new Error('A lead needs an email address or a phone number'));

    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message('Hello')], statuses: [] });

    expect(notifyAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'WhatsApp message we could not attach to a lead' })
    );
  });
});

describe('delivery statuses', () => {
  it('marks the outbound activity failed and tells a human', async () => {
    const updates: Record<string, unknown>[] = [];
    fake.respond((call: FakeCall) => {
      if (call.table === 'lead_activities' && call.op === 'select') {
        return { data: [{ id: 'act_9', lead_id: 'lead_1', metadata: { automatic: true } }], error: null };
      }
      if (call.table === 'lead_activities' && call.op === 'update') {
        updates.push(payloadOf(call) as Record<string, unknown>);
        return { data: null, error: null };
      }
      return { data: null, error: null };
    });

    await handleWhatsAppEvents({
      phoneNumberId: '1',
      messages: [],
      statuses: [{ id: 'wamid.OUT', status: 'failed', recipientId: '919833257659' }],
    });

    expect(updates[0]).toEqual({ metadata: { automatic: true, deliveryStatus: 'failed' } });
    expect(notifyAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'WhatsApp message failed to deliver' })
    );
  });

  it('ignores the sent and delivered receipts that arrive for every message', async () => {
    const calls: FakeCall[] = [];
    fake.respond((call: FakeCall) => {
      calls.push(call);
      return { data: [], error: null };
    });

    await handleWhatsAppEvents({
      phoneNumberId: '1',
      messages: [],
      statuses: [
        { id: 'wamid.OUT', status: 'sent', recipientId: '9198' },
        { id: 'wamid.OUT', status: 'delivered', recipientId: '9198' },
      ],
    });

    expect(calls).toHaveLength(0);
  });
});

describe('one bad message does not stop the rest', () => {
  it('carries on after a failure', async () => {
    tables();
    recordActivity.mockRejectedValueOnce(new Error('timeline write failed'));

    await handleWhatsAppEvents({
      phoneNumberId: '1',
      messages: [message('first', 'wamid.A'), message('second', 'wamid.B')],
      statuses: [],
    });

    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ providerMessageId: 'wamid.B' }));
  });
});

describe('the lead lookup', () => {
  it('matches on the normalised E.164 form, not the raw sender', async () => {
    const calls: FakeCall[] = [];
    fake.respond((call: FakeCall) => {
      calls.push(call);
      if (call.table === 'leads' && call.op === 'select') return { data: [LEAD], error: null };
      return { data: [], error: null };
    });

    await handleWhatsAppEvents({ phoneNumberId: '1', messages: [message('Hello')], statuses: [] });

    const lookup = calls.find((c) => c.table === 'leads' && c.op === 'select');
    expect(lookup && eqValue(lookup, 'phone_e164')).toBe('+919833257659');
  });
});
