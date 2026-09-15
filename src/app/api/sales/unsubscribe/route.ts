/**
 * Unsubscribe from sales email. Serves both the confirmation page (JSON body)
 * and RFC 8058 one-click unsubscribe from mail clients (token in the URL).
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { getClientIp, rateLimit } from '@/lib/rate-limiter';
import { unsubscribeEmail } from '@/lib/sales/unsubscribe';
import { isUnsubscribeConfigured, verifyUnsubscribeToken } from '@/lib/sales/unsubscribe-token';

export const dynamic = 'force-dynamic';

async function tokenFrom(request: NextRequest): Promise<string | null> {
  const fromUrl = request.nextUrl.searchParams.get('t');
  if (fromUrl) return fromUrl;
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return null;
  const body: unknown = await request.json().catch(() => null);
  return typeof body === 'object' && body !== null && 't' in body && typeof body.t === 'string' ? body.t : null;
}

export async function POST(request: NextRequest) {
  if (!rateLimit(getClientIp(request), 10)) return ApiResponse.error('Too many requests', 429);
  if (!isUnsubscribeConfigured()) return ApiResponse.error('Unsubscribe is not available right now', 503);

  const token = await tokenFrom(request);
  const email = token ? verifyUnsubscribeToken(token) : null;
  if (!email) return ApiResponse.validationError('This unsubscribe link is not valid');

  await unsubscribeEmail(email, 'link');
  return ApiResponse.success({ unsubscribed: true });
}
