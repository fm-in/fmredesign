/**
 * Sales webhooks: /api/webhooks/sales/{google|connector|meta|calcom|resend}.
 *
 * Order matters: verify first (unverified requests are logged and never
 * processed), then log with the delivery id (retries are skipped), then hand
 * to the adapter. A rejected payload answers 400 so the platform stops
 * retrying; an unexpected failure answers 500 so it retries.
 *
 * Unverified requests are logged at most 10/min per IP (rateLimit below) so a
 * hammering attacker cannot flood webhook_logs; verified deliveries are never
 * rate-limited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebhookRejection } from '@/lib/sales/errors';
import { getAdapter, isAdapterConfigured } from '@/lib/sales/intake/adapters/registry';
import { parseJson } from '@/lib/sales/intake/adapters/verify';
import { logWebhook, markWebhook, safeHeaders } from '@/lib/sales/intake/webhook-log';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ source: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { source } = await params;
  const adapter = getAdapter(source);
  if (!adapter?.handleGet) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return adapter.handleGet(request);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { source } = await params;
  const adapter = getAdapter(source);
  if (!adapter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isAdapterConfigured(adapter)) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  const provider = `sales:${source}`;
  const rawBody = await request.text();
  const payload = parseJson(rawBody);
  if (payload === undefined) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const headers = safeHeaders(request.headers);
  const loggedPayload = adapter.redact ? adapter.redact(payload) : payload;

  if (!adapter.verify({ request, rawBody })) {
    if (rateLimit(`sales-webhook-invalid:${getClientIp(request)}`, 10)) {
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
  if (log.duplicate && log.processed) return success();

  try {
    await adapter.handle(payload);
    await markWebhook(log.id, { processed: true });
    return success();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await markWebhook(log.id, { processed: false, error: message });
    if (err instanceof WebhookRejection) return NextResponse.json({ error: message }, { status: 400 });
    console.error(`[sales] webhook ${source} failed:`, err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
