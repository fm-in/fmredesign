import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { canAccessLead } from '@/lib/sales/access';
import { recordActivity, stopSequence } from '@/lib/sales/activity';
import { sendSalesEvent } from '@/lib/sales/events';
import { loadLead } from '@/lib/sales/lead-store';
import { getSalesSettings } from '@/lib/sales/settings';
import { isSuppressed } from '@/lib/sales/suppression';
import { firstIssue, sequenceActionSchema } from '@/lib/sales/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, 'sales.write');
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const parsed = sequenceActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiResponse.validationError(firstIssue(parsed.error));

  const lead = await loadLead(id);
  if (!lead || !canAccessLead(auth.user, lead)) return ApiResponse.notFound('Lead not found');

  const actor = { id: auth.user.id, name: auth.user.name };

  if (parsed.data.action === 'stop') {
    const stopped = await stopSequence(id, 'manual', actor);
    return ApiResponse.success({ stopped });
  }

  const { sequenceKey } = parsed.data;

  // Refusals are written for the salesperson reading the panel, not a developer
  // reading a log — each names the specific reason nothing can be sent.
  if (!lead.email) {
    return ApiResponse.validationError("This lead has no email address, so follow-ups can't be sent.");
  }
  if (await isSuppressed({ email: lead.email, phoneE164: lead.phone_e164 })) {
    return ApiResponse.validationError("This email address is on the do-not-contact list, so follow-ups can't be sent.");
  }
  if (lead.consent_basis !== 'inbound_request' && lead.consent_basis !== 'consent') {
    return ApiResponse.validationError("This lead hasn't given consent to be emailed, so follow-ups can't be sent.");
  }
  if (lead.sequence_status !== null) {
    return ApiResponse.validationError('This lead has already had a follow-up sequence — only one ever runs per lead.');
  }
  const settings = await getSalesSettings();
  if (!settings.automationEnabled) {
    return ApiResponse.validationError("Automation is switched off in Settings, so follow-ups can't be sent.");
  }

  await recordActivity({ leadId: id, type: 'sequence_started', actor, metadata: { sequenceKey } });
  await sendSalesEvent({ name: 'sales/sequence.start', data: { leadId: id, sequenceKey } });

  return ApiResponse.success({ started: true, sequenceKey });
}
