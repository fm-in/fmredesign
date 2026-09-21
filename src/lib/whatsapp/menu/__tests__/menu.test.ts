import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoicePosition = vi.fn();
const contentAwaitingApproval = vi.fn();
vi.mock('../client-data', async () => {
  const actual = await vi.importActual<typeof import('../client-data')>('../client-data');
  return {
    ...actual,
    invoicePosition: (...a: unknown[]) => invoicePosition(...a),
    contentAwaitingApproval: (...a: unknown[]) => contentAwaitingApproval(...a),
  };
});

import { allNodes, looksLikeMenuRequest, renderRoot, routeTap, type MenuContext } from '../index';
import { CLIENT_ROOT } from '../client';
import { LEAD_ROOT } from '../lead';

const LEAD_CTX: MenuContext = {
  audience: 'lead', leadId: 'lead_1', name: 'Priya Shah', phoneE164: '+916268112515', hasEmail: false,
};
const CLIENT_CTX: MenuContext = {
  audience: 'client', leadId: 'lead_2', clientId: 'cl_1', clientSlug: 'acme-retail',
  name: 'Rohit Mehra', phoneE164: '+916268112516', hasEmail: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  invoicePosition.mockResolvedValue({ openCount: 0, total: 0, currency: 'INR', oldestDue: null, overdueCount: 0 });
  contentAwaitingApproval.mockResolvedValue(0);
});

describe('the audience boundary', () => {
  it('refuses a client node to a lead', async () => {
    // The one real security boundary here. A reply id reaches us because Meta
    // echoes a button we sent, but "not usually forgeable" is not a security
    // model, and being wrong means showing a stranger a client's position.
    expect(await routeTap('client:invoices', LEAD_CTX)).toBeNull();
    expect(invoicePosition).not.toHaveBeenCalled();
  });

  it('refuses a lead node to a client, so the two menus cannot bleed together', async () => {
    expect(await routeTap('lead:services', CLIENT_CTX)).toBeNull();
  });

  it('returns null for a tap on a menu we have since renamed', async () => {
    // Someone scrolls up and taps last month's button. Not an error — the
    // caller treats it as an ordinary message and a person reads it.
    expect(await routeTap('lead:pricing_2024', LEAD_CTX)).toBeNull();
  });
});

describe('every tappable id resolves', () => {
  it('has a node behind each button and row the menus offer', async () => {
    // A typo in an id ships a button that does nothing at all, and nothing
    // else would catch it: the tap simply returns null and looks like silence.
    const known = new Set(allNodes().map((n) => n.id));
    const offered: string[] = [];

    for (const ctx of [LEAD_CTX, CLIENT_CTX]) {
      for (const node of allNodes().filter((n) => n.audience === ctx.audience)) {
        const reply = await node.render(ctx);
        if (reply.kind !== 'interactive') continue;
        offered.push(...(reply.message.buttons ?? []).map((b) => b.id));
        offered.push(...(reply.message.list?.sections ?? []).flatMap((s) => s.rows.map((r) => r.id)));
      }
    }

    expect(offered.length).toBeGreaterThan(0);
    expect(offered.filter((id) => !known.has(id))).toEqual([]);
  });

  it('keeps every menu inside the limits Meta rejects on', async () => {
    for (const ctx of [LEAD_CTX, CLIENT_CTX]) {
      for (const node of allNodes().filter((n) => n.audience === ctx.audience)) {
        const reply = await node.render(ctx);
        if (reply.kind !== 'interactive') continue;
        for (const button of reply.message.buttons ?? []) {
          expect(button.title.length, `button "${button.title}"`).toBeLessThanOrEqual(20);
        }
        for (const section of reply.message.list?.sections ?? []) {
          for (const row of section.rows) {
            expect(row.title.length, `row "${row.title}"`).toBeLessThanOrEqual(24);
            expect((row.description ?? '').length, `description on "${row.id}"`).toBeLessThanOrEqual(72);
          }
        }
      }
    }
  });
});

describe('the lead menu', () => {
  it('offers every intent one tap away, and mentions no record we hold', async () => {
    const reply = await renderRoot(LEAD_CTX);
    expect(reply.kind).toBe('interactive');
    if (reply.kind !== 'interactive') return;

    const rows = reply.message.list?.sections.flatMap((s) => s.rows) ?? [];
    expect(rows).toHaveLength(5);
    // The scorecard leads: it is the only branch that gives something rather
    // than shows something, and the only one that returns an email.
    expect(rows[0].id).toBe('lead:scorecard');
    expect(reply.message.body).toContain('Priya');
    // Nothing here may hint that we hold a record on anyone.
    expect(JSON.stringify(reply.message)).not.toMatch(/invoice|client|account/i);
  });

  it('does not greet a name that is really a phone number', async () => {
    // Intake stores the WhatsApp profile name, which is whatever the person
    // typed into their own phone — often the number itself.
    const reply = await renderRoot({ ...LEAD_CTX, name: '919876543210' });
    if (reply.kind !== 'interactive') throw new Error('expected a menu');
    expect(reply.message.body).not.toContain('919876543210');
    expect(reply.message.body.startsWith('Hi,')).toBe(true);
  });

  it('hands a request for a person to a person', async () => {
    const reply = await routeTap('lead:human', LEAD_CTX);
    expect(reply?.kind).toBe('handoff');
  });
});

describe('the client menu', () => {
  it('reports the invoice position with a link into the portal, not a document', async () => {
    invoicePosition.mockResolvedValue({
      openCount: 2, total: 186000, currency: 'INR', oldestDue: '2026-10-15', overdueCount: 0,
    });
    const reply = await routeTap('client:invoices', CLIENT_CTX);
    if (reply?.kind !== 'text') throw new Error('expected text');

    expect(reply.body).toContain('2 invoices open');
    expect(reply.body).toContain('₹1,86,000');
    expect(reply.body).toContain('15 October 2026');
    expect(reply.body).toContain('/client/acme-retail/invoices');
  });

  it('says "due" for a future invoice and "was due" for a late one', async () => {
    invoicePosition.mockResolvedValue({
      openCount: 1, total: 50000, currency: 'INR', oldestDue: '2026-08-01', overdueCount: 1,
    });
    const late = await routeTap('client:invoices', CLIENT_CTX);
    if (late?.kind !== 'text') throw new Error('expected text');
    expect(late.body).toContain('was due');
  });

  it('hands over rather than guessing when the lookup fails', async () => {
    // "Nothing outstanding" is the one wrong answer to a failed query.
    invoicePosition.mockResolvedValue(null);
    const reply = await routeTap('client:invoices', CLIENT_CTX);
    expect(reply?.kind).toBe('handoff');
    if (reply?.kind !== 'handoff') return;
    expect(reply.body).not.toMatch(/nothing outstanding/i);
  });

  it('counts content waiting on them', async () => {
    contentAwaitingApproval.mockResolvedValue(3);
    const reply = await routeTap('client:content', CLIENT_CTX);
    if (reply?.kind !== 'text') throw new Error('expected text');
    expect(reply.body).toContain('3 posts are');
  });

  it('does not promise a ticket it has not opened', async () => {
    const reply = await routeTap('client:issue', CLIENT_CTX);
    if (reply?.kind !== 'handoff') throw new Error('expected a handoff');
    expect(reply.body).not.toMatch(/ticket #|reference number|we have opened/i);
  });

  it('opens as a list, because four options do not fit in three buttons', async () => {
    const reply = await renderRoot(CLIENT_CTX);
    if (reply.kind !== 'interactive') throw new Error('expected a menu');
    expect(reply.message.list?.sections[0].rows).toHaveLength(4);
    expect(reply.message.buttons).toBeUndefined();
  });

  it('is reached by the client root id', async () => {
    expect(CLIENT_ROOT).toBe('client:root');
    expect(LEAD_ROOT).toBe('lead:root');
  });
});

describe('recognising a request for the menu', () => {
  it.each(['menu', 'Menu', 'hi', 'Hello!', 'help', ' start '])('opens on %o', (text) => {
    expect(looksLikeMenuRequest(text)).toBe(true);
  });

  it.each([
    'do you have a menu of prices?',
    'I need help with my Instagram ads',
    'hi, can you quote for a website?',
  ])('leaves a real question alone: %o', (text) => {
    // A loose match would swallow these, and being handed a list instead of
    // an answer reads as a brush-off.
    expect(looksLikeMenuRequest(text)).toBe(false);
  });

  it('is false for nothing at all', () => {
    expect(looksLikeMenuRequest(null)).toBe(false);
  });
});

describe('the scorecard and creative branches', () => {
  it('sends the scorecard link and says the report comes by email', async () => {
    const reply = await routeTap('lead:scorecard', LEAD_CTX);
    if (reply?.kind !== 'text') throw new Error('expected text');
    expect(reply.body).toContain('/scorecard');
    expect(reply.body).toMatch(/inbox|email/i);
    // It must not read as a sales call in disguise.
    expect(reply.body).toMatch(/no call required/i);
  });

  it('points a creative at the application, not at a salesperson', async () => {
    const reply = await routeTap('lead:creative', LEAD_CTX);
    if (reply?.kind !== 'text') throw new Error('expected text');
    expect(reply.body).toContain('/creativeminds');
    expect(reply.kind).not.toBe('handoff');
  });
});

/**
 * The capture is only worth having if something actually asks. It was built
 * first and asked nowhere, so every address would have had to arrive by
 * accident.
 */
describe('asking for an email', () => {
  it('asks when handing over to a person and we have no address', async () => {
    const reply = await routeTap('lead:human', { ...LEAD_CTX, hasEmail: false });
    if (reply?.kind !== 'handoff') throw new Error('expected a handoff');
    expect(reply.body).toMatch(/email/i);
  });

  it('does not ask when we already hold one', async () => {
    const reply = await routeTap('lead:human', { ...LEAD_CTX, hasEmail: true });
    if (reply?.kind !== 'handoff') throw new Error('expected a handoff');
    expect(reply.body).not.toMatch(/send the address/i);
  });

  it.each(['lead:services', 'lead:work', 'lead:creative'])(
    'does not ask mid-browse on %s, where it would read as a toll gate',
    async (node) => {
      const reply = await routeTap(node, { ...LEAD_CTX, hasEmail: false });
      if (!reply || !('body' in reply)) throw new Error('expected a body');
      expect(reply.body).not.toMatch(/send the address/i);
    },
  );
});
