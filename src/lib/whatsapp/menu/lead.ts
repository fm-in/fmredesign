/**
 * The menu someone gets when they message us and we do not know them.
 *
 * Three buttons, because Meta allows three and a stranger should not be given
 * a decision tree. Every branch is public information — nothing here reads a
 * record or reveals that we hold one. The only branch that costs us anything
 * is the one that asks for a person, and that is the point of the menu: the
 * two questions we answer fifty times a week stop reaching a human at all.
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
        buttons: [
          // Titles are 20 characters or Meta rejects the whole message.
          { id: id('services'), title: 'What we do' },
          { id: id('work'), title: 'See our work' },
          { id: id('human'), title: 'Talk to someone' },
        ],
      },
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

export const LEAD_NODES: MenuNode[] = [root, services, work, human];

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
