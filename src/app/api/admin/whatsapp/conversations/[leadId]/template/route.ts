/**
 * Sending an approved template from the inbox.
 *
 * The way to restart a conversation once the 24-hour window has closed: free
 * text is refused by Meta from that point, and a template is the only thing it
 * will accept.
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { canAccessLead } from '@/lib/sales/access';
import { loadLead } from '@/lib/sales/lead-store';
import { sendTemplateToLead } from '@/lib/whatsapp/send';
import { buildTemplateSend, findTemplate } from '@/lib/whatsapp/templates';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ leadId: string }> };

const REFUSALS: Record<string, string> = {
  no_phone: 'This lead has no phone number.',
  not_configured: 'WhatsApp is not configured on the server.',
  suppressed: 'This person asked us to stop messaging them on WhatsApp.',
  no_consent: 'We have no consent basis recorded for this lead.',
  automation_off: 'Sales automation is switched off in Settings.',
  outside_hours: 'Outside sending hours.',
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
  const name = typeof body === 'object' && body !== null && 'name' in body ? String((body as { name: unknown }).name) : '';
  if (!name) return ApiResponse.validationError('Pick a template');

  const template = await findTemplate(name);
  if (!template) return ApiResponse.validationError('That template is not approved, or no longer exists');

  const outcome = await sendTemplateToLead({
    lead,
    template: buildTemplateSend(template, lead, auth.user.name),
    category: template.category === 'MARKETING' ? 'marketing' : 'utility',
    // A person chose to send this, to someone who wrote to us first.
    respondingToAction: true,
  });

  if (!outcome.sent) {
    const message = REFUSALS[outcome.reason] ?? 'Could not send the template.';
    return ApiResponse.error(outcome.error ? `${message} (${outcome.error})` : message, 400);
  }
  return ApiResponse.success({ sent: true });
}
