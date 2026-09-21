/**
 * The menu someone gets when they message us and we do not know them.
 *
 * A flat list rather than nested buttons. Four distinct people message an
 * agency — a business that might hire us, a creative who wants work from us,
 * someone weighing us up, and someone who just wants a human — and nesting
 * those behind a first choice costs a tap and hides the option that is most
 * worth taking. Everything is one tap away and says what it is.
 *
 * Every branch is public information. Nothing here reads a record or reveals
 * that we hold one; the client menu is the only place that does, and it is
 * unreachable from here.
 *
 * The scorecard sits at the top on purpose. It is the only branch that gives
 * a stranger something rather than showing them something, and the only one
 * that comes back with an email address — without which a lead cannot be
 * followed up at all.
 */

import { SITE_URL } from '@/lib/site-url';
import { DEFAULT_BOOKING_LINK } from '@/lib/sales/links';
import type { MenuContext, MenuNode, MenuReply } from './types';
import { nodeId } from './types';

const id = (name: string) => nodeId('lead', name);

export const LEAD_ROOT = id('root');

function greeting(ctx: MenuContext): string {
  // A name we are not sure of is worse than none: "Hi 919876543210," is how
  // an automated system announces itself. Intake stores the WhatsApp profile
  // name, which is whatever the person typed into their own phone.
  const name = ctx.name?.trim();
  return name && !/^\+?\d+$/.test(name) ? `Hi ${name.split(' ')[0]},` : 'Hi,';
}

const root: MenuNode = {
  id: LEAD_ROOT,
  audience: 'lead',
  async render(ctx) {
    return {
      kind: 'interactive',
      message: {
        body:
          `${greeting(ctx)} thanks for messaging Freaking Minds.\n\n` +
          'Pick whichever is useful, or just type your question — a person reads this thread.',
        list: {
          label: 'Open menu',
          sections: [
            {
              // Row titles are 24 characters and descriptions 72, or Meta
              // rejects the whole message rather than trimming it.
              rows: [
                { id: id('scorecard'), title: 'Free marketing score', description: '11 questions, two minutes, and the one thing to fix first' },
                { id: id('services'), title: 'What we do', description: 'The work itself, and who it is for' },
                { id: id('work'), title: 'See our work', description: 'Recent projects, with numbers where we can publish them' },
                { id: id('creative'), title: 'Join as a creative', description: 'Photographers, editors, designers, writers' },
                { id: id('human'), title: 'Talk to someone', description: 'A person picks this up in this thread' },
              ],
            },
          ],
        },
      },
    };
  },
};

const scorecard: MenuNode = {
  id: id('scorecard'),
  audience: 'lead',
  async render() {
    return {
      kind: 'text',
      body:
        // The six dimensions and the length are taken from the scorecard
        // itself (src/lib/scorecard/questions.ts) and from the copy already
        // on the page. Nothing here should claim more than the tool does.
        'Eleven questions about how you actually run things, and a score out of 100 across ' +
        'six areas: foundation, getting found, content, paid reach, measurement and ' +
        'follow-up.\n\n' +
        `${SITE_URL}/scorecard\n\n` +
        'About two minutes, no sign-up to start, and the full breakdown lands in your inbox. ' +
        'No call required, and nothing to pay.',
    };
  },
};

const creative: MenuNode = {
  id: id('creative'),
  audience: 'lead',
  async render() {
    return {
      kind: 'text',
      body:
        'CreativeMinds is our network of photographers, editors, designers and writers — we ' +
        'bring them onto client work, and share the pool with other businesses who need them.\n\n' +
        `Two short steps, and we read every portfolio ourselves: ${SITE_URL}/creativeminds\n\n` +
        'We come back within 48 hours either way.',
    };
  },
};

const services: MenuNode = {
  id: id('services'),
  audience: 'lead',
  async render() {
    return {
      kind: 'text',
      body:
        'We run the growth side of a brand end to end: performance marketing, ' +
        'social and content, websites, and the creative to fill them.\n\n' +
        `The full list, with what each one actually involves: ${SITE_URL}/services\n\n` +
        'If you tell me what you are trying to fix, I can point you at the part that matters.',
    };
  },
};

const work: MenuNode = {
  id: id('work'),
  audience: 'lead',
  async render() {
    return {
      kind: 'text',
      body:
        `Recent work, with the numbers where we are allowed to publish them: ${SITE_URL}/work\n\n` +
        'Happy to send something closer to your sector if you say what you do.',
    };
  },
};

const human: MenuNode = {
  id: id('human'),
  audience: 'lead',
  async render() {
    return {
      kind: 'handoff',
      reason: 'asked to speak to someone',
      body:
        'Of course — someone will pick this up here shortly.\n\n' +
        'If you would rather book a time and skip the back and forth: ' +
        `https://cal.com/${DEFAULT_BOOKING_LINK}`,
    };
  },
};

export const LEAD_NODES: MenuNode[] = [root, scorecard, services, work, creative, human];

/**
 * Words that mean "show me the menu".
 *
 * Deliberately short and exact. A loose match would swallow real questions —
 * someone typing "do you have a menu of prices?" wants a person, not a list.
 */
const MENU_WORDS = new Set(['menu', 'options', 'help', 'hi', 'hello', 'hey', 'start']);

export function looksLikeMenuRequest(text: string | null): boolean {
  if (!text) return false;
  return MENU_WORDS.has(text.trim().toLowerCase().replace(/[!.?]+$/, ''));
}

export async function renderLeadRoot(ctx: MenuContext): Promise<MenuReply> {
  return root.render(ctx);
}
