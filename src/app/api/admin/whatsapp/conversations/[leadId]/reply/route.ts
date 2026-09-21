/**
 * A person replying as the business.
 *
 * The only way to answer on this number: once it is registered to the Cloud
 * API it cannot be opened in the WhatsApp or WhatsApp Business app, so without
 * this route nobody can respond at all.
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { canAccessLead } from '@/lib/sales/access';
import { loadLead } from '@/lib/sales/lead-store';
import { sendReplyToLead } from '@/lib/whatsapp/send';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ leadId: string }> };

const MAX_LENGTH = 4096;

/** Why a send was refused, in words a person can act on. */
const REFUSALS: Record<string, string> = {
  no_phone: 'This lead has no phone number.',
  not_configured: 'WhatsApp is not configured on the server.',
  suppressed: 'This person asked us to stop messaging them on WhatsApp.',
  window_closed:
    'More than 24 hours since their last message, so WhatsApp only allows an approved template now.',
  failed: 'WhatsApp refused the message.',
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requirePermission(request, 'sales.write');
  if ('error' in auth) return auth.error;

  const { leadId } = await params;
  const lead = await loadLead(leadId);
  if (!lead) return ApiResponse.notFound('Lead not found');
  if (!canAccessLead(auth.user, lead)) return ApiResponse.error('Forbidden', 403);

  const body: unknown = await request.json().catch(() => null);
  const text =
    typeof body === 'object' && body !== null && 'text' in body && typeof (body as { text: unknown }).text === 'string'
      ? (body as { text: string }).text
      : '';
  if (!text.trim()) return ApiResponse.validationError('Type a message first');
  if (text.length > MAX_LENGTH) return ApiResponse.validationError('That message is too long for WhatsApp');

  const outcome = await sendReplyToLead({
    lead,
    text,
    actor: { id: auth.user.id, name: auth.user.name },
  });

  if (!outcome.sent) {
    const message = REFUSALS[outcome.reason] ?? 'Could not send the message.';
    // 409 for "not right now", so the screen can tell it apart from a failure.
    return ApiResponse.error(outcome.error ? `${message} (${outcome.error})` : message, outcome.reason === 'window_closed' ? 409 : 400);
  }

  return ApiResponse.success({ sent: true });
}
