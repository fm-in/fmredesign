/**
 * The signed-webhook pipeline, shared by every inbound webhook route.
 *
 * It was inline in `/api/webhooks/sales/[source]` until WhatsApp needed the
 * same treatment under a path that does not say "sales" — WhatsApp carries
 * academy confirmations and client updates too, and a URL that claims
 * otherwise misleads whoever reads it next. Rather than copy sixty lines and
 * let the two drift, both routes call this.
 *
 * Order matters: verify first, so an unverified request is logged and never
 * processed; then log with the delivery id, so a retry is recognised; then
 * hand to the adapter. A rejected payload answers 400 so the platform stops
 * retrying; an unexpected failure answers 500 so that it does.
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';
import { WebhookRejection } from '@/lib/sales/errors';
import type { SalesWebhookAdapter } from '@/lib/sales/intake/adapters/types';
import { isAdapterConfigured } from '@/lib/sales/intake/adapters/registry';
import { parseJson } from '@/lib/sales/intake/adapters/verify';
import { logWebhook, markWebhook, safeHeaders } from '@/lib/sales/intake/webhook-log';

/** Unverified requests are capped per IP so an attacker cannot flood `webhook_logs`. */
const INVALID_SIGNATURE_LIMIT = 10;

/** Platform verification handshakes, e.g. Meta's `hub.challenge`. */
export function handleWebhookGet(request: NextRequest, adapter: SalesWebhookAdapter | null): Response {
  if (!adapter?.handleGet) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return adapter.handleGet(request);
}

export async function handleWebhookPost(
  request: NextRequest,
  adapter: SalesWebhookAdapter | null,
  /** How this source is recorded in `webhook_logs`. */
  provider: string
): Promise<Response> {
  if (!adapter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isAdapterConfigured(adapter)) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  // Read the body as text, not JSON: the signature is over the exact bytes,
  // and re-serialising a parsed object would not reproduce them.
  const rawBody = await request.text();
  const payload = parseJson(rawBody);
  if (payload === undefined) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const headers = safeHeaders(request.headers);
  const loggedPayload = adapter.redact ? adapter.redact(payload) : payload;

  if (!adapter.verify({ request, rawBody })) {
    if (rateLimit(`webhook-invalid:${getClientIp(request)}`, INVALID_SIGNATURE_LIMIT)) {
      await logWebhook({
        provider,
        eventType: null,
        payload: loggedPayload,
        headers,
        signatureValid: false,
        externalId: null,
        error: 'invalid signature',
      });
    }
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const { externalId, eventType } = adapter.describe(payload);
  const log = await logWebhook({ provider, eventType, payload: loggedPayload, headers, signatureValid: true, externalId });
  const success = () => NextResponse.json(adapter.successBody ?? { received: true });
  // Already handled on an earlier delivery of the same event.
  if (log.duplicate && log.processed) return success();

  try {
    await adapter.handle(payload);
    await markWebhook(log.id, { processed: true });
    return success();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await markWebhook(log.id, { processed: false, error: message });
    if (err instanceof WebhookRejection) return NextResponse.json({ error: message }, { status: 400 });
    console.error(`[webhook] ${provider} failed:`, err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
