/**
 * The shape of a WhatsApp self-service menu.
 *
 * A menu is a set of nodes. Each node knows how to render itself given who is
 * asking, and every tappable option carries the id of the node it leads to —
 * so routing is a lookup, never a match on the label someone tapped. Labels
 * are display copy: they get reworded, shortened to fit Meta's 20 characters,
 * and one day translated. A menu that routed on them would break each time.
 */

import type { InteractiveMessage } from '../client';

/**
 * Who we are talking to, decided by the number they messaged from.
 *
 * `client` means the number matches `clients.phone_e164` — a number *we*
 * recorded against that client, not one they asserted. `lead` is everyone
 * else, including someone whose number we simply have not matched.
 */
export type Audience = 'lead' | 'client';

export interface MenuContext {
  audience: Audience;
  /** Every inbound conversation has a lead row, clients included. */
  leadId: string;
  /** Present only for `client`. */
  clientId?: string;
  clientSlug?: string;
  name: string | null;
  phoneE164: string;
  /**
   * Whether we already hold an email for them.
   *
   * The ask is conditional because asking someone for an address we already
   * have reads as a system that is not paying attention — and because the
   * capture is stateless, the ask can sit wherever it is natural and still
   * work whenever they happen to answer.
   */
  hasEmail: boolean;
}

/**
 * What a node produces.
 *
 * `handoff` is a real answer, not a failure: it says something back *and*
 * puts the conversation in front of a person. Nothing here sends a document
 * — a WhatsApp thread is not an authenticated session, so anything that is
 * not a headline number is a link back to the portal.
 */
export type MenuReply =
  | { kind: 'interactive'; message: InteractiveMessage }
  | { kind: 'text'; body: string }
  | { kind: 'handoff'; body: string; reason: string };

export interface MenuNode {
  /**
   * Namespaced by audience — `lead:root`, `client:invoices`. The prefix is
   * not decoration: the router refuses a node whose audience does not match
   * the caller's, so a tap can never cross from one menu into the other.
   */
  id: string;
  audience: Audience;
  render(ctx: MenuContext): Promise<MenuReply>;
}

/** Typed once here so a node cannot invent an id that nothing routes to. */
export function nodeId(audience: Audience, name: string): string {
  return `${audience}:${name}`;
}
