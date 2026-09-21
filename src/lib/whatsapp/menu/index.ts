/**
 * Routing a tap to the node that answers it.
 *
 * The whole engine is a lookup and an audience check. There is no state
 * machine and nothing is remembered between messages: every node renders from
 * the id that was tapped plus who is asking, which means a menu cannot get
 * stuck half-way through, and a person who wanders off and comes back a week
 * later is not resumed into a conversation they have forgotten.
 */

import { CLIENT_NODES, CLIENT_ROOT, renderClientRoot } from './client';
import { LEAD_NODES, LEAD_ROOT, looksLikeMenuRequest, renderLeadRoot } from './lead';
import type { Audience, MenuContext, MenuNode, MenuReply } from './types';

const NODES: Map<string, MenuNode> = new Map(
  [...LEAD_NODES, ...CLIENT_NODES].map((node) => [node.id, node])
);

export { LEAD_ROOT, CLIENT_ROOT, looksLikeMenuRequest };
export type { Audience, MenuContext, MenuReply };

/**
 * The node a tap leads to, or null if there is no such node for this person.
 *
 * Null is returned rather than an error for the ordinary case of an old menu:
 * someone scrolls up and taps a button we sent last month whose id we have
 * since renamed. That is not a failure, it is a stale tap, and the caller
 * treats it as an ordinary message — a person reads it.
 *
 * The audience check is the one real boundary in this file. A reply id comes
 * back to us via Meta echoing a button *we* sent, so it is not user input in
 * the usual sense — but "not usually forgeable" is not a security model, and
 * the cost of being wrong is showing one person another's invoice position.
 * A client node is unreachable unless this conversation resolved to a client.
 */
export async function routeTap(replyId: string, ctx: MenuContext): Promise<MenuReply | null> {
  const node = NODES.get(replyId);
  if (!node) return null;
  if (node.audience !== ctx.audience) return null;
  return node.render(ctx);
}

/** The top of whichever menu belongs to this person. */
export async function renderRoot(ctx: MenuContext): Promise<MenuReply> {
  return ctx.audience === 'client' ? renderClientRoot(ctx) : renderLeadRoot(ctx);
}

/** Exposed so a test can assert every tappable id resolves to a real node. */
export function allNodes(): MenuNode[] {
  return [...NODES.values()];
}
