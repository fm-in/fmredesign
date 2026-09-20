/**
 * Sales webhooks: /api/webhooks/sales/{google|connector|meta|calcom|resend}.
 *
 * The pipeline itself lives in `src/lib/webhooks/pipeline.ts`, shared with
 * `/api/webhooks/whatsapp`.
 *
 * `whatsapp` still resolves here, because this route existed first and a URL
 * already given to a platform should keep working. The canonical WhatsApp path
 * is `/api/webhooks/whatsapp`, which logs under a provider that does not claim
 * the messages are all about sales.
 */

import { NextRequest } from 'next/server';
import { getAdapter } from '@/lib/sales/intake/adapters/registry';
import { handleWebhookGet, handleWebhookPost } from '@/lib/webhooks/pipeline';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ source: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { source } = await params;
  return handleWebhookGet(request, getAdapter(source));
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { source } = await params;
  return handleWebhookPost(request, getAdapter(source), `sales:${source}`);
}
