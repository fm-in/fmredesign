/**
 * WhatsApp Cloud API webhook — the canonical path.
 *
 * Not under `/sales/`, deliberately. The same number carries academy
 * confirmations, client updates and CreativeMinds applications, and a URL
 * saying "sales" would misdescribe most of what arrives on it. The adapter and
 * the pipeline are shared with the sales routes; only the path and the
 * `webhook_logs` provider differ.
 *
 * `/api/webhooks/sales/whatsapp` still works. Repointing a verified callback
 * URL in Meta costs a re-verification and a window where deliveries are
 * dropped, so the old path stays rather than being cut off.
 *
 * GET answers Meta's `hub.challenge` handshake; POST is signed with the app
 * secret and carries inbound messages and delivery statuses on the same field.
 */

import { NextRequest } from 'next/server';
import { getAdapter } from '@/lib/sales/intake/adapters/registry';
import { handleWebhookGet, handleWebhookPost } from '@/lib/webhooks/pipeline';

export const dynamic = 'force-dynamic';

/*
 * How deliveries on this path are recorded, as distinct from `sales:whatsapp`.
 * Not exported: a Next.js route module may only export its handlers and a
 * fixed set of config values, and anything else fails the production build.
 */
const PROVIDER = 'whatsapp';

export async function GET(request: NextRequest) {
  return handleWebhookGet(request, getAdapter('whatsapp'));
}

export async function POST(request: NextRequest) {
  return handleWebhookPost(request, getAdapter('whatsapp'), PROVIDER);
}
