/**
 * The menu a client gets — someone whose number matches `clients.phone_e164`.
 *
 * A list rather than buttons, because there are four things and Meta allows
 * three buttons. Every branch answers with a headline and a link into the
 * portal; none of them sends a document. See client-data.ts for why.
 *
 * Worth being honest about what identifies them: a number we recorded against
 * the client record, and nothing else. There is no verification step yet, so
 * this is exactly as strong as the email address we already send invoices to
 * — which is the bar it was designed against, not a higher one. Until
 * verification exists, no branch here may grow to reveal more than an invoice
 * email already does.
 */

import { SITE_URL } from '@/lib/site-url';
import type { MenuContext, MenuNode, MenuReply } from './types';
import { nodeId } from './types';
import { contentAwaitingApproval, invoicePosition, money, readableDate } from './client-data';

const id = (name: string) => nodeId('client', name);

export const CLIENT_ROOT = id('root');

function portal(ctx: MenuContext, path = ''): string {
  return `${SITE_URL}/client/${ctx.clientSlug ?? ctx.clientId}${path}`;
}

const root: MenuNode = {
  id: CLIENT_ROOT,
  audience: 'client',
  async render(ctx) {
    const first = ctx.name?.trim().split(' ')[0];
    return {
      kind: 'interactive',
      message: {
        body:
          `${first ? `Hi ${first},` : 'Hi,'} what would you like to check?\n\n` +
          'You can also just type — this thread reaches your account manager.',
        list: {
          label: 'Open menu',
          sections: [
            {
              rows: [
                { id: id('invoices'), title: 'Invoices', description: 'What is outstanding, and when it is due' },
                { id: id('content'), title: 'Content to approve', description: 'Anything waiting on you' },
                { id: id('issue'), title: 'Raise an issue', description: 'Something is wrong and needs fixing' },
                { id: id('human'), title: 'Talk to someone', description: 'Your account manager picks this up' },
              ],
            },
          ],
        },
      },
    };
  },
};

const invoices: MenuNode = {
  id: id('invoices'),
  audience: 'client',
  async render(ctx) {
    const position = await invoicePosition(ctx.clientId!);

    // A number we could not read is not a number we should guess at. Saying
    // "nothing outstanding" when the query failed is the one wrong answer.
    if (!position) {
      return {
        kind: 'handoff',
        reason: 'invoice lookup failed',
        body: 'I could not pull your invoices up just now — someone will check and come back to you here.',
      };
    }

    if (position.openCount === 0) {
      return { kind: 'text', body: `Nothing outstanding — you are all settled.\n\nThe full history is in your portal: ${portal(ctx, '/invoices')}` };
    }

    const lines = [
      position.openCount === 1
        ? `One invoice open, ${money(position.total, position.currency)}.`
        : `${position.openCount} invoices open, ${money(position.total, position.currency)} in total.`,
    ];
    if (position.oldestDue) {
      lines.push(
        position.overdueCount > 0
          ? `The oldest was due ${readableDate(position.oldestDue)}.`
          : `The next is due ${readableDate(position.oldestDue)}.`
      );
    }
    lines.push('', `Numbers, dates and the PDFs are in your portal: ${portal(ctx, '/invoices')}`);

    return { kind: 'text', body: lines.join('\n') };
  },
};

const content: MenuNode = {
  id: id('content'),
  audience: 'client',
  async render(ctx) {
    const waiting = await contentAwaitingApproval(ctx.clientId!);

    if (waiting === null) {
      return {
        kind: 'handoff',
        reason: 'content lookup failed',
        body: 'I could not check that just now — someone will come back to you here.',
      };
    }

    if (waiting === 0) {
      return { kind: 'text', body: `Nothing is waiting on you right now.\n\nThe calendar is here whenever you want a look: ${portal(ctx, '/content')}` };
    }

    return {
      kind: 'text',
      body:
        `${waiting === 1 ? 'One post is' : `${waiting} posts are`} waiting for your approval.\n\n` +
        `You can approve or ask for a change here: ${portal(ctx, '/content')}`,
    };
  },
};

const issue: MenuNode = {
  id: id('issue'),
  audience: 'client',
  async render(ctx) {
    return {
      kind: 'handoff',
      reason: 'raised an issue',
      // Not a ticket yet. Opening one needs a subject and a description, and
      // taking those over chat needs the flow to remember what it asked —
      // state this does not have. Promising a ticket we did not open would
      // be worse than being plain about what happens next.
      body:
        'Tell me what has gone wrong in your next message and I will get it to the right person here.\n\n' +
        `If you would rather it be tracked with a reference, raising it in the portal does that: ${portal(ctx, '/support')}`,
    };
  },
};

const human: MenuNode = {
  id: id('human'),
  audience: 'client',
  async render() {
    return {
      kind: 'handoff',
      reason: 'asked for their account manager',
      body: 'Passing this to your account manager now — they will reply here.',
    };
  },
};

export const CLIENT_NODES: MenuNode[] = [root, invoices, content, issue, human];

export async function renderClientRoot(ctx: MenuContext): Promise<MenuReply> {
  return root.render(ctx);
}
